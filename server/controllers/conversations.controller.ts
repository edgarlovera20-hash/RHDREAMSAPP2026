import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  AiDraftRequestSchema,
  ConversationCreateSchema,
  MessageApprovalSchema,
  MessageCreateSchema,
} from "../validators/schemas";
import { AuthRequest } from "../middleware/auth";
import { DEFAULT_COMPANY_ID, getConversation, listConversations, upsertConversation } from "../services/conversation.service";
import { createAiDraft } from "../services/ai-orchestrator.service";
import { approveMessage, createMessage, listMessages, rejectMessage } from "../services/message.service";
import { logger } from "../utils/logger";

const getCompanyId = (req: AuthRequest) =>
  String(req.user?.companyId || DEFAULT_COMPANY_ID);

const handleControllerError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Datos invalidos",
      code: 400,
      details: error.issues,
    });
  }

  logger.error(fallback, error);
  return res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : fallback,
    code: 500,
  });
};

export const listConversationRecords = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    res.json({
      success: true,
      data: await listConversations(companyId),
    });
  } catch (error) {
    handleControllerError(res, error, "Error listando conversaciones");
  }
};

export const getConversationRecord = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    const conversation = await getConversation(req.params.conversationId, companyId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversacion no encontrada",
        code: 404,
      });
    }

    res.json({
      success: true,
      data: {
        conversation,
        messages: await listMessages(companyId, { conversationId: conversation.id }),
      },
    });
  } catch (error) {
    handleControllerError(res, error, "Error leyendo conversacion");
  }
};

export const createConversationRecord = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    const input = ConversationCreateSchema.parse({
      ...req.body,
      companyId,
    });
    const conversation = await upsertConversation(input, (req as AuthRequest).user?.userId);
    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    handleControllerError(res, error, "Error creando conversacion");
  }
};

export const createConversationMessage = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    const input = MessageCreateSchema.parse({
      ...req.body,
      companyId,
      conversationId: req.params.conversationId,
    });
    const message = await createMessage(input, (req as AuthRequest).user?.userId);
    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    handleControllerError(res, error, "Error creando mensaje");
  }
};

export const createConversationAiDraft = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    const input = AiDraftRequestSchema.parse({
      ...req.body,
      companyId,
      conversationId: req.params.conversationId,
    });
    const result = await createAiDraft(input, (req as AuthRequest).user?.userId);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleControllerError(res, error, "Error creando borrador IA");
  }
};

export const approveConversationMessage = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    MessageApprovalSchema.parse(req.body || {});
    const message = await approveMessage(req.params.messageId, companyId, (req as AuthRequest).user?.userId);
    if (!message || message.conversationId !== req.params.conversationId) {
      return res.status(404).json({
        success: false,
        error: "Mensaje no encontrado",
        code: 404,
      });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    handleControllerError(res, error, "Error aprobando mensaje");
  }
};

export const rejectConversationMessage = async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req as AuthRequest);
    const input = MessageApprovalSchema.parse(req.body || {});
    const message = await rejectMessage(
      req.params.messageId,
      companyId,
      (req as AuthRequest).user?.userId,
      input.reason
    );
    if (!message || message.conversationId !== req.params.conversationId) {
      return res.status(404).json({
        success: false,
        error: "Mensaje no encontrado",
        code: 404,
      });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    handleControllerError(res, error, "Error rechazando mensaje");
  }
};

