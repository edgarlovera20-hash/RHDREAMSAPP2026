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
  channel: "messenger" | "facebook" | "instagram" | "whatsapp";
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
const getInstagramAccessToken = () => process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || getPageAccessToken();
const getWhatsAppAccessToken = () => process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN || "";
const getWhatsAppPhoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID || "";
const getVerifyToken = () => process.env.META_WEBHOOK_VERIFY_TOKEN || "";
const getAppSecrets = () =>
  [
    process.env.META_APP_SECRET,
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_INSTAGRAM_APP_SECRET,
  ].filter(Boolean) as string[];

function addAppSecretProofParam(url: URL, accessToken: string) {
  if (!accessToken) return;

  const appSecret = getAppSecrets()[0];
  if (appSecret) {
    url.searchParams.set("appsecret_proof", crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex"));
  }
}

function addAccessTokenParams(url: URL, accessToken: string) {
  url.searchParams.set("access_token", accessToken);
  addAppSecretProofParam(url, accessToken);
}

const autoRepliedMessageIds = new Set<string>();

function rememberAutoReply(messageId: string) {
  if (!messageId) return true;
  if (autoRepliedMessageIds.has(messageId)) return false;
  autoRepliedMessageIds.add(messageId);
  if (autoRepliedMessageIds.size > 1000) {
    const [oldest] = autoRepliedMessageIds;
    if (oldest) autoRepliedMessageIds.delete(oldest);
  }
  return true;
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

async function sendMetaText(input: {
  recipientId: string;
  text: string;
  channel: "messenger" | "instagram";
}) {
  const token = input.channel === "instagram" ? getInstagramAccessToken() : getPageAccessToken();
  if (!token) {
    logger.warn("Meta reply skipped: page access token is missing", { channel: input.channel });
    return null;
  }

  const url = new URL(`https://graph.facebook.com/${getGraphVersion()}/me/messages`);
  addAccessTokenParams(url, token);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      message: { text: input.text },
      messaging_type: "RESPONSE",
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    logger.warn("Meta social send failed", { channel: input.channel, status: response.status, payload });
    return null;
  }

  return payload;
}

async function sendWhatsAppCloudText(to: string, text: string) {
  const token = getWhatsAppAccessToken();
  const phoneNumberId = getWhatsAppPhoneNumberId();
  if (!token || !phoneNumberId) {
    logger.warn("WhatsApp Cloud reply skipped: access token or phone number id is missing");
    return null;
  }

  const url = new URL(`https://graph.facebook.com/${getGraphVersion()}/${phoneNumberId}/messages`);
  addAppSecretProofParam(url, token);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    logger.warn("WhatsApp Cloud send failed", { status: response.status, payload });
    return null;
  }

  return payload;
}

async function sendAutonomousText(input: {
  recipientId: string;
  text: string;
  channel: "messenger" | "instagram" | "whatsapp";
}) {
  if (input.channel === "whatsapp") {
    return sendWhatsAppCloudText(input.recipientId, input.text);
  }

  return sendMetaText(input);
}

async function createAutonomousMetaReply(input: {
  sourceId: string;
  psid: string;
  body: string;
  channel: "messenger" | "instagram" | "whatsapp";
}) {
  const agentName =
    (input.channel === "instagram"
      ? process.env.INSTAGRAM_AGENT_NAME
      : input.channel === "whatsapp"
        ? process.env.WHATSAPP_AGENT_NAME
        : process.env.META_AGENT_NAME) ||
    process.env.DEFAULT_AGENT_PERSONAL_NAME ||
    "Agente de Heavenly Dreams";
  const companyName = process.env.DEFAULT_COMPANY_NAME || "Heavenly Dreams";
  const channelLabel =
    input.channel === "instagram"
      ? "Instagram DM"
      : input.channel === "whatsapp"
        ? "WhatsApp Business"
        : "Messenger de Facebook";
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
- En WhatsApp solo respondes a mensajes entrantes dentro de la conversacion activa; no inicies conversaciones nuevas.
- Haz una sola pregunta cuando falten datos.
    `.trim(),
    turn.history,
    turn.userPrompt
  );

  const reply = result.reply?.trim();
  if (!reply) return null;

  const sent = await sendAutonomousText({
    recipientId: input.psid,
    text: reply,
    channel: input.channel,
  });
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

function readWhatsAppTextMessage(message: any) {
  return (
    message?.text?.body ||
    message?.button?.text ||
    message?.interactive?.button_reply?.title ||
    message?.interactive?.list_reply?.title ||
    message?.image?.caption ||
    message?.document?.caption ||
    ""
  );
}

export async function processMetaWebhookPayload(body: any): Promise<MetaWebhookEvent[]> {
  const events: MetaWebhookEvent[] = [];
  const objectType = String(body?.object || "");
  const isInstagramObject = objectType === "instagram";
  const isWhatsAppObject = objectType === "whatsapp_business_account";
  if (objectType !== "page" && !isInstagramObject && !isWhatsAppObject) return events;

  for (const entry of body.entry || []) {
    const sourceId = String(entry.id || process.env.META_PAGE_ID || "facebook-page");
    const entryTime = Number(entry.time || Date.now());

    if (isWhatsAppObject) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const value = change.value || {};
        const phoneNumberId = String(value.metadata?.phone_number_id || getWhatsAppPhoneNumberId() || sourceId);
        const contactsByWaId = new Map<string, string>();
        for (const contact of value.contacts || []) {
          contactsByWaId.set(String(contact.wa_id || ""), String(contact.profile?.name || ""));
        }

        for (const message of value.messages || []) {
          const from = String(message.from || "");
          const text = String(readWhatsAppTextMessage(message) || "").trim();
          const messageId = String(message.id || `whatsapp-${Date.now()}-${from}`);
          if (!from || !text || !rememberAutoReply(messageId)) continue;

          const createdAt = Number(message.timestamp || entryTime || Date.now());
          const candidateName = contactsByWaId.get(from) || from;
          events.push({
            id: messageId,
            source: phoneNumberId,
            channel: "whatsapp",
            direction: "inbound",
            sender: from,
            body: text,
            candidateName,
            candidatePhone: from,
            createdAt: createdAt < 10000000000 ? createdAt * 1000 : createdAt,
            raw: message,
          });

          const autonomous = await createAutonomousMetaReply({
            sourceId: phoneNumberId,
            psid: from,
            body: text,
            channel: "whatsapp",
          });

          if (autonomous?.reply) {
            events.push({
              id: `whatsapp-reply-${Date.now()}-${from}`,
              source: phoneNumberId,
              channel: "whatsapp",
              direction: "outbound",
              sender: phoneNumberId,
              body: autonomous.reply,
              candidateName,
              candidatePhone: from,
              createdAt: Date.now(),
              raw: autonomous,
            });
          }
        }
      }

      continue;
    }

    for (const item of entry.messaging || []) {
      const psid = String(item.sender?.id || "");
      const text = String(item.message?.text || item.postback?.payload || "");
      const isEcho = Boolean(item.message?.is_echo);
      const inboundId = item.message?.mid || `${isInstagramObject ? "instagram" : "messenger"}-${entryTime}-${psid}`;
      if (!psid || !text || isEcho || !rememberAutoReply(inboundId)) continue;

      const channel = isInstagramObject ? "instagram" : "messenger";
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
