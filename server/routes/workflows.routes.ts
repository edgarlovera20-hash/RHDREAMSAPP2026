import { Router } from "express";
import { z, ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../utils/logger";
import {
  executeWorkflow,
  listWorkflowRuns,
  getWorkflowRun,
  WorkflowStep,
} from "../services/workflowExecution.service";

const WorkflowStartSchema = z.object({
  workflowId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  trigger: z.record(z.string(), z.any()).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  steps: z.array(z.record(z.string(), z.any())).optional(),
}).passthrough();

export const createWorkflowRoutes = (): Router => {
  const router = Router();

  // POST /start — fire and forget workflow execution
  router.post("/start", authMiddleware, async (req, res) => {
    try {
      const payload = WorkflowStartSchema.parse(req.body);
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const workflowId = payload.workflowId ?? "unknown";
      const companyId = req.user?.companyId ?? "default";
      const steps = (payload.steps ?? []) as WorkflowStep[];

      logger.info("Workflow run accepted", {
        runId,
        workflowId,
        userId: req.user?.userId,
        steps: steps.length,
      });

      // Fire and forget — do not await
      executeWorkflow(runId, workflowId, steps, companyId).catch((err) => {
        logger.error("Workflow execution error (background)", { runId, err });
      });

      logger.warn("Workflow execution not yet implemented — run queued but will not execute", { runId });

      res.json({
        success: true,
        data: {
          runId,
          status: "running",
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: "Payload de flujo invalido",
          code: 400,
          details: error.issues,
        });
      }

      logger.error("Workflow start failed", error);
      res.status(500).json({
        success: false,
        error: "No se pudo iniciar el flujo.",
        code: 500,
      });
    }
  });

  // GET /runs — list all workflow runs
  router.get("/runs", authMiddleware, async (_req, res) => {
    try {
      const runs = await listWorkflowRuns();
      res.json({ success: true, data: runs });
    } catch (error) {
      logger.error("Failed to list workflow runs", error);
      res.status(500).json({ success: false, error: "No se pudieron obtener los flujos.", code: 500 });
    }
  });

  // GET /runs/:runId — get specific run status
  router.get("/runs/:runId", authMiddleware, async (req, res) => {
    try {
      const run = await getWorkflowRun(req.params.runId);
      if (!run) {
        return res.status(404).json({ success: false, error: "Run no encontrado.", code: 404 });
      }
      res.json({ success: true, data: run });
    } catch (error) {
      logger.error("Failed to get workflow run", error);
      res.status(500).json({ success: false, error: "No se pudo obtener el run.", code: 500 });
    }
  });

  return router;
};
