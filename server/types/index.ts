// Type definitions for the application

export interface Candidate {
  name: string;
  role: string;
  location: string;
  experience?: string;
  salaryDemand?: string;
  notes?: string;
}

export interface ChatMessage {
  sender: "me" | "user";
  body?: string;
  text?: string;
}

export type MessageChannel =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "facebook"
  | "email"
  | "manual";

export type MessageDirection = "inbound" | "outbound";

export type MessageStatus =
  | "draft"
  | "pending_approval"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type ConversationStatus =
  | "open"
  | "pending_ai"
  | "pending_human"
  | "closed";

export type AiMode = "off" | "suggest" | "auto_with_approval" | "auto_send";

export interface ConversationRecord {
  id: string;
  companyId: string;
  candidateId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  channel: MessageChannel;
  provider: "baileys" | "meta" | "gmail" | "manual";
  status: ConversationStatus;
  assignedAgentId?: string;
  assignedRecruiterId?: string;
  lastMessageAt: number;
  unreadCount: number;
  tags: string[];
  aiMode: AiMode;
  createdAt: number;
  updatedAt: number;
}

export interface MessageRecord {
  id: string;
  companyId: string;
  conversationId: string;
  candidateId?: string;
  channel: MessageChannel;
  provider?: ConversationRecord["provider"];
  direction: MessageDirection;
  body: string;
  sender: string;
  status: MessageStatus;
  providerMessageId?: string;
  sentAt?: number;
  deliveredAt?: number;
  readAt?: number;
  failedReason?: string;
  aiGenerated?: boolean;
  aiAgentId?: string;
  aiConfidence?: number;
  intent?: string;
  sentiment?: string;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: number;
  dedupeKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowRunRecord {
  id: string;
  companyId: string;
  workflowId: string;
  entityType: "candidate" | "conversation" | "appointment";
  entityId: string;
  status: "queued" | "running" | "approval_required" | "completed" | "failed";
  startedAt: number;
  finishedAt?: number;
  logs: Array<{
    at: number;
    level: "info" | "warn" | "error";
    message: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface GeminiReplyRequest {
  candidate?: Candidate;
  agentPrompt?: string;
  history?: ChatMessage[];
  customUserPrompt?: string;
}

export interface AgentReplyRequest {
  companyId?: string;
  agentId?: string;
  agentName: string;
  systemPrompt: string;
  conversationHistory: ChatMessage[];
  userPrompt: string;
}

export interface AudioTranscriptionRequest {
  audioBase64: string;
  mimeType: string;
  language?: string;
  context?: string;
}

export interface GeminiResponse {
  reply: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export interface JWTPayload {
  userId: string;
  role: string;
  companyId?: string;
  iat?: number;
  exp?: number;
}
