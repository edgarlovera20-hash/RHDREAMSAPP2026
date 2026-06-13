import { Router } from "express";
import { z, ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import { runRhAgent } from "../agents/rh-agent";
import { logger } from "../utils/logger";

const inputSchema = z.object({
  type: z.enum(["candidate_summary", "interview_prep", "vacancy_analysis"]),
  candidateId: z.string().optional(),
  vacancyId: z.string().optional(),
});

export const createAgentRoutes = (): Router => {
  const router = Router();

  router.post("/run", authMiddleware, (req, res) => {
    try {
      const input = inputSchema.parse(req.body);
      const actorId = req.user?.userId ?? "system";
      const result = runRhAgent(input, actorId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, error: "Invalid request payload", code: 400, details: err.issues });
      }
      logger.error("RH_AGENT run error", err);
      return res.status(400).json({ success: false, error: err.message ?? "Agent error", code: 400 });
    }
  });

  return router;
};
