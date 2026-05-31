import { Router } from "express";
import {
  handleOpenRouterChat,
  openRouterHealthCheck,
} from "../controllers/openrouter.controller";
import { optionalAuthMiddleware } from "../middleware/auth";
import { geminiLimiter } from "../middleware/rateLimiter";
import { logger } from "../utils/logger";

export const createOpenRouterRoutes = (): Router => {
  const router = Router();

  router.get("/health", openRouterHealthCheck);

  router.post(
    "/chat",
    optionalAuthMiddleware,
    geminiLimiter,
    async (req, res) => {
      logger.debug("POST /api/openrouter/chat", {
        userId: (req as any).user?.userId,
        model: req.body.model,
      });
      handleOpenRouterChat(req, res);
    }
  );

  return router;
};
