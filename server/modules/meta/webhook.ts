/**
 * Meta Webhook Processor
 *
 * Handles unified webhook events from:
 *  - Facebook Messenger  (object = "page", entry[].messaging)
 *  - Instagram DMs       (object = "instagram", entry[].messaging)
 *  - Facebook Lead Ads   (object = "page", entry[].changes field = "leadgen")
 *  - Instagram Lead Ads  (object = "instagram", entry[].changes field = "leadgen")
 *  - WhatsApp Cloud API  (object = "whatsapp_business_account")
 */

import { sendMessage, sendWhatsApp } from "./graph";
import { processLead, leadToMessage, MetaLead } from "./leads";
import { logger } from "../../utils/logger";
import { getGeminiService } from "../../services/gemini.service";
import {
  prepareRecruitmentConversationTurn,
  recordRecruitmentAssistantReply,
} from "../../services/conversationSession.service";

// ─── Deduplication (prevent duplicate auto-replies) ───────────────────────────
const seenIds = new Set<string>();
function isNew(id: string): boolean {
  if (seenIds.has(id)) return false;
  seenIds.add(id);
  if (seenIds.size > 2000) seenIds.delete(seenIds.values().next().value!);
  return true;
}

// ─── AI auto-reply ────────────────────────────────────────────────────────────
async function autoReply(params: {
  channel:   "messenger" | "instagram" | "whatsapp";
  psid:      string;
  pageId:    string;
  userText:  string;
}) {
  const { channel, psid, pageId, userText } = params;

  const agentName   = process.env.DEFAULT_AGENT_PERSONAL_NAME   || "Agente RH";
  const companyName = process.env.DEFAULT_COMPANY_NAME          || "Heavenly Dreams";
  const sessionId   = `${channel}:${pageId}`;
  const channelLabel =
    channel === "instagram" ? "Instagram DM" :
    channel === "whatsapp"  ? "WhatsApp Business" :
                              "Messenger de Facebook";

  const turn = await prepareRecruitmentConversationTurn({
    sessionId,
    contactId:   psid,
    inboundBody: userText,
    agentName,
    companyName,
  });

  const result = await getGeminiService().generateAgentResponse(
    agentName,
    `Eres ${agentName}, agente de RH de ${companyName}. Atiendes candidatos por ${channelLabel}.
${turn.systemContext}
Reglas: saluda brevemente en primer contacto, responde de forma natural y breve, haz solo una pregunta si faltan datos.`,
    turn.history,
    turn.userPrompt
  );

  const reply = result.reply?.trim();
  if (!reply) return null;

  // Send reply back
  if (channel === "whatsapp") {
    await sendWhatsApp(psid, reply);
  } else {
    await sendMessage(channel, psid, reply);
  }

  await recordRecruitmentAssistantReply({
    sessionId,
    contactId:    psid,
    reply,
    responseType: turn.conversation.stage,
  });

  return reply;
}

// ─── Event types ──────────────────────────────────────────────────────────────
export type MetaEvent =
  | { type: "message";  channel: "messenger" | "instagram" | "whatsapp"; psid: string; pageId: string; text: string; mid: string; reply?: string }
  | { type: "lead";     channel: "facebook"  | "instagram";               pageId: string; lead: MetaLead }
  | { type: "echo" | "status_update" | "unknown" };

// ─── Helper: extract text from WhatsApp message object ───────────────────────
function waText(msg: any): string {
  return (
    msg?.text?.body                           ||
    msg?.button?.text                         ||
    msg?.interactive?.button_reply?.title     ||
    msg?.interactive?.list_reply?.title       ||
    msg?.image?.caption                       ||
    msg?.document?.caption                    ||
    ""
  );
}

// ─── Main processor ───────────────────────────────────────────────────────────
export async function processWebhook(body: any): Promise<MetaEvent[]> {
  const events: MetaEvent[] = [];
  const object = String(body?.object || "");

  // ── WhatsApp Business ──────────────────────────────────────────────────────
  if (object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      const pageId = String(entry.id || "");
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const val = change.value || {};

        for (const msg of val.messages || []) {
          const psid = String(msg.from || "");
          const text = waText(msg);
          const mid  = String(msg.id || `wa-${Date.now()}-${psid}`);
          if (!psid || !text || !isNew(mid)) continue;

          logger.info("[Meta WA] inbound", { psid, text: text.slice(0, 80) });
          const reply = await autoReply({ channel: "whatsapp", psid, pageId, userText: text }).catch(() => undefined);
          events.push({ type: "message", channel: "whatsapp", psid, pageId, text, mid, reply: reply ?? undefined });
        }

        // Delivery/read receipts — skip silently
        if (val.statuses?.length) {
          events.push({ type: "status_update" });
        }
      }
    }
    return events;
  }

  // ── Facebook Page / Instagram ──────────────────────────────────────────────
  if (object !== "page" && object !== "instagram") return events;

  const isIG = object === "instagram";

  for (const entry of body.entry || []) {
    const pageId = String(entry.id || META_PAGE_ID_FALLBACK());

    // ── Messaging (Messenger / Instagram DMs) ─────────────────────────────
    for (const item of entry.messaging || []) {
      const psid = String(item.sender?.id || "");
      const text = String(item.message?.text || item.postback?.payload || "");
      const isEcho = Boolean(item.message?.is_echo);
      const mid  = item.message?.mid || `${isIG ? "ig" : "fb"}-${Date.now()}-${psid}`;

      if (!psid || !text || isEcho || !isNew(mid)) continue;

      const channel = isIG ? "instagram" : "messenger";
      logger.info(`[Meta ${channel}] inbound`, { psid, text: text.slice(0, 80) });

      const reply = await autoReply({ channel, psid, pageId, userText: text }).catch(() => undefined);
      events.push({ type: "message", channel, psid, pageId, text, mid, reply: reply ?? undefined });
    }

    // ── Changes (Lead Ads) ────────────────────────────────────────────────
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      const source = isIG ? "instagram" : "facebook";
      const lead = await processLead(change, pageId, source).catch(() => null);
      if (!lead) continue;

      logger.info(`[Meta Leads] new ${source} lead`, { name: lead.name, phone: lead.phone });
      events.push({ type: "lead", channel: source, pageId, lead });
    }
  }

  return events;
}

function META_PAGE_ID_FALLBACK() {
  return process.env.META_PAGE_ID || "facebook-page";
}
