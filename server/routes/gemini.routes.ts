import { Router } from "express";
import {
  handleCandidateReply,
  handleAgentReply,
  handleAudioTranscription,
  healthCheck,
} from "../controllers/gemini.controller";
import {
  optionalAuthMiddleware,
  authMiddleware,
} from "../middleware/auth";
import { geminiLimiter } from "../middleware/rateLimiter";
import { logger } from "../utils/logger";

export const createGeminiRoutes = (): Router => {
  const router = Router();

  // Health check - no auth required
  router.get("/health", healthCheck);

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
    optionalAuthMiddleware,
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
    optionalAuthMiddleware,
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
    optionalAuthMiddleware,
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
