import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  FacebookAdsAnalyzeSchema,
  IntegrationTestSchema,
  JobBoardWebhookSchema,
} from "../validators/schemas";
import {
  analyzeFacebookRecruitmentAds,
  createCanvaDesign,
  getIntegrationCatalog,
  normalizeJobBoardCandidate,
  testIntegrationConfig,
} from "../services/integrations.service";
import {
  getBaileysStatus as readBaileysStatus,
  logoutBaileysSession as closeBaileysSession,
  sendBaileysMessage as sendViaBaileys,
  startBaileysSession as startLocalBaileysSession,
} from "../services/baileys.service";
import { logger } from "../utils/logger";

export const getCatalog = (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getIntegrationCatalog(),
  });
};

export const analyzeFacebookAds = async (req: Request, res: Response) => {
  try {
    const validated = FacebookAdsAnalyzeSchema.parse(req.body || {});
    const result = await analyzeFacebookRecruitmentAds(validated);

    res.status((result as any).ok === false ? 502 : 200).json({
      success: (result as any).ok === false ? false : true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Datos invalidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Facebook ads analysis failed", error);
    res.status(500).json({
      success: false,
      error: "Error analizando campanas de Facebook Ads",
      code: 500,
    });
  }
};

export const createCanvaCreative = async (req: Request, res: Response) => {
  try {
    const result = await createCanvaDesign(req.body || {});

    res.status((result as any).ok === false ? 502 : 200).json({
      success: (result as any).ok === false ? false : true,
      data: result,
    });
  } catch (error) {
    logger.error("Canva creative creation failed", error);
    res.status(500).json({
      success: false,
      error: "Error creando pieza en Canva",
      code: 500,
    });
  }
};

export const testIntegration = (req: Request, res: Response) => {
  try {
    const validated = IntegrationTestSchema.parse(req.body);
    const result = testIntegrationConfig(validated);

    res.status(result.ok ? 200 : 200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Datos invalidos",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Integration test failed", error);
    res.status(500).json({
      success: false,
      error: "Error probando integracion",
      code: 500,
    });
  }
};

export const startBaileys = async (req: Request, res: Response) => {
  try {
    const result = await startLocalBaileysSession({
      sessionId: req.body?.sessionId,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Baileys start failed", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error iniciando Baileys",
      code: 500,
    });
  }
};

export const getBaileys = (req: Request, res: Response) => {
  res.json({
    success: true,
    data: readBaileysStatus(req.params.sessionId),
  });
};

export const sendBaileys = async (req: Request, res: Response) => {
  try {
    const result = await sendViaBaileys({
      sessionId: req.body?.sessionId,
      to: req.body?.to,
      body: req.body?.body,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Baileys send failed", error);
    res.status(400).json({
      success: false,
      error: error.message || "Error enviando mensaje por Baileys",
      code: 400,
    });
  }
};

export const logoutBaileys = async (req: Request, res: Response) => {
  try {
    const result = await closeBaileysSession(req.body?.sessionId || req.params.sessionId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Baileys logout failed", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error cerrando sesion Baileys",
      code: 500,
    });
  }
};

export const receiveJobBoardWebhook = (req: Request, res: Response) => {
  try {
    const validated = JobBoardWebhookSchema.parse({
      ...req.body,
      provider: req.params.provider,
    });
    const candidate = normalizeJobBoardCandidate(
      validated.provider,
      validated.payload
    );

    logger.info("Job board candidate received", {
      provider: validated.provider,
      externalId: candidate.externalId,
    });

    res.json({
      success: true,
      data: {
        candidate,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Webhook invalido",
        code: 400,
        details: error.issues,
      });
    }

    logger.error("Job board webhook failed", error);
    res.status(500).json({
      success: false,
      error: "Error procesando webhook de bolsa de empleo",
      code: 500,
    });
  }
};
