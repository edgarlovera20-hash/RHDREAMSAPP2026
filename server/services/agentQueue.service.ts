import "dotenv/config";
import { Job, Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";
import { AgentReplyRequest, GeminiResponse } from "../types";
import { logger } from "../utils/logger";
import { getGeminiService } from "./gemini.service";

type QueueJob<T> = {
  id: string;
  name: string;
  createdAt: number;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type RecentJob = {
  id: string;
  name: string;
  status: "ok" | "error";
  waitMs: number;
  runMs: number;
  finishedAt: number;
};

type AgentReplyJobData = AgentReplyRequest & {
  requestedAt: number;
};

const queueName = process.env.AI_QUEUE_NAME || "rhdreams-agent-replies";
const redisUrl = process.env.REDIS_URL || "";
const useRedis = Boolean(redisUrl) && process.env.AI_QUEUE_DRIVER !== "memory";
const concurrency = Math.max(1, Number(process.env.AI_QUEUE_CONCURRENCY || 4));
const maxQueueSize = Math.max(concurrency, Number(process.env.AI_QUEUE_MAX_SIZE || 500));
const recent: RecentJob[] = [];

let memoryActive = 0;
let memoryCompleted = 0;
let memoryFailed = 0;
let memoryRejected = 0;
const memoryQueue: QueueJob<any>[] = [];

let redisQueue: Queue<any, GeminiResponse> | null = null;
let redisWorker: Worker<AgentReplyJobData, GeminiResponse> | null = null;
let redisEvents: QueueEvents | null = null;
let redisReady = false;
let redisLastError: string | null = null;

function remember(item: RecentJob) {
  recent.unshift(item);
  recent.splice(50);
}

function createRedisConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

function ensureRedisQueue() {
  if (!useRedis || redisQueue) return;

  const queueConnection = createRedisConnection();
  const workerConnection = createRedisConnection();
  const eventsConnection = createRedisConnection();

  for (const connection of [queueConnection, workerConnection, eventsConnection]) {
    connection.on("ready", () => {
      redisReady = true;
      redisLastError = null;
    });
    connection.on("error", (error) => {
      redisReady = false;
      redisLastError = error.message;
      logger.error("Redis queue connection error", error);
    });
  }

  redisQueue = new Queue<AgentReplyJobData, GeminiResponse>(queueName, {
    connection: queueConnection as any,
    defaultJobOptions: {
      attempts: Number(process.env.AI_QUEUE_ATTEMPTS || 3),
      backoff: {
        type: "exponential",
        delay: Number(process.env.AI_QUEUE_BACKOFF_MS || 10000),
      },
      removeOnComplete: {
        age: Number(process.env.AI_QUEUE_REMOVE_COMPLETE_SECONDS || 3600),
        count: Number(process.env.AI_QUEUE_REMOVE_COMPLETE_COUNT || 500),
      },
      removeOnFail: {
        age: Number(process.env.AI_QUEUE_REMOVE_FAIL_SECONDS || 86400),
        count: Number(process.env.AI_QUEUE_REMOVE_FAIL_COUNT || 1000),
      },
    },
  });

  redisEvents = new QueueEvents(queueName, { connection: eventsConnection as any });
  redisWorker = new Worker<AgentReplyJobData, GeminiResponse>(
    queueName,
    async (job: Job<AgentReplyJobData>) => {
      const startedAt = Date.now();
      const geminiService = getGeminiService();
      const result = await geminiService.generateAgentResponse(
        job.data.agentName,
        job.data.systemPrompt,
        job.data.conversationHistory,
        job.data.userPrompt
      );
      remember({
        id: String(job.id),
        name: job.name,
        status: "ok",
        waitMs: startedAt - job.data.requestedAt,
        runMs: Date.now() - startedAt,
        finishedAt: Date.now(),
      });
      return result;
    },
    {
      connection: workerConnection as any,
      concurrency,
    }
  );

  redisWorker.on("failed", (job, error) => {
    remember({
      id: String(job?.id || "unknown"),
      name: job?.name || "agent-reply",
      status: "error",
      waitMs: job?.data?.requestedAt ? Date.now() - job.data.requestedAt : 0,
      runMs: 0,
      finishedAt: Date.now(),
    });
    logger.error("BullMQ agent job failed", error);
  });

  logger.info("BullMQ agent queue initialized", {
    queueName,
    redisUrl: redisUrl.replace(/:\/\/.*@/, "://***@"),
    concurrency,
    maxQueueSize,
  });
}

function drainMemoryQueue() {
  while (memoryActive < concurrency && memoryQueue.length > 0) {
    const job = memoryQueue.shift()!;
    memoryActive += 1;
    const startedAt = Date.now();

    job
      .run()
      .then((result) => {
        memoryCompleted += 1;
        remember({
          id: job.id,
          name: job.name,
          status: "ok",
          waitMs: startedAt - job.createdAt,
          runMs: Date.now() - startedAt,
          finishedAt: Date.now(),
        });
        job.resolve(result);
      })
      .catch((error) => {
        memoryFailed += 1;
        remember({
          id: job.id,
          name: job.name,
          status: "error",
          waitMs: startedAt - job.createdAt,
          runMs: Date.now() - startedAt,
          finishedAt: Date.now(),
        });
        logger.error("Memory AI queue job failed", error);
        job.reject(error);
      })
      .finally(() => {
        memoryActive -= 1;
        drainMemoryQueue();
      });
  }
}

function enqueueMemoryJob<T>(name: string, run: () => Promise<T>): Promise<T> {
  if (memoryQueue.length >= maxQueueSize) {
    memoryRejected += 1;
    return Promise.reject(new Error("La cola de IA esta llena. Intenta de nuevo en unos segundos."));
  }

  const id = `aiq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    memoryQueue.push({
      id,
      name,
      createdAt: Date.now(),
      run,
      resolve,
      reject,
    });
    drainMemoryQueue();
  });
}

export async function enqueueAgentReplyJob(data: AgentReplyRequest): Promise<GeminiResponse> {
  if (useRedis) {
    ensureRedisQueue();
    if (!redisQueue || !redisEvents) {
      throw new Error("La cola Redis de IA no esta disponible.");
    }

    const counts = await redisQueue.getJobCounts("waiting", "delayed", "prioritized");
    const queued = (counts.waiting || 0) + (counts.delayed || 0) + (counts.prioritized || 0);
    if (queued >= maxQueueSize) {
      throw new Error("La cola de IA esta llena. Intenta de nuevo en unos segundos.");
    }

    const job = await redisQueue.add("agent-reply", {
      ...data,
      requestedAt: Date.now(),
    });

    return job.waitUntilFinished(redisEvents, Number(process.env.AI_QUEUE_WAIT_TIMEOUT_MS || 30000)) as Promise<GeminiResponse>;
  }

  return enqueueMemoryJob(data.agentName, () =>
    getGeminiService().generateAgentResponse(
      data.agentName,
      data.systemPrompt,
      data.conversationHistory,
      data.userPrompt
    )
  );
}

export function enqueueAgentJob<T>(name: string, run: () => Promise<T>): Promise<T> {
  return enqueueMemoryJob(name, run);
}

export async function getAgentQueueStats() {
  if (useRedis) {
    ensureRedisQueue();
    const counts = redisQueue
      ? await redisQueue.getJobCounts("active", "waiting", "delayed", "failed", "completed", "prioritized")
      : {};
    return {
      driver: "redis-bullmq",
      redisReady,
      redisLastError,
      queueName,
      active: counts.active || 0,
      queued: (counts.waiting || 0) + (counts.delayed || 0) + (counts.prioritized || 0),
      concurrency,
      maxQueueSize,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      rejected: 0,
      recent,
    };
  }

  return {
    driver: "memory",
    redisReady: false,
    redisLastError: redisUrl ? "Redis no inicializado" : "REDIS_URL no configurado",
    queueName,
    active: memoryActive,
    queued: memoryQueue.length,
    concurrency,
    maxQueueSize,
    completed: memoryCompleted,
    failed: memoryFailed,
    rejected: memoryRejected,
    recent,
  };
}
