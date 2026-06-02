#!/usr/bin/env node

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=");
  const value = inlineValue ?? process.argv[index + 1];
  args.set(key, value);
  if (inlineValue === undefined) index += 1;
}

const baseUrl = String(args.get("base") || process.env.SIM_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const totalMessages = Number(args.get("messages") || process.env.SIM_MESSAGES || 200);
const messagesPerHour = Number(args.get("per-hour") || process.env.SIM_MESSAGES_PER_HOUR || 200);
const concurrency = Number(args.get("concurrency") || process.env.SIM_CONCURRENCY || 8);
const timeoutMs = Number(args.get("timeout-ms") || process.env.SIM_TIMEOUT_MS || 15000);
const sharedIp = args.has("shared-ip");
const noAi = args.has("no-ai");
const apiPrefix = /\/(api|rhdreams2026-api|rh-api)$/.test(baseUrl) ? "" : "/api";
const endpoint = noAi ? `${apiPrefix}/gemini/health` : `${apiPrefix}/gemini/agent/reply`;

const samples = [
  "hola inf",
  "informacion",
  "quiero trabajar",
  "hola buenas tardes",
  "me interesa una vacante",
  "quiero empleo",
  "ayudante general",
  "asesor comercial",
  "tengo 17 anos",
  "vivo en iztapalapa",
  "puedo manana",
  "no puedo ir, quiero reagendar",
  "que documentos necesito",
  "cual es el sueldo",
  "horarios disponibles",
];

const results = [];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function virtualIp(index) {
  if (sharedIp) return "10.250.0.10";
  return `10.250.${Math.floor(index / 240)}.${(index % 240) + 10}`;
}

function payloadFor(index) {
  const text = samples[index % samples.length];
  if (noAi) return undefined;
  return {
    agentName: "Agente Principal 1",
    systemPrompt: [
      "Eres reclutador RH de Heavenly Dreams.",
      "Inicia conversaciones desde cero.",
      "Pregunta una cosa a la vez.",
      "Si el candidato tiene menos de 16 anos, rechaza con respeto.",
      "Si tiene 16 o 17, pide permiso firmado del tutor.",
    ].join("\n"),
    conversationHistory: [],
    userPrompt: text,
  };
}

async function timedRequest(index) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const method = noAi ? "GET" : "POST";

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": `rhdreams-message-load/${index}`,
        "X-Forwarded-For": virtualIp(index),
        "X-Simulation-Message": String(index),
      },
      body: noAi ? undefined : JSON.stringify(payloadFor(index)),
    });
    const body = await response.text();
    results.push({
      index,
      ok: response.ok,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      bodyPreview: body.replace(/\s+/g, " ").slice(0, 160),
    });
  } catch (error) {
    results.push({
      index,
      ok: false,
      status: "ERR",
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runPool() {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, totalMessages) }, async () => {
    while (next < totalMessages) {
      const index = next;
      next += 1;
      await timedRequest(index);
    }
  });
  await Promise.all(workers);
}

const theoreticalIntervalSeconds = 3600 / messagesPerHour;
const startedAt = performance.now();
console.log(
  `Simulating ${totalMessages} messages against ${baseUrl}${endpoint} ` +
    `(target ${messagesPerHour}/hour = 1 every ${theoreticalIntervalSeconds.toFixed(1)}s, ` +
    `accelerated concurrency ${concurrency}, ${sharedIp ? "shared IP" : "virtual IPs"})`
);

await runPool();

const durationMs = Math.round(performance.now() - startedAt);
const latencies = results.map((item) => item.durationMs);
const failures = results.filter((item) => !item.ok);
const statusCounts = results.reduce((acc, item) => {
  const key = String(item.status);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const summary = {
  target: `${baseUrl}${endpoint}`,
  mode: noAi ? "health-only" : "agent-reply",
  ipMode: sharedIp ? "shared-ip" : "virtual-ips",
  totalMessages,
  targetMessagesPerHour: messagesPerHour,
  theoreticalIntervalSeconds,
  concurrency,
  durationMs,
  acceleratedRequestsPerSecond: Number((results.length / (durationMs / 1000)).toFixed(2)),
  failedMessages: failures.length,
  failureRate: Number((failures.length / Math.max(results.length, 1)).toFixed(4)),
  latencyMs: {
    min: Math.min(...latencies),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: Math.max(...latencies),
  },
  statusCounts,
  slowest: [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10),
  failures: failures.slice(0, 20),
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
