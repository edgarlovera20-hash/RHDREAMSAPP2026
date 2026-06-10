import path from "path";
import fs from "fs/promises";
import QRCode from "qrcode";
import P from "pino";
import { logger } from "../utils/logger";
import { getGeminiService } from "./gemini.service";
import {
  getRecruitmentLeadProfile,
  prepareRecruitmentConversationTurn,
  recordRecruitmentAssistantReply,
} from "./conversationSession.service";

type BaileysConnectionState = "idle" | "connecting" | "qr" | "connected" | "closed" | "logged_out" | "error";

type BaileysSession = {
  id: string;
  socket?: any;
  state: BaileysConnectionState;
  qr?: string | null;
  qrDataUrl?: string | null;
  qrCreatedAt?: number;
  qrExpiresAt?: number;
  phone?: string | null;
  lastError?: string | null;
  reconnectAttempts?: number;
  updatedAt: number;
  connectedAt?: number;
  agentName?: string;
  companyName?: string;
  agentPrompt?: string;
  autoReplyEnabled?: boolean;
  autoRepliedMessageIds: Set<string>;
  messages: Array<{
    id: string;
    from: string;
    body: string;
    timestamp: number;
    direction: "inbound" | "outbound";
  }>;
};

type StartOptions = {
  sessionId?: string;
  agentName?: string;
  companyName?: string;
  agentPrompt?: string;
  autoReplyEnabled?: boolean;
  resetSession?: boolean;
};

type SendOptions = {
  sessionId?: string;
  to: string;
  body: string;
};

const DEFAULT_SESSION_ID = process.env.BAILEYS_SESSION_ID || "default";
const MAX_SESSION_MESSAGES = Math.max(100, Number(process.env.BAILEYS_MAX_SESSION_MESSAGES || 1000));
const QR_TTL_MS = Math.max(30_000, Number(process.env.BAILEYS_QR_TTL_MS || 120_000)); // Aumentado a 120 segundos
const CONNECTING_STALE_MS = Math.max(15_000, Number(process.env.BAILEYS_CONNECTING_STALE_MS || 35_000));
const SESSION_ROOT = process.env.BAILEYS_SESSIONS_DIR
  ? path.resolve(process.env.BAILEYS_SESSIONS_DIR)
  : path.join(process.cwd(), ".sessions", "baileys");
const sessions = new Map<string, BaileysSession>();

const getSession = (sessionId = DEFAULT_SESSION_ID) => {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const session: BaileysSession = {
    id: sessionId,
    state: "idle",
    qr: null,
    qrDataUrl: null,
    phone: null,
    lastError: null,
    updatedAt: Date.now(),
    autoReplyEnabled: true,
    autoRepliedMessageIds: new Set(),
    messages: [],
  };
  sessions.set(sessionId, session);
  return session;
};

const sessionPath = (sessionId: string) => path.join(SESSION_ROOT, sessionId);

const closeSessionSocket = (session: BaileysSession) => {
  const socket = session.socket;
  session.socket = undefined;
  if (!socket) return;

  try {
    socket.ev?.removeAllListeners?.("connection.update");
    socket.ev?.removeAllListeners?.("messages.upsert");
    socket.ev?.removeAllListeners?.("creds.update");
  } catch (_error) {
    // Best effort cleanup; Baileys socket shapes vary between versions.
  }

  try {
    socket.ws?.close?.();
  } catch (_error) {
    // Ignore websocket close errors.
  }
};

const clearTransientQrState = (session: BaileysSession) => {
  session.qr = null;
  session.qrDataUrl = null;
  session.qrCreatedAt = undefined;
  session.qrExpiresAt = undefined;
};

const refreshSessionLifecycle = (session: BaileysSession) => {
  if (session.state === "connected") return;

  const now = Date.now();
  const qrExpired = session.state === "qr" && Boolean(session.qrExpiresAt) && now > Number(session.qrExpiresAt);
  const connectingStale = session.state === "connecting" && now - session.updatedAt > CONNECTING_STALE_MS;

  if (!qrExpired && !connectingStale) return;

  closeSessionSocket(session);
  clearTransientQrState(session);
  session.state = "closed";
  session.lastError = qrExpired
    ? "El QR expiro. Generando uno nuevo para vincular WhatsApp."
    : "Baileys tardo demasiado en generar QR. Reiniciando la sesion.";
  session.updatedAt = now;

  // Auto-restart cuando QR expira o se vuelve stale
  if (qrExpired || connectingStale) {
    setTimeout(() => {
      startBaileysSession({ sessionId: session.id }).catch((error) => {
        logger.error("Baileys auto-restart after QR expiry failed", { sessionId: session.id, error });
      });
    }, 2000);
  }
};

