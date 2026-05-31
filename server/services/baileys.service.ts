import path from "path";
import fs from "fs/promises";
import QRCode from "qrcode";
import P from "pino";
import { logger } from "../utils/logger";

type BaileysConnectionState = "idle" | "connecting" | "qr" | "connected" | "closed" | "logged_out" | "error";

type BaileysSession = {
  id: string;
  socket?: any;
  state: BaileysConnectionState;
  qr?: string | null;
  qrDataUrl?: string | null;
  phone?: string | null;
  lastError?: string | null;
  updatedAt: number;
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
};

type SendOptions = {
  sessionId?: string;
  to: string;
  body: string;
};

const DEFAULT_SESSION_ID = process.env.BAILEYS_SESSION_ID || "default";
const SESSION_ROOT = path.join(process.cwd(), ".sessions", "baileys");
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
    messages: [],
  };
  sessions.set(sessionId, session);
  return session;
};

const sessionPath = (sessionId: string) => path.join(SESSION_ROOT, sessionId);

const toWhatsAppJid = (to: string) => {
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
  phone: session.phone,
  lastError: session.lastError,
  updatedAt: session.updatedAt,
  messages: session.messages.slice(-20),
});

export function getBaileysStatus(sessionId?: string) {
  return publicSession(getSession(sessionId));
}

export async function startBaileysSession(options: StartOptions = {}) {
  const session = getSession(options.sessionId);

  if (session.socket && ["connecting", "qr", "connected"].includes(session.state)) {
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
      session.qr = qr;
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      session.state = "qr";
      session.updatedAt = Date.now();
    }

    if (connection === "open") {
      session.state = "connected";
      session.qr = null;
      session.qrDataUrl = null;
      session.phone = socket.user?.id || null;
      session.lastError = null;
      session.updatedAt = Date.now();
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      session.state = loggedOut ? "logged_out" : "closed";
      session.socket = undefined;
      session.lastError = lastDisconnect?.error?.message || null;
      session.updatedAt = Date.now();

      if (!loggedOut) {
        setTimeout(() => {
          startBaileysSession({ sessionId: session.id }).catch((error) => {
            logger.error("Baileys reconnect failed", error);
          });
        }, 3000);
      }
    }
  });

  socket.ev.on("messages.upsert", ({ messages }: any) => {
    for (const message of messages || []) {
      const body =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        "";
      if (!body) continue;

      session.messages.push({
        id: message.key?.id || `${Date.now()}`,
        from: message.key?.remoteJid || "",
        body,
        timestamp: Number(message.messageTimestamp || Date.now()),
        direction: message.key?.fromMe ? "outbound" : "inbound",
      });
      session.messages = session.messages.slice(-100);
      session.updatedAt = Date.now();
    }
  });

  return publicSession(session);
}

export async function sendBaileysMessage(options: SendOptions) {
  const session = getSession(options.sessionId);
  if (!session.socket || session.state !== "connected") {
    throw new Error("La sesion Baileys no esta conectada");
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
  session.messages = session.messages.slice(-100);
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
