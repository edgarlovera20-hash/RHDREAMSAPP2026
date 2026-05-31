import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { GeminiReplyRequestSchema, AgentReplyRequestSchema, AudioTranscriptionRequestSchema } from "../validators/schemas";
import { getGeminiService } from "../services/gemini.service";
import { ZodError } from "zod";

/**
 * Handle candidate recruitment reply
 */
export const handleCandidateReply = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = GeminiReplyRequestSchema.parse(req.body);

    const { candidate, agentPrompt, history, customUserPrompt } = validatedData;

    logger.info("Processing candidate reply", {
      candidateName: candidate?.name,
      ip: req.ip,
    });

    // Get Gemini service
    const geminiService = getGeminiService();

    // Generate response
    const result = await geminiService.generateCandidateResponse(
      candidate,
      agentPrompt,
      history,
      customUserPrompt
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Validation error in candidate reply", {
        errors: error.issues,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Error in candidate reply endpoint", error);
    res.status(500).json({
      success: false,
      error: "Error procesando la solicitud",
      code: 500,
    });
  }
};

/**
 * Handle agent reply
 */
export const handleAgentReply = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = AgentReplyRequestSchema.parse(req.body);

    const { agentName, systemPrompt, conversationHistory, userPrompt } =
      validatedData;

    logger.info("Processing agent reply", {
      agentName,
      ip: req.ip,
    });

    // Get Gemini service
    const geminiService = getGeminiService();

    // Generate response
    const result = await geminiService.generateAgentResponse(
      agentName,
      systemPrompt,
      conversationHistory,
      userPrompt
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Validation error in agent reply", {
        errors: error.issues,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Error in agent reply endpoint", error);
    res.status(500).json({
      success: false,
      error: "Error procesando la solicitud",
      code: 500,
    });
  }
};

/**
 * Handle audio transcription for inbound candidate audio messages
 */
export const handleAudioTranscription = async (req: Request, res: Response) => {
  try {
    const validatedData = AudioTranscriptionRequestSchema.parse(req.body);
    const { audioBase64, mimeType, language, context } = validatedData;

    logger.info("Processing audio transcription", {
      mimeType,
      language,
      ip: req.ip,
    });

    const geminiService = getGeminiService();
    const result = await geminiService.transcribeAudio(
      audioBase64,
      mimeType,
      language,
      context
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Validation error in audio transcription", {
        errors: error.issues,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Error in audio transcription endpoint", error);
    res.status(500).json({
      success: false,
      error: "Error transcribiendo audio",
      code: 500,
    });
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = (req: Request, res: Response) => {
  const geminiService = getGeminiService();
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      geminiConfigured: geminiService.isConfigured(),
      gemini: geminiService.getConfigurationStatus(),
    },
  });
};