const clearSessionFiles = async (session: BaileysSession) => {
  const targetPath = path.resolve(sessionPath(session.id));
  const rootPath = path.resolve(SESSION_ROOT);
  if (!targetPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error("Ruta de sesion Baileys invalida");
  }

  await fs.rm(targetPath, { recursive: true, force: true });
  closeSessionSocket(session);
  clearTransientQrState(session);
  session.phone = null;
  session.connectedAt = undefined;
  session.updatedAt = Date.now();
};

const toWhatsAppJid = (to: string) => {
  if (to.includes("@s.whatsapp.net") || to.includes("@lid") || to.includes("@g.us")) {
    return to.trim();
  }

  const normalized = to.replace(/[^\d]/g, "");
  if (!normalized) {
    throw new Error("Telefono destino invalido");
  }
  return `${normalized}@s.whatsapp.net`;
};

const publicSession = (session: BaileysSession) => ({
  id: session.id,
  state: session.state,
  qrDataUrl: session.qrDataUrl,
  qrCreatedAt: session.qrCreatedAt,
  qrExpiresAt: session.qrExpiresAt,
  qrSecondsLeft: session.qrExpiresAt ? Math.max(0, Math.ceil((session.qrExpiresAt - Date.now()) / 1000)) : null,
  phone: session.phone,
  agentName: session.agentName,
  companyName: session.companyName,
  autoReplyEnabled: session.autoReplyEnabled ?? true,
  lastError: session.lastError,
  updatedAt: session.updatedAt,
  messages: session.messages.slice(-20),
});

const updateSessionMetadata = (session: BaileysSession, options: StartOptions) => {
  if (options.agentName?.trim()) session.agentName = options.agentName.trim();
  if (options.companyName?.trim()) session.companyName = options.companyName.trim();
  if (options.agentPrompt?.trim()) session.agentPrompt = options.agentPrompt.trim();
  if (typeof options.autoReplyEnabled === "boolean") session.autoReplyEnabled = options.autoReplyEnabled;
};

const waitForConnectedSession = async (session: BaileysSession, timeoutMs = 12000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (session.socket && session.state === "connected") return;
    if (session.state === "qr" || session.state === "logged_out") break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

const waitForLinkingState = async (session: BaileysSession, timeoutMs = 15000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (session.state === "qr" && session.qrDataUrl) return;
    if (session.state === "connected" || session.state === "logged_out" || session.state === "error") return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
};

const getTimeGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 11) return "Hola, buenos dias.";
  if (hour >= 12 && hour <= 18) return "Hola, buenas tardes.";
  return "Hola, buenas noches.";
};

const buildFirstContactGreeting = (agentName: string, companyName: string) =>
  `${getTimeGreeting()}\n\nSoy ${agentName}, reclutador de ${companyName}.\n\n¿En que puedo servirte hoy?`;

const normalizeForDuplicateCheck = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const compactRecruitmentReply = (reply: string) => {
  const lines = reply
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 3) {
    return lines.join("\n\n");
  }

  return lines.slice(0, 3).join("\n\n");
};

const getLastOutboundText = (session: BaileysSession, to: string) =>
  [...session.messages]
    .reverse()
    .find((message) => message.direction === "outbound" && message.from === to)
    ?.body || "";

const hasRecentDuplicateOutbound = (session: BaileysSession, to: string, body: string, windowMs = 2 * 60 * 1000) => {
  const normalizedBody = normalizeForDuplicateCheck(body);
  const now = Date.now();
  return [...session.messages].reverse().some((message) => {
    const timestamp = Number(message.timestamp || 0);
    const sentAt = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    return (
      message.direction === "outbound" &&
      message.from === to &&
      now - sentAt <= windowMs &&
      normalizeForDuplicateCheck(message.body) === normalizedBody
    );
  });
};

const dedupeRecruitmentReply = (reply: string, previousReply: string, fallback: string) =>
  normalizeForDuplicateCheck(reply) === normalizeForDuplicateCheck(previousReply)
    ? fallback
    : reply;

export function getBaileysStatus(sessionId?: string) {
  const session = getSession(sessionId);
  refreshSessionLifecycle(session);
  return publicSession(session);
}

export function getAllBaileysStatuses() {
  return Array.from(sessions.values()).map((session) => {
    refreshSessionLifecycle(session);
    return publicSession(session);
  });
}

