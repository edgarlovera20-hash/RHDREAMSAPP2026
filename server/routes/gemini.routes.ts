import { Router } from "express";
import {
  handleCandidateReply,
  handleAgentReply,
  handleAudioTranscription,
  healthCheck,
  queueHealthCheck,
} from "../controllers/gemini.controller";
import {
  authMiddleware,
} from "../middleware/auth";
import { geminiLimiter } from "../middleware/rateLimiter";
import { logger } from "../utils/logger";

export const createGeminiRoutes = (): Router => {
  const router = Router();

  // Health check - no auth required
  router.get("/health", healthCheck);
  router.get("/agent/queue", authMiddleware, queueHealthCheck);

  /**
   * POST /api/gemini/reply
   * Generate candidate recruitment response
   * 
   * Auth: Optional (for tracking and analytics)
   * Rate Limit: 30 requests per 15 minutes
   * 
   * Request body:
   * {
   *   candidate?: { name, role, location, experience?, salaryDemand?, notes? }
   *   agentPrompt?: string
   *   history?: Array<{ sender, body?, text? }>
   *   customUserPrompt?: string
   * }
   */
  router.post(
    "/reply",
    authMiddleware,
    geminiLimiter,
    async (req, res, next) => {
      logger.debug("POST /api/gemini/reply", {
        userId: (req as any).user?.userId,
      });
      handleCandidateReply(req, res);
    }
  );

  /**
   * POST /api/gemini/agent/reply
   * Generate agent response
   * 
   * Auth: Optional (for tracking and analytics)
   * Rate Limit: 30 requests per 15 minutes
   * 
   * Request body:
   * {
   *   agentName: string (required)
   *   systemPrompt: string (required)
   *   conversationHistory: Array<{ sender, body?, text? }> (default: [])
   *   userPrompt: string (required)
   * }
   */
  router.post(
    "/agent/reply",
    authMiddleware,
    geminiLimiter,
    async (req, res, next) => {
      logger.debug("POST /api/gemini/agent/reply", {
        userId: (req as any).user?.userId,
        agentName: req.body.agentName,
      });
      handleAgentReply(req, res);
    }
  );

  /**
   * POST /api/gemini/audio/transcribe
   * Transcribe inbound audio before agent response.
   */
  router.post(
    "/audio/transcribe",
    authMiddleware,
    geminiLimiter,
    async (req, res, next) => {
      logger.debug("POST /api/gemini/audio/transcribe", {
        userId: (req as any).user?.userId,
        mimeType: req.body.mimeType,
      });
      handleAudioTranscription(req, res);
    }
  );

  return router;
};
