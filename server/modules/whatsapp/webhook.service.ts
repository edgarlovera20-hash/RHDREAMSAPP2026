import { createMessage, updateMessageStatusByProviderId } from "../../services/message.service";
import { DEFAULT_COMPANY_ID } from "../../services/conversation.service";
import { logger } from "../../utils/logger";
import { markWhatsAppMessageAsRead, sendRecruitmentMenu, sendWhatsAppText } from "./graphApi.service";
import { createRecruitmentReplyPlan, readWhatsAppMessageText } from "./recruitmentFlow.service";
import {
  mapWhatsAppStatus,
  WhatsAppContact,
  WhatsAppIncomingMessage,
  WhatsAppStatusUpdate,
  WhatsAppWebhookEvent,
} from "./types";

const processedWhatsAppMessageIds = new Set<string>();

function rememberWebhookMessage(messageId: string) {
  if (!messageId) return true;
  if (processedWhatsAppMessageIds.has(messageId)) return false;
  processedWhatsAppMessageIds.add(messageId);
  if (processedWhatsAppMessageIds.size > 1500) {
    const [oldest] = processedWhatsAppMessageIds;
    if (oldest) processedWhatsAppMessageIds.delete(oldest);
  }
  return true;
}

function toCreatedAt(value: string | number | undefined, fallback: number) {
  const timestamp = Number(value || fallback || Date.now());
  return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
}

async function handleStatusUpdate(status: WhatsAppStatusUpdate, phoneNumberId: string) {
  if (!status.id) return;

  const nextStatus = mapWhatsAppStatus(status.status);
  await updateMessageStatusByProviderId(status.id, DEFAULT_COMPANY_ID, nextStatus, {
    deliveredAt: nextStatus === "delivered" ? toCreatedAt(status.timestamp, Date.now()) : undefined,
    readAt: nextStatus === "read" ? toCreatedAt(status.timestamp, Date.now()) : undefined,
    failedReason: nextStatus === "failed"
      ? status.errors?.[0]?.error_data?.details || status.errors?.[0]?.message || status.errors?.[0]?.title || "WhatsApp reporto error"
      : undefined,
  });

  logger.info("WhatsApp Cloud status update processed", {
    phoneNumberId,
    providerMessageId: status.id,
    status: status.status,
  });
}

export async function processWhatsAppBusinessWebhook(body: any): Promise<WhatsAppWebhookEvent[]> {
  const events: WhatsAppWebhookEvent[] = [];
  if (String(body?.object || "") !== "whatsapp_business_account") return events;

  for (const entry of body.entry || []) {
    const entryTime = Number(entry.time || Date.now());

    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value || {};
      const phoneNumberId = String(value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || entry.id || "");
      const contactsByWaId = new Map<string, string>();
      for (const contact of (value.contacts || []) as WhatsAppContact[]) {
        contactsByWaId.set(String(contact.wa_id || ""), String(contact.profile?.name || ""));
      }

      for (const status of (value.statuses || []) as WhatsAppStatusUpdate[]) {
        await handleStatusUpdate(status, phoneNumberId);
      }

      for (const message of (value.messages || []) as WhatsAppIncomingMessage[]) {
        const from = String(message.from || "");
        const text = readWhatsAppMessageText(message);
        const messageId = String(message.id || `whatsapp-${Date.now()}-${from}`);
        if (!from || !text || !rememberWebhookMessage(messageId)) continue;

        const candidateName = contactsByWaId.get(from) || from;
        const createdAt = toCreatedAt(message.timestamp, entryTime);
        events.push({
          id: messageId,
          source: phoneNumberId,
          channel: "whatsapp",
          direction: "inbound",
          sender: from,
          body: text,
          candidateName,
          candidatePhone: from,
          createdAt,
          raw: message,
        });

        await createMessage({
          companyId: DEFAULT_COMPANY_ID,
          channel: "whatsapp",
          provider: "meta",
          direction: "inbound",
          body: text,
          sender: from,
          contactName: candidateName,
          providerMessageId: messageId,
          status: "delivered",
          createdAt,
          dedupeKey: messageId,
          aiMode: "auto_send",
        }, "whatsapp-meta-webhook");

        markWhatsAppMessageAsRead(messageId, phoneNumberId).catch((error) => {
          logger.warn("WhatsApp Cloud read receipt failed", {
            messageId,
            error: error instanceof Error ? error.message : error,
          });
        });

        const replyPlan = await createRecruitmentReplyPlan({
          phoneNumberId,
          from,
          body: text,
          message,
        });
        if (!replyPlan?.body) continue;

        const sent = replyPlan.interactiveMenu
          ? await sendRecruitmentMenu(from, phoneNumberId)
          : await sendWhatsAppText(from, replyPlan.body, phoneNumberId);

        await createMessage({
          companyId: DEFAULT_COMPANY_ID,
          channel: "whatsapp",
          provider: "meta",
          direction: "outbound",
          body: replyPlan.body,
          sender: phoneNumberId || "whatsapp-meta",
          contactName: candidateName,
          providerMessageId: sent.providerMessageId,
          status: sent.ok ? "sent" : "failed",
          failedReason: sent.error,
          aiGenerated: replyPlan.aiGenerated,
          intent: replyPlan.intent,
          sentAt: sent.ok ? Date.now() : undefined,
          createdAt: Date.now(),
        }, "whatsapp-meta-webhook");

        events.push({
          id: sent.providerMessageId || `whatsapp-reply-${Date.now()}-${from}`,
          source: phoneNumberId,
          channel: "whatsapp",
          direction: "outbound",
          sender: phoneNumberId || "whatsapp-meta",
          body: replyPlan.body,
          candidateName,
          candidatePhone: from,
          createdAt: Date.now(),
          raw: {
            replyPlan,
            sent,
          },
        });
      }
    }
  }

  return events;
}
