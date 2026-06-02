import { Router } from "express";
import {
  approveConversationMessage,
  createConversationAiDraft,
  createConversationMessage,
  createConversationRecord,
  getConversationRecord,
  listConversationRecords,
  rejectConversationMessage,
} from "../controllers/conversations.controller";
import { authMiddleware } from "../middleware/auth";
import { apiLimiter, geminiLimiter } from "../middleware/rateLimiter";

export const createConversationRoutes = (): Router => {
  const router = Router();

  router.get("/", authMiddleware, listConversationRecords);
  router.post("/", authMiddleware, apiLimiter, createConversationRecord);
  router.get("/:conversationId", authMiddleware, getConversationRecord);
  router.post("/:conversationId/messages", authMiddleware, apiLimiter, createConversationMessage);
  router.post("/:conversationId/ai/draft", authMiddleware, geminiLimiter, createConversationAiDraft);
  router.post("/:conversationId/messages/:messageId/approve", authMiddleware, apiLimiter, approveConversationMessage);
  router.post("/:conversationId/messages/:messageId/reject", authMiddleware, apiLimiter, rejectConversationMessage);

  return router;
};

