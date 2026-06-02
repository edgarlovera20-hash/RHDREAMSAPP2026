import { Router } from "express";
import { handleGroqChat, groqHealthCheck } from "../controllers/groq.controller";
import { authMiddleware } from "../middleware/auth";
import { geminiLimiter } from "../middleware/rateLimiter";
import { logger } from "../utils/logger";

export const createGroqRoutes = (): Router => {
  const router = Router();

  router.get("/health", groqHealthCheck);

  router.post(
    "/chat",
    authMiddleware,
    geminiLimiter,
    async (req, res) => {
      logger.debug("POST /api/groq/chat", {
        userId: (req as any).user?.userId,
        model: req.body.model,
      });
      handleGroqChat(req, res);
    }
  );

  return router;
};
