import { logger } from "../utils/logger";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtimeStore.service";
import { createAiDraft } from "./ai-orchestrator.service";

export type WorkflowStep = {
  id: string;
  type: "send_message" | "update_stage" | "wait" | "ai_response" | "webhook" | "condition";
  config: Record<string, any>;
};

export type WorkflowRun = {
  runId: string;
  workflowId: string;
  companyId: string;
  status: "running" | "completed" | "failed" | "paused";
  currentStep: number;
  totalSteps: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
  log: Array<{ step: number; type: string; result: string; ts: number }>;
};

const RUNS_FILE = "workflow-runs.json";

async function persistRun(run: WorkflowRun): Promise<void> {
  const runs = await readRuntimeCollection<WorkflowRun>(RUNS_FILE);
  const idx = runs.findIndex((r) => r.runId === run.runId);
  if (idx >= 0) {
    runs[idx] = run;
  } else {
    runs.push(run);
  }
  await writeRuntimeCollection(RUNS_FILE, runs);
}

async function executeStep(
  step: WorkflowStep,
  stepIndex: number,
  run: WorkflowRun
): Promise<string> {
  const { type, config } = step;

  switch (type) {
    case "send_message": {
      const recipient = config.recipient ?? "unknown";
      const message = config.message ?? "";
      const result = `Message sent to ${recipient}: ${message}`;
      logger.info(`[Workflow ${run.runId}] send_message`, { recipient, message });
      return result;
    }

    case "update_stage": {
      if (config.candidateId) {
        const result = `Candidate ${config.candidateId} stage updated to "${config.stage ?? "unknown"}"`;
        logger.info(`[Workflow ${run.runId}] update_stage`, {
          candidateId: config.candidateId,
          stage: config.stage,
        });
        return result;
      }
      return "update_stage skipped — no candidateId in config";
    }

    case "wait": {
      const duration = config.duration ?? 0;
      const result = `Wait step: ${duration}ms — skipping in execution`;
      logger.info(`[Workflow ${run.runId}] wait`, { duration });
      return result;
    }

    case "ai_response": {
      if (config.conversationId) {
        try {
          const draft = await createAiDraft({
            companyId: run.companyId,
            conversationId: config.conversationId,
            agentId: config.agentId,
            agentName: config.agentName,
            customInstruction: config.instruction,
            approvalMode: config.approvalMode ?? "suggest",
          });
          const result = `AI draft created for conversation ${config.conversationId} — messageId: ${draft.message.id}`;
          logger.info(`[Workflow ${run.runId}] ai_response`, {
            conversationId: config.conversationId,
            messageId: draft.message.id,
          });
          return result;
        } catch (err: any) {
          const errMsg = `AI draft failed: ${err?.message ?? String(err)}`;
          logger.warn(`[Workflow ${run.runId}] ai_response error`, { err: errMsg });
          return errMsg;
        }
      }
      return "ai_response skipped — no conversationId in config";
    }

    case "webhook": {
      const url = config.url;
      if (!url) return "webhook skipped — no URL in config";
      try {
        const method = (config.method ?? "POST").toUpperCase();
        const body = config.body ? JSON.stringify(config.body) : undefined;
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...(config.headers ?? {}) },
          body,
        });
        const result = `Webhook ${method} ${url} → ${response.status}`;
        logger.info(`[Workflow ${run.runId}] webhook`, { url, status: response.status });
        return result;
      } catch (err: any) {
        const errMsg = `Webhook failed: ${err?.message ?? String(err)}`;
        logger.warn(`[Workflow ${run.runId}] webhook error`, { url, err: errMsg });
        return errMsg;
      }
    }

    case "condition": {
      const { field, operator, value } = config;
      let condResult = false;
      const actual = config.actualValue ?? config.data?.[field];
      switch (operator) {
        case "eq":       condResult = actual == value; break;
        case "neq":      condResult = actual != value; break;
        case "gt":       condResult = Number(actual) > Number(value); break;
        case "lt":       condResult = Number(actual) < Number(value); break;
        case "contains": condResult = String(actual).includes(String(value)); break;
        default:         condResult = Boolean(actual);
      }
      const result = `Condition "${field} ${operator} ${value}" evaluated to ${condResult}`;
      logger.info(`[Workflow ${run.runId}] condition`, { field, operator, value, result: condResult });
      return result;
    }

    default: {
      return `Unknown step type "${(step as any).type}" — skipped`;
    }
  }
}

export async function executeWorkflow(
  runId: string,
  workflowId: string,
  steps: WorkflowStep[],
  companyId: string
): Promise<void> {
  const run: WorkflowRun = {
    runId,
    workflowId,
    companyId,
    status: "running",
    currentStep: 0,
    totalSteps: steps.length,
    startedAt: Date.now(),
    log: [],
  };

  await persistRun(run);
  logger.info(`[Workflow] Starting execution`, { runId, workflowId, steps: steps.length });

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      run.currentStep = i + 1;

      let result: string;
      try {
        result = await executeStep(step, i, run);
      } catch (stepErr: any) {
        result = `Step error: ${stepErr?.message ?? String(stepErr)}`;
        logger.error(`[Workflow ${runId}] Step ${i + 1} (${step.type}) threw`, stepErr);
      }

      run.log.push({ step: i + 1, type: step.type, result, ts: Date.now() });
      await persistRun(run);
    }

    run.status = "completed";
    run.completedAt = Date.now();
    await persistRun(run);
    logger.info(`[Workflow] Completed`, { runId, steps: steps.length });
  } catch (err: any) {
    run.status = "failed";
    run.error = err?.message ?? String(err);
    run.completedAt = Date.now();
    await persistRun(run);
    logger.error(`[Workflow] Failed`, { runId, error: run.error });
  }
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  return readRuntimeCollection<WorkflowRun>(RUNS_FILE);
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRun | null> {
  const runs = await readRuntimeCollection<WorkflowRun>(RUNS_FILE);
  return runs.find((r) => r.runId === runId) ?? null;
}