export async function startBaileysSession(options: StartOptions = {}) {
  const session = getSession(options.sessionId);
  updateSessionMetadata(session, options);
  refreshSessionLifecycle(session);

  if (options.resetSession || session.state === "logged_out") {
    await clearSessionFiles(session);
    session.state = "idle";
    session.lastError = null;
  }

  if (["connecting", "qr", "connected"].includes(session.state)) {
    return publicSession(session);
  }

  if (session.socket && ["connecting", "qr", "connected"].includes(session.state)) {
    return publicSession(session);
  }

  const MAX_CONCURRENT_SESSIONS = Number(process.env.BAILEYS_MAX_SESSIONS || 5);
  const activeSessions = Array.from(sessions.values()).filter(s =>
    s.id !== session.id && ["connecting", "qr", "connected"].includes(s.state)
  ).length;
  if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
    session.state = "error";
    session.lastError = `Limite de sesiones activas alcanzado (${MAX_CONCURRENT_SESSIONS}). Cierra otras sesiones primero.`;
    return publicSession(session);
  }

  await fs.mkdir(sessionPath(session.id), { recursive: true });
  session.state = "connecting";
  session.lastError = null;
  session.updatedAt = Date.now();

  const baileys = await import("@whiskeysockets/baileys");
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath(session.id));

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["RHDreams", "Chrome", "1.0.0"],
    logger: P({ level: process.env.BAILEYS_LOG_LEVEL || "silent" }),
  });

  session.socket = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update: any) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      try {
        const now = Date.now();
        let qrDataUrl: string | null = null;
        let retries = 3;

        while (retries > 0 && !qrDataUrl) {
          try {
            qrDataUrl = await QRCode.toDataURL(qr, {
              errorCorrectionLevel: "M",
              margin: 2,
              scale: 8,
              width: 360,
              color: {
                dark: "#000000",
                light: "#ffffff",
              },
            });
          } catch (qrError) {
            retries -= 1;
            if (retries > 0) {
              logger.warn("Baileys QR generation failed, retrying", { sessionId: session.id, retriesLeft: retries });
              await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
              logger.error("Baileys QR generation failed after retries", { sessionId: session.id, qrError });
              throw qrError;
            }
          }
        }

        session.qr = qr;
        session.qrDataUrl = qrDataUrl;
        session.qrCreatedAt = now;
        session.qrExpiresAt = now + QR_TTL_MS;
        session.state = "qr";
        session.lastError = null;
        session.updatedAt = now;
        logger.info("Baileys QR generated successfully", { sessionId: session.id, expiresAt: session.qrExpiresAt });

        const expireTimer = setTimeout(() => {
          const activeSession = sessions.get(session.id);
          if (activeSession !== session || session.state !== "qr" || session.qr !== qr) return;
          logger.info("Baileys QR expired, triggering refresh", { sessionId: session.id });
          refreshSessionLifecycle(session);
        }, QR_TTL_MS + 1000);
        (expireTimer as any).unref?.();
      } catch (error) {
        logger.error("Baileys connection.update QR handling failed", { sessionId: session.id, error });
        session.lastError = "Error procesando QR de WhatsApp.";
        session.state = "error";
        session.updatedAt = Date.now();
      }
    }

    if (connection === "open") {
      session.state = "connected";
      session.reconnectAttempts = 0;
      clearTransientQrState(session);
      session.phone = socket.user?.id || null;
      session.lastError = null;
      session.connectedAt = Date.now();
      session.updatedAt = Date.now();
      logger.info("Baileys session connected", { sessionId: session.id, phone: session.phone });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      session.state = loggedOut ? "logged_out" : "closed";
      session.socket = undefined;
      clearTransientQrState(session);
      session.lastError = lastDisconnect?.error?.message || null;
      session.updatedAt = Date.now();
      logger.info("Baileys connection closed", { sessionId: session.id, loggedOut, statusCode });

      if (loggedOut) {
        clearSessionFiles(session)
          .then(() => {
            session.state = "closed";
            session.lastError = "La sesion anterior fue cerrada por WhatsApp. Generando nuevo QR.";
            return startBaileysSession({ sessionId: session.id });
          })
          .catch((error) => {
            logger.error("Baileys logged-out reset failed", { sessionId: session.id, error });
          });
      } else {
        const attempt = (session.reconnectAttempts || 0) + 1;
        session.reconnectAttempts = attempt;
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 60_000); // 1s, 2s, 4s, 8s... max 60s
        logger.info("Baileys scheduling reconnect", { sessionId: session.id, attempt, backoffMs });
        setTimeout(() => {
          startBaileysSession({ sessionId: session.id }).catch((error) => {
            logger.error("Baileys reconnect failed", { sessionId: session.id, error });
          });
        }, backoffMs);
      }
    }
  });

  const sendAutonomousAgentReply = async (messageId: string, to: string, inboundBody: string) => {
    if ((session.autoReplyEnabled ?? true) === false) return;
    if (!session.socket || session.state !== "connected") return;
    if (!to || to.includes("@g.us") || to.includes("status@broadcast")) return;
    if (session.autoRepliedMessageIds.has(messageId)) return;

    session.autoRepliedMessageIds.add(messageId);

    const agentName = session.agentName || process.env.DEFAULT_AGENT_PERSONAL_NAME || "Agente de Heavenly Dreams";
    const companyName = session.companyName || process.env.DEFAULT_COMPANY_NAME || "Heavenly Dreams";
    try {
      const turn = await prepareRecruitmentConversationTurn({
        sessionId: session.id,
        contactId: to,
        inboundBody,
        agentName,
        companyName,
      });
      const previousReply = getLastOutboundText(session, to);
      let reply = "";

      if (turn.firstAssistantContact) {
        reply = buildFirstContactGreeting(agentName, companyName);
      } else if (turn.intent === "ASK_VACANCY") {
        reply = "Tenemos varias vacantes disponibles.\n\n¿Para que area buscas empleo?";
      } else if (!turn.conversation.name) {
        reply = "Con gusto te ayudo.\n\n¿Me compartes tu nombre completo?";
      } else {
        const gemini = getGeminiService();
        let knowledgeBaseContext = "";
        try {
          const { buildKnowledgeBasePrompt } = await import("../../src/data/agentKnowledgeBase.js");
          knowledgeBaseContext = `\n\n${buildKnowledgeBasePrompt()}`;
        } catch { /* skip if unavailable */ }
        const result = await gemini.generateAgentResponse(
          agentName,
          `
Eres ${agentName}, agente de IA de ${companyName}.
Respondes mensajes entrantes de WhatsApp para reclutamiento, atencion y seguimiento.
${session.agentPrompt || ""}

${turn.systemContext}
${knowledgeBaseContext}

EMPRESA: ${companyName}
UBICACION: Av. Tlahuac 3632 A301, Col. Culhuacan, Iztapalapa, CDMX. Metro Culhuacan direccion Mixcoac.
VACANTES: Ayudante General ($2,000/sem), Asesor Comercial ($2,300/sem), Supervisor ($2,600/sem), Volantero.
HORARIO ENTREVISTAS: Lunes a viernes, horario de oficina.
DOCUMENTOS PARA ENTREVISTA: INE, CURP, RFC, comprobante de domicilio, estudios, acta de nacimiento, NSS.

OBJETIVO PRINCIPAL: Conseguir que el candidato confirme asistencia a entrevista presencial.
FLUJO: 1) Saludo + nombre  2) Vacante de interes  3) Edad y disponibilidad  4) Agendar entrevista  5) Confirmar cita  6) Recordatorio

Reglas:
- Responde en maximo 2 o 3 lineas.
- No envies parrafos largos.
- Haz una sola pregunta por mensaje.
- No uses frases repetidas ni copies exactamente el ultimo mensaje enviado.
- No inventes sueldos, horarios, direcciones ni promesas.
- Siempre guia hacia el siguiente paso: si no tiene vacante, preguntar; si ya tiene vacante, preguntar edad/disponibilidad; si ya califica, ofrecer cita.
        `.trim(),
          turn.history,
          turn.userPrompt
        );
        reply = result.reply?.trim() || "";
      }

      if (!reply) return;
      reply = compactRecruitmentReply(reply);
      reply = dedupeRecruitmentReply(
        reply,
        previousReply,
        turn.conversation.name && turn.conversation.vacancy
          ? `Gracias, ${turn.conversation.name}.\n\n¿Me compartes tu edad?`
          : turn.conversation.name
            ? "Perfecto, avanzo con tu registro.\n\n¿Que vacante te interesa?"
            : "Para avanzar con tu registro.\n\n¿Cual es tu nombre completo?"
      );
      if (hasRecentDuplicateOutbound(session, to, reply)) {
        logger.warn("Baileys duplicate autonomous reply skipped", {
          sessionId: session.id,
          to,
          reply,
        });
        return;
      }

      const response = await session.socket.sendMessage(to, { text: reply });
      session.messages.push({
        id: response?.key?.id || `ai-${Date.now()}`,
        from: to,
        body: reply,
        timestamp: Date.now(),
        direction: "outbound",
      });
      session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
      session.updatedAt = Date.now();
      await recordRecruitmentAssistantReply({
        sessionId: session.id,
        contactId: to,
        reply,
        responseType: turn.conversation.stage,
      });
      const lead = await getRecruitmentLeadProfile(session.id, to);
      logger.info("Baileys autonomous AI reply sent", {
        sessionId: session.id,
        to,
        agentName,
        intent: turn.intent,
        stage: turn.conversation.stage,
        leadId: lead.id,
        crmStatus: lead.estatus,
      });
    } catch (error) {
      logger.error("Baileys autonomous AI reply failed", { sessionId: session.id, error });
    }
  };

  socket.ev.on("messages.upsert", ({ messages, type }: any) => {
    for (const message of messages || []) {
      const body =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        "";
      if (!body) continue;

      const messageId = message.key?.id || `${Date.now()}`;
      const from = message.key?.remoteJid || "";
      const direction = message.key?.fromMe ? "outbound" : "inbound";
      const rawTimestamp = Number(message.messageTimestamp || Date.now());
      const createdAtMs = rawTimestamp < 10000000000 ? rawTimestamp * 1000 : rawTimestamp;

      session.messages.push({
        id: messageId,
        from,
        body,
        timestamp: rawTimestamp,
        direction,
      });
      session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
      session.updatedAt = Date.now();

      const isFreshInbound =
        direction === "inbound" &&
        type === "notify" &&
        createdAtMs > Date.now() - 5 * 60 * 1000;

      if (isFreshInbound) {
        void sendAutonomousAgentReply(messageId, from, body);
      }
    }
  });

  await waitForLinkingState(session);

  return publicSession(session);
}

