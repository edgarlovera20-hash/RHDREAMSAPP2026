import { ConversationRecord, MessageChannel } from "../types";
import { appendAuditLog } from "./audit-log.service";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtimeStore.service";

const CONVERSATIONS_FILE = "conversations.json";

export const DEFAULT_COMPANY_ID =
  process.env.RHDREAMS_DEFAULT_COMPANY_ID || "heavenly-dreams";

export function normalizeConversationChannel(channel?: string): MessageChannel {
  const value = String(channel || "manual").toLowerCase();
  if (value.includes("whatsapp") || value.includes("baileys")) return "whatsapp";
  if (value.includes("instagram") || value.includes("ig")) return "instagram";
  if (value.includes("messenger")) return "messenger";
  if (value.includes("facebook") || value.includes("meta")) return "facebook";
  if (value.includes("mail")) return "email";
  return "manual";
}

export function providerForChannel(channel: MessageChannel): ConversationRecord["provider"] {
  if (channel === "whatsapp") return "baileys";
  if (channel === "messenger" || channel === "instagram" || channel === "facebook") return "meta";
  if (channel === "email") return "gmail";
  return "manual";
}

async function readConversations() {
  return readRuntimeCollection<ConversationRecord>(CONVERSATIONS_FILE);
}

async function writeConversations(conversations: ConversationRecord[]) {
  await writeRuntimeCollection(CONVERSATIONS_FILE, conversations);
}

export async function listConversations(companyId = DEFAULT_COMPANY_ID) {
  const conversations = await readConversations();
  return conversations
    .filter((conversation) => conversation.companyId === companyId)
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getConversation(conversationId: string, companyId = DEFAULT_COMPANY_ID) {
  const conversations = await readConversations();
  return conversations.find(
    (conversation) => conversation.id === conversationId && conversation.companyId === companyId
  ) || null;
}

export async function upsertConversation(input: Partial<ConversationRecord>, actorId?: string) {
  const conversations = await readConversations();
  const companyId = input.companyId || DEFAULT_COMPANY_ID;
  const channel = normalizeConversationChannel(input.channel);
  const provider = input.provider || providerForChannel(channel);
  const now = Date.now();
  const stableMatch = input.id
    ? conversations.find((conversation) => conversation.id === input.id && conversation.companyId === companyId)
    : conversations.find((conversation) =>
      conversation.companyId === companyId &&
      Boolean(input.candidateId) &&
      conversation.candidateId === input.candidateId &&
      conversation.channel === channel
    );

  const record: ConversationRecord = {
    id: stableMatch?.id || input.id || `conv-${crypto.randomUUID()}`,
    companyId,
    candidateId: input.candidateId,
    contactName: input.contactName || stableMatch?.contactName || "Contacto sin nombre",
    contactEmail: input.contactEmail || stableMatch?.contactEmail,
    contactPhone: input.contactPhone || stableMatch?.contactPhone,
    channel,
    provider,
    status: input.status || stableMatch?.status || "open",
    assignedAgentId: input.assignedAgentId || stableMatch?.assignedAgentId,
    assignedRecruiterId: input.assignedRecruiterId || stableMatch?.assignedRecruiterId,
    lastMessageAt: input.lastMessageAt || stableMatch?.lastMessageAt || now,
    unreadCount: input.unreadCount ?? stableMatch?.unreadCount ?? 0,
    tags: input.tags || stableMatch?.tags || [],
    aiMode: input.aiMode || stableMatch?.aiMode || "auto_with_approval",
    createdAt: stableMatch?.createdAt || now,
    updatedAt: now,
  };

  const next = stableMatch
    ? conversations.map((conversation) => conversation.id === record.id ? record : conversation)
    : [record, ...conversations];

  await writeConversations(next);
  await appendAuditLog({
    companyId,
    action: stableMatch ? "conversation.updated" : "conversation.created",
    actorId,
    entityType: "conversation",
    entityId: record.id,
    metadata: {
      channel: record.channel,
      candidateId: record.candidateId,
      aiMode: record.aiMode,
    },
  });

  return record;
}

export async function touchConversation(
  conversationId: string,
  input: Pick<Partial<ConversationRecord>, "status" | "lastMessageAt" | "unreadCount">,
  companyId = DEFAULT_COMPANY_ID
) {
  const conversations = await readConversations();
  const existing = conversations.find(
    (conversation) => conversation.id === conversationId && conversation.companyId === companyId
  );
  if (!existing) return null;

  const updated: ConversationRecord = {
    ...existing,
    ...input,
    lastMessageAt: input.lastMessageAt || existing.lastMessageAt,
    updatedAt: Date.now(),
  };

  await writeConversations(
    conversations.map((conversation) => conversation.id === conversationId ? updated : conversation)
  );

  return updated;
}

