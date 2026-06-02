import crypto from "crypto";
import { getGeminiService } from "./gemini.service";
import {
  prepareRecruitmentConversationTurn,
  recordRecruitmentAssistantReply,
} from "./conversationSession.service";
import { logger } from "../utils/logger";

type MetaWebhookEvent = {
  id: string;
  source: string;
  channel: "messenger" | "facebook" | "instagram";
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  createdAt: number;
  raw?: unknown;
};

const getGraphVersion = () => process.env.META_GRAPH_VERSION || "v24.0";
const getPageAccessToken = () => process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ADS_ACCESS_TOKEN || "";
const getVerifyToken = () => process.env.META_WEBHOOK_VERIFY_TOKEN || "";
const getAppSecrets = () =>
  [
    process.env.META_APP_SECRET,
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_INSTAGRAM_APP_SECRET,
  ].filter(Boolean) as string[];

function addAccessTokenParams(url: URL, accessToken: string) {
  url.searchParams.set("access_token", accessToken);

  const appSecret = getAppSecrets()[0];
  if (appSecret) {
    url.searchParams.set("appsecret_proof", crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex"));
  }
}

export function verifyMetaWebhookChallenge(query: Record<string, any>) {
  const mode = String(query["hub.mode"] || "");
  const token = String(query["hub.verify_token"] || "");
  const challenge = String(query["hub.challenge"] || "");
  const expected = getVerifyToken();

  return {
    ok: Boolean(mode === "subscribe" && expected && token === expected && challenge),
    challenge,
  };
}

export function verifyMetaSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
  const appSecrets = getAppSecrets();
  if (!appSecrets.length) return true;
  if (!rawBody || !signatureHeader?.startsWith("sha256=")) return false;

  const received = signatureHeader.trim();
  return appSecrets.some((appSecret) => {
    const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}

function readLeadField(fieldData: any[] | undefined, names: string[]) {
  const item = (fieldData || []).find((field) => names.includes(String(field?.name || "").toLowerCase()));
  const value = item?.values?.[0] || item?.value || "";
  return typeof value === "string" ? value : String(value || "");
}

async function fetchLeadDetails(leadgenId: string) {
  const token = getPageAccessToken();
  if (!token || !leadgenId) return null;

  const url = new URL(`https://graph.facebook.com/${getGraphVersion()}/${leadgenId}`);
  addAccessTokenParams(url, token);
  url.searchParams.set("fields", "id,created_time,ad_id,form_id,field_data");

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    logger.warn("Meta lead fetch failed", { status: response.status, payload });
    return null;
  }

  return payload;
}

async function sendMetaText(psid: string, text: string) {
  const token = getPageAccessToken();
  if (!token) {
    logger.warn("Meta reply skipped: META_PAGE_ACCESS_TOKEN is missing");
    return null;
  }

  const url = new URL(`https://graph.facebook.com/${getGraphVersion()}/me/messages`);
  addAccessTokenParams(url, token);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    logger.warn("Messenger send failed", { status: response.status, payload });
    return null;
  }

  return payload;
}

async function createAutonomousMetaReply(input: {
  sourceId: string;
  psid: string;
  body: string;
  channel: "messenger" | "instagram";
}) {
  const agentName =
    (input.channel === "instagram" ? process.env.INSTAGRAM_AGENT_NAME : process.env.META_AGENT_NAME) ||
    process.env.DEFAULT_AGENT_PERSONAL_NAME ||
    "Agente de Heavenly Dreams";
  const companyName = process.env.DEFAULT_COMPANY_NAME || "Heavenly Dreams";
  const channelLabel = input.channel === "instagram" ? "Instagram DM" : "Messenger de Facebook";
  const sessionId = `${input.channel}-${input.sourceId || "meta"}`;

  const turn = await prepareRecruitmentConversationTurn({
    sessionId,
    contactId: input.psid,
    inboundBody: input.body,
    agentName,
    companyName,
  });

  const result = await getGeminiService().generateAgentResponse(
    agentName,
    `
Eres ${agentName}, agente de IA de ${companyName}.
Respondes ${channelLabel} para reclutamiento.

${turn.systemContext}

Reglas:
- Si es primer contacto, saluda con tu nombre y ofrece ayuda.
- Continua la conversacion de forma humana, breve y natural.
- No uses plantillas fijas ni repitas presentacion.
- Haz una sola pregunta cuando falten datos.
    `.trim(),
    turn.history,
    turn.userPrompt
  );

  const reply = result.reply?.trim();
  if (!reply) return null;

  const sent = await sendMetaText(input.psid, reply);
  if (sent) {
    await recordRecruitmentAssistantReply({
      sessionId,
      contactId: input.psid,
      reply,
      responseType: turn.conversation.stage,
    });
  }

  return {
    reply,
    sent,
    stage: turn.conversation.stage,
    intent: turn.intent,
  };
}

export async function processMetaWebhookPayload(body: any): Promise<MetaWebhookEvent[]> {
  const events: MetaWebhookEvent[] = [];
  const objectType = String(body?.object || "");
  const isInstagramObject = objectType === "instagram";
  if (objectType !== "page" && !isInstagramObject) return events;

  for (const entry of body.entry || []) {
    const sourceId = String(entry.id || process.env.META_PAGE_ID || "facebook-page");
    const entryTime = Number(entry.time || Date.now());

    for (const item of entry.messaging || []) {
      const psid = String(item.sender?.id || "");
      const text = String(item.message?.text || item.postback?.payload || "");
      const isEcho = Boolean(item.message?.is_echo);
      if (!psid || !text || isEcho) continue;

      const channel = isInstagramObject ? "instagram" : "messenger";
      const inboundId = item.message?.mid || `${channel}-${entryTime}-${psid}`;
      events.push({
        id: inboundId,
        source: sourceId,
        channel,
        direction: "inbound",
        sender: psid,
        body: text,
        candidateName: psid,
        createdAt: entryTime,
        raw: item,
      });

      const autonomous = await createAutonomousMetaReply({
        sourceId,
        psid,
        body: text,
        channel,
      });

      if (autonomous?.reply) {
        events.push({
          id: `${channel}-reply-${Date.now()}-${psid}`,
          source: sourceId,
          channel,
          direction: "outbound",
          sender: sourceId,
          body: autonomous.reply,
          candidateName: psid,
          createdAt: Date.now(),
          raw: autonomous,
        });
      }
    }

    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = String(change.value?.leadgen_id || "");
      const details = await fetchLeadDetails(leadgenId);
      const fieldData = details?.field_data || [];
      const name = readLeadField(fieldData, ["full_name", "nombre", "name", "first_name"]);
      const phone = readLeadField(fieldData, ["phone_number", "telefono", "teléfono", "phone"]);
      const email = readLeadField(fieldData, ["email", "correo"]);

      events.push({
        id: `leadgen-${leadgenId || Date.now()}`,
        source: sourceId,
        channel: "facebook",
        direction: "inbound",
        sender: phone || email || leadgenId || "facebook-lead",
        body: name
          ? `Nuevo lead de Facebook: ${name}${phone ? `, telefono ${phone}` : ""}${email ? `, correo ${email}` : ""}`
          : "Nuevo lead de Facebook recibido.",
        candidateName: name || undefined,
        candidateEmail: email || undefined,
        candidatePhone: phone || undefined,
        createdAt: Date.now(),
        raw: {
          change,
          details,
        },
      });
    }
  }

  return events;
}
