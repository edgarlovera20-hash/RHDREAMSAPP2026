import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getOpenRouterService } from "../services/openrouter.service";
import { logger } from "../utils/logger";

const OpenRouterChatRequestSchema = z.object({
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "El prompt del usuario es requerido"),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(8192).optional(),
});

export const handleOpenRouterChat = async (req: Request, res: Response) => {
  try {
    const validatedData = OpenRouterChatRequestSchema.parse(req.body);
    const openRouterService = getOpenRouterService();

    const result = await openRouterService.generateChatCompletion({
      model: validatedData.model,
      temperature: validatedData.temperature,
      maxTokens: validatedData.maxTokens,
      messages: [
        {
          role: "system",
          content:
            validatedData.systemPrompt ||
            "Eres un asistente de reclutamiento para Heavenly Dreams. Responde claro, util y en espanol.",
        },
        {
          role: "user",
          content: validatedData.userPrompt,
        },
      ],
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Validation error in OpenRouter chat", {
        errors: error.issues,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "Datos invalidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Error in OpenRouter chat endpoint", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error procesando OpenRouter",
      code: 500,
    });
  }
};

export const openRouterHealthCheck = (_req: Request, res: Response) => {
  const openRouterService = getOpenRouterService();

  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      openrouter: openRouterService.getConfigurationStatus(),
    },
  });
};
