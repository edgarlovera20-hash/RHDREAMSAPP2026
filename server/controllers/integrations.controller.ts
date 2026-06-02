import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  FacebookAdsAnalyzeSchema,
  GenericWebhookSchema,
  IntegrationTestSchema,
  JobBoardWebhookSchema,
} from "../validators/schemas";
import {
  analyzeFacebookRecruitmentAds,
  completeCanvaAuthorization,
  createCanvaAuthorizationUrl,
  createCanvaDesign,
  generateGeminiRecruitmentImage,
  getIntegrationCatalog,
  normalizeJobBoardCandidate,
  testIntegrationConfig,
} from "../services/integrations.service";
import {
  processMetaWebhookPayload,
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
} from "../services/meta.service";
import {
  getAllBaileysStatuses,
  getBaileysStatus as readBaileysStatus,
  logoutBaileysSession as closeBaileysSession,
  sendBaileysMessage as sendViaBaileys,
  startBaileysSession as startLocalBaileysSession,
} from "../services/baileys.service";
import { getRecruitmentLeadProfile } from "../services/conversationSession.service";
import { logger } from "../utils/logger";

type InboxEvent = {
  id: string;
  source: string;
  channel: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  createdAt: number;
  raw?: unknown;
};

const integrationInbox: InboxEvent[] = [];

const pushInboxEvent = (event: InboxEvent) => {
  integrationInbox.unshift(event);
  integrationInbox.splice(200);
};

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

export const verifyMetaWebhook = (req: Request, res: Response) => {
  const result = verifyMetaWebhookChallenge(req.query);
  if (!result.ok) {
    logger.warn("Meta webhook verification failed", { ip: req.ip });
    return res.status(403).send("Verification failed");
  }

  res.status(200).send(result.challenge);
};

