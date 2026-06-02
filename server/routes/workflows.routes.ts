import { Router } from "express";
import { z, ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../utils/logger";

const WorkflowStartSchema = z.object({
  workflowId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  trigger: z.record(z.string(), z.any()).optional(),
  variables: z.record(z.string(), z.any()).optional(),
  steps: z.array(z.record(z.string(), z.any())).optional(),
}).passthrough();

export const createWorkflowRoutes = (): Router => {
  const router = Router();

  router.post("/start", authMiddleware, async (req, res) => {
    try {
      const payload = WorkflowStartSchema.parse(req.body);
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      logger.info("Workflow run accepted", {
        runId,
        workflowId: payload.workflowId,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        data: {
          runId,
          status: "queued",
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

  return router;
};
