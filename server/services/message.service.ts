import {
  ConversationRecord,
  MessageDirection,
  MessageRecord,
  MessageStatus,
} from "../types";
import { appendAuditLog } from "./audit-log.service";
import {
  DEFAULT_COMPANY_ID,
  getConversation,
  normalizeConversationChannel,
  providerForChannel,
  touchConversation,
  upsertConversation,
} from "./conversation.service";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtimeStore.service";

const MESSAGES_FILE = "messages.json";

async function readMessages() {
  return readRuntimeCollection<MessageRecord>(MESSAGES_FILE);
}

async function writeMessages(messages: MessageRecord[]) {
  await writeRuntimeCollection(MESSAGES_FILE, messages);
}

export async function listMessages(
  companyId = DEFAULT_COMPANY_ID,
  filters: { conversationId?: string; candidateId?: string } = {}
) {
  const messages = await readMessages();
  return messages
    .filter((message) => message.companyId === companyId)
    .filter((message) => !filters.conversationId || message.conversationId === filters.conversationId)
    .filter((message) => !filters.candidateId || message.candidateId === filters.candidateId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getMessage(messageId: string, companyId = DEFAULT_COMPANY_ID) {
  const messages = await readMessages();
  return messages.find((message) => message.id === messageId && message.companyId === companyId) || null;
}

export async function createMessage(
  input: Partial<MessageRecord> & {
    body: string;
    direction: MessageDirection;
    contactName?: string;
    aiMode?: ConversationRecord["aiMode"];
  },
  actorId?: string
) {
  const companyId = input.companyId || DEFAULT_COMPANY_ID;
  const channel = normalizeConversationChannel(input.channel);
  let conversation: ConversationRecord | null = input.conversationId
    ? await getConversation(input.conversationId, companyId)
    : null;

  if (!conversation) {
    conversation = await upsertConversation({
      companyId,
      id: input.conversationId,
      candidateId: input.candidateId,
      contactName: input.sender || input.contactName,
      channel,
      provider: input.provider || providerForChannel(channel),
      aiMode: input.aiMode,
    }, actorId);
  }

  const now = Date.now();
  const status: MessageStatus =
    input.status ||
    (input.direction === "inbound" ? "delivered" : "sent");
  const messages = await readMessages();
  const existingByProviderId = input.providerMessageId
    ? messages.find((message) => message.companyId === companyId && message.providerMessageId === input.providerMessageId)
    : null;
  const existingByDedupeKey = input.dedupeKey
    ? messages.find((message) => message.companyId === companyId && message.dedupeKey === input.dedupeKey)
    : null;

  if (existingByProviderId || existingByDedupeKey) {
    return existingByProviderId || existingByDedupeKey;
  }

  const message: MessageRecord = {
    id: input.id || `msg-${crypto.randomUUID()}`,
    companyId,
    conversationId: conversation.id,
    candidateId: input.candidateId || conversation.candidateId,
    channel,
    provider: input.provider || conversation.provider,
    direction: input.direction,
    body: input.body,
    sender: input.sender || (input.direction === "outbound" ? "me" : "user"),
    status,
    providerMessageId: input.providerMessageId,
    sentAt: input.sentAt || (status === "sent" ? now : undefined),
    deliveredAt: input.deliveredAt || (status === "delivered" ? now : undefined),
    readAt: input.readAt,
    failedReason: input.failedReason,
    aiGenerated: input.aiGenerated || false,
    aiAgentId: input.aiAgentId,
    aiConfidence: input.aiConfidence,
    intent: input.intent,
    sentiment: input.sentiment,
    requiresApproval: input.requiresApproval || status === "pending_approval",
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    dedupeKey: input.dedupeKey,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  await writeMessages([message, ...messages].slice(0, 5000));
  await touchConversation(conversation.id, {
    status: status === "pending_approval" ? "pending_human" : "open",
    lastMessageAt: message.createdAt,
    unreadCount: input.direction === "inbound" ? conversation.unreadCount + 1 : conversation.unreadCount,
  }, companyId);
  await appendAuditLog({
    companyId,
    action: "message.created",
    actorId,
    entityType: "message",
    entityId: message.id,
    metadata: {
      conversationId: message.conversationId,
      channel: message.channel,
      direction: message.direction,
      status: message.status,
      aiGenerated: message.aiGenerated,
    },
  });

  return message;
}

export async function updateMessageStatus(
  messageId: string,
  companyId: string,
  status: MessageStatus,
  patch: Partial<MessageRecord> = {}
) {
  const messages = await readMessages();
  const existing = messages.find((message) => message.id === messageId && message.companyId === companyId);
  if (!existing) return null;

  const updated: MessageRecord = {
    ...existing,
    ...patch,
    status,
    updatedAt: Date.now(),
  };

  await writeMessages(messages.map((message) => message.id === messageId ? updated : message));
  return updated;
}

export async function updateMessageStatusByProviderId(
  providerMessageId: string,
  companyId: string,
  status: MessageStatus,
  patch: Partial<MessageRecord> = {}
) {
  const messages = await readMessages();
  const existing = messages.find((message) => message.providerMessageId === providerMessageId && message.companyId === companyId);
  if (!existing) return null;

  const updated: MessageRecord = {
    ...existing,
    ...patch,
    status,
    updatedAt: Date.now(),
  };

  await writeMessages(messages.map((message) => message.id === existing.id ? updated : message));
  return updated;
}

export async function approveMessage(messageId: string, companyId = DEFAULT_COMPANY_ID, actorId?: string) {
  const now = Date.now();
  const updated = await updateMessageStatus(messageId, companyId, "sent", {
    requiresApproval: false,
    approvedBy: actorId || "system",
    approvedAt: now,
    sentAt: now,
  });

  if (updated) {
    await touchConversation(updated.conversationId, {
      status: "open",
      lastMessageAt: updated.createdAt,
    }, companyId);
    await appendAuditLog({
      companyId,
      action: "message.approved",
      actorId,
      entityType: "message",
      entityId: updated.id,
      metadata: {
        conversationId: updated.conversationId,
        aiGenerated: updated.aiGenerated,
      },
    });
  }

  return updated;
}

export async function rejectMessage(
  messageId: string,
  companyId = DEFAULT_COMPANY_ID,
  actorId?: string,
  reason = "Rechazado por usuario"
) {
  const updated = await updateMessageStatus(messageId, companyId, "draft", {
    requiresApproval: false,
    failedReason: reason,
  });

  if (updated) {
    await touchConversation(updated.conversationId, {
      status: "open",
      lastMessageAt: updated.createdAt,
    }, companyId);
    await appendAuditLog({
      companyId,
      action: "message.rejected",
      actorId,
      entityType: "message",
      entityId: updated.id,
      metadata: {
        conversationId: updated.conversationId,
        reason,
      },
    });
  }

  return updated;
}