export const receiveMetaWebhook = async (req: Request, res: Response) => {
  try {
    const validSignature = verifyMetaSignature(
      (req as any).rawBody,
      req.header("x-hub-signature-256") || undefined
    );
    if (!validSignature) {
      logger.warn("Meta webhook signature rejected", { ip: req.ip });
      return res.status(403).json({
        success: false,
        error: "Firma Meta invalida",
        code: 403,
      });
    }

    const events = await processMetaWebhookPayload(req.body || {});
    for (const event of events) {
      pushInboxEvent(event);
    }

    res.status(200).json({
      success: true,
      data: {
        received: events.length,
      },
    });
  } catch (error: any) {
    logger.error("Meta webhook failed", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error procesando webhook de Meta",
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

export const createRecruitmentImage = async (req: Request, res: Response) => {
  try {
    const result = await generateGeminiRecruitmentImage(req.body || {});

    res.status((result as any).ok === false ? 502 : 200).json({
      success: (result as any).ok === false ? false : true,
      data: result,
    });
  } catch (error: any) {
    logger.error("Gemini image generation failed", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error generando imagen IA",
      code: 500,
    });
  }
};

export const connectCanva = async (_req: Request, res: Response) => {
  try {
    const url = await createCanvaAuthorizationUrl();
    res.json({
      success: true,
      data: { url },
    });
  } catch (error: any) {
    logger.error("Canva connect failed", error);
    res.status(500).json({
      success: false,
      error: error.message || "No se pudo iniciar conexion con Canva.",
      code: 500,
    });
  }
};

export const canvaCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (!code || !state) {
      return res.status(400).send("Canva no devolvio codigo de autorizacion.");
    }

    await completeCanvaAuthorization(code, state);

    res
      .status(200)
      .send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Canva conectado</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #171717; color: white; display: grid; min-height: 100vh; place-items: center; margin: 0; }
      main { max-width: 560px; padding: 32px; border: 1px solid rgba(34,211,238,.35); border-radius: 18px; background: rgba(15,23,42,.92); text-align: center; }
      a { color: #a3a3a3; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>Canva conectado</h1>
      <p>La cuenta de Canva ya quedo autorizada para RH Dreams.</p>
      <p><a href="https://rh.heavenlydreams.com.mx/agents">Volver a Agentes</a></p>
    </main>
  </body>
</html>`);
  } catch (error: any) {
    logger.error("Canva callback failed", error);
    res.status(500).send(error.message || "No se pudo finalizar conexion con Canva.");
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
      agentName: req.body?.agentName,
      companyName: req.body?.companyName,
      agentPrompt: req.body?.agentPrompt,
      autoReplyEnabled: req.body?.autoReplyEnabled,
      resetSession: req.body?.resetSession,
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

export const getBaileys = async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  let status = readBaileysStatus(sessionId);

  if (status.state === "logged_out") {
    status = await startLocalBaileysSession({
      sessionId,
      resetSession: true,
      autoReplyEnabled: true,
    });
  } else if (status.state === "idle" || status.state === "closed") {
    status = await startLocalBaileysSession({
      sessionId,
      autoReplyEnabled: true,
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    data: status,
  });
};

export const getIntegrationInbox = async (_req: Request, res: Response) => {
  const baileysEvents = (
    await Promise.all(
      getAllBaileysStatuses().flatMap((session) =>
        (session.messages || []).map(async (message: any) => {
          const lead = await getRecruitmentLeadProfile(session.id, message.from);
          return {
            id: `baileys-${session.id}-${message.id}`,
            source: session.id,
            channel: "whatsapp",
            direction: message.direction,
            sender: message.from,
            body: message.body,
            candidateName: lead.nombre || message.from,
            candidatePhone: lead.telefono || message.from,
            createdAt: Number(message.timestamp || Date.now()) * (Number(message.timestamp || 0) < 10000000000 ? 1000 : 1),
            raw: {
              ...message,
              lead,
            },
          };
        })
      )
    )
  );

  res.json({
    success: true,
    data: [...integrationInbox, ...baileysEvents].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200),
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
    const provider = String(req.params.provider || "");
    const secretEnvName = provider === "computrabajo" ? "COMPUTRABAJO_IMPORT_SECRET" : "INDEED_WEBHOOK_SECRET";
    const expectedSecret = process.env[secretEnvName] || process.env.RHDREAMS_WEBHOOK_SECRET || "";
    const providedSecret =
      req.header("x-rhdreams-webhook-secret") ||
      req.header("x-webhook-secret") ||
      "";

    if (!expectedSecret && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        error: "Webhook no configurado",
        code: 503,
      });
    }

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: "Webhook no autorizado",
        code: 401,
      });
    }

    const validated = JobBoardWebhookSchema.parse({
      ...req.body,
      provider,
    });
    const candidate = normalizeJobBoardCandidate(
      validated.provider,
      validated.payload
    );

    logger.info("Job board candidate received", {
      provider: validated.provider,
      externalId: candidate.externalId,
    });

    pushInboxEvent({
      id: `job-board-${validated.provider}-${candidate.externalId || Date.now()}`,
      source: validated.provider,
      channel: validated.provider,
      direction: "inbound",
      sender: candidate.email || candidate.phone || validated.provider,
      body: `Nuevo candidato desde ${candidate.source}: ${candidate.name}${candidate.role ? ` - ${candidate.role}` : ""}`,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      createdAt: Date.now(),
      raw: candidate.raw,
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

export const receiveGenericWebhook = (req: Request, res: Response) => {
  try {
    const expectedSecret = process.env.RHDREAMS_WEBHOOK_SECRET || "";
    const providedSecret =
      req.header("x-rhdreams-webhook-secret") ||
      req.header("x-webhook-secret") ||
      "";

    if (!expectedSecret && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        success: false,
        error: "Webhook no configurado",
        code: 503,
      });
    }

    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: "Webhook no autorizado",
        code: 401,
      });
    }

    const validated = GenericWebhookSchema.parse({
      ...req.body,
      source: req.params.source || req.body?.source,
    });

    const candidate = normalizeJobBoardCandidate(
      (validated.source || "webhook") as any,
      validated.candidate || validated.payload
    );

    logger.info("Generic webhook received", {
      source: validated.source,
      event: validated.event,
      externalId: candidate.externalId,
    });

    pushInboxEvent({
      id: `webhook-${validated.source || "externo"}-${candidate.externalId || Date.now()}`,
      source: validated.source || "webhook",
      channel: validated.source || "webhook",
      direction: "inbound",
      sender: candidate.email || candidate.phone || validated.source || "webhook",
      body:
        candidate.name !== "Candidato sin nombre"
          ? `${validated.event}: ${candidate.name}${candidate.role ? ` - ${candidate.role}` : ""}`
          : `${validated.event}: webhook recibido`,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      createdAt: Date.now(),
      raw: validated.payload,
    });

    res.json({
      success: true,
      data: {
        received: true,
        source: validated.source,
        event: validated.event,
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

    logger.error("Generic webhook failed", error);
    res.status(500).json({
      success: false,
      error: "Error procesando webhook",
      code: 500,
    });
  }
};