export async function restoreSavedBaileysSessions() {
  if (process.env.NODE_ENV === "production" && !process.env.BAILEYS_SESSIONS_DIR) {
    logger.warn(
      "Baileys sessions stored in local filesystem. In ephemeral environments (containers, serverless), sessions will be lost on restart. Set BAILEYS_SESSIONS_DIR to a persistent volume path or use a Redis-backed session store.",
      { sessionRoot: SESSION_ROOT }
    );
  }

  try {
    await fs.mkdir(SESSION_ROOT, { recursive: true });
    const entries = await fs.readdir(SESSION_ROOT, { withFileTypes: true });
    const sessionIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    for (const sessionId of sessionIds) {
      startBaileysSession({ sessionId }).catch((error) => {
        logger.error("Saved Baileys session restore failed", { sessionId, error });
      });
    }

    if (sessionIds.length > 0) {
      logger.info("Restoring saved Baileys sessions", { sessionIds });
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      logger.error("Could not restore saved Baileys sessions", error);
    }
  }
}

export async function sendBaileysMessage(options: SendOptions) {
  let session = getSession(options.sessionId);
  if (!session.socket || session.state !== "connected") {
    await startBaileysSession({ sessionId: options.sessionId });
    session = getSession(options.sessionId);
    await waitForConnectedSession(session);
  }

  if (!session.socket || session.state !== "connected") {
    if (session.state === "qr" || session.state === "logged_out") {
      throw new Error("WhatsApp necesita reconectar QR en Canales de Chat.");
    }
    throw new Error("La sesion Baileys no esta conectada. Intenta de nuevo en unos segundos o reconecta el QR.");
  }

  const jid = toWhatsAppJid(options.to);
  const response = await session.socket.sendMessage(jid, { text: options.body });
  session.messages.push({
    id: response?.key?.id || `${Date.now()}`,
    from: jid,
    body: options.body,
    timestamp: Date.now(),
    direction: "outbound",
  });
  session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  session.updatedAt = Date.now();

  return {
    ok: true,
    provider: "baileys",
    sessionId: session.id,
    to: jid,
    messageId: response?.key?.id || null,
  };
}

export async function logoutBaileysSession(sessionId?: string) {
  const session = getSession(sessionId);
  if (session.socket) {
    await session.socket.logout();
  }
  session.socket = undefined;
  session.state = "logged_out";
  session.qr = null;
  session.qrDataUrl = null;
  session.phone = null;
  session.updatedAt = Date.now();
  return publicSession(session);
}
