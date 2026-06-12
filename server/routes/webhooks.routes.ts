import { Router } from "express";
import { z, ZodError } from "zod";
import { logger } from "../utils/logger";

const router = Router();

function requireN8nSecret(req: any, res: any, next: any) {
  const secret = process.env.N8N_WEBHOOK_SECRET ?? "dev-n8n-secret";
  if (req.headers["x-n8n-secret"] !== secret) {
    logger.warn("n8n webhook unauthorized attempt", { ip: req.ip, path: req.path });
    return res.status(401).json({ success: false, error: "Unauthorized", code: 401 });
  }
  next();
}

const webhookSchema = z.object({
  correlationId: z.string(),
  workflowId: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const WORKFLOWS: Record<string, { humanReviewRequired: boolean }> = {
  RH_CANDIDATE_FOLLOWUP_DRAFT: { humanReviewRequired: true },
};

export const createWebhooksRoutes = (): Router => {
  router.post("/", requireN8nSecret, (req, res) => {
    try {
      const { correlationId, workflowId, payload } = webhookSchema.parse(req.body);
      const workflow = WORKFLOWS[workflowId];
      if (!workflow) {
        return res.status(400).json({ success: false, error: `Unknown workflow: ${workflowId}`, code: 400 });
      }

      logger.info("[AUDIT STUB] n8n webhook received", {
        workflowId,
        correlationId,
        platform: "HD-RH",
        actorType: "n8n_workflow",
      });

      if (workflow.humanReviewRequired) {
        logger.info("[HUMAN REVIEW] workflow queued for human review", { workflowId, correlationId });
        return res.json({ success: true, ok: false, status: "queued_for_review", correlationId });
      }

      return res.json({ success: true, ok: true, correlationId });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: "Invalid request payload", code: 400, details: err.issues });
      }
      logger.error("n8n webhook handler error", err);
      return res.status(400).json({ success: false, error: err.message ?? "Invalid request", code: 400 });
    }
  });

  return router;
};
