import { z } from "zod";

// Candidate schema validation
export const CandidateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  role: z.string().min(2, "El rol debe tener al menos 2 caracteres"),
  location: z.string().min(2, "La ubicación debe tener al menos 2 caracteres"),
  experience: z.string().optional(),
  salaryDemand: z.string().optional(),
  notes: z.string().optional(),
});

// Chat message schema
export const ChatMessageSchema = z.object({
  sender: z.enum(["me", "user"]),
  body: z.string().optional(),
  text: z.string().optional(),
});

// Gemini reply request validation
export const GeminiReplyRequestSchema = z.object({
  candidate: CandidateSchema.optional(),
  agentPrompt: z.string().optional(),
  history: z.array(ChatMessageSchema).optional(),
  customUserPrompt: z.string().optional(),
});

// Agent reply request validation
export const AgentReplyRequestSchema = z.object({
  companyId: z.string().min(1).optional(),
  agentId: z.string().optional(),
  agentName: z.string().min(1, "El nombre del agente es requerido"),
  systemPrompt: z.string().min(1, "El prompt del sistema es requerido"),
  conversationHistory: z.array(ChatMessageSchema).default([]),
  userPrompt: z.string().min(1, "El prompt del usuario es requerido"),
});

export const AudioTranscriptionRequestSchema = z.object({
  audioBase64: z.string().min(1, "El audio en base64 es requerido"),
  mimeType: z.string().min(1, "El tipo MIME del audio es requerido"),
  language: z.string().optional(),
  context: z.string().optional(),
});

export const IntegrationProviderSchema = z.enum([
  "indeed",
  "computrabajo",
  "whatsapp_personal",
  "facebook",
  "instagram",
  "messenger",
  "facebook_ads",
  "tiktok",
  "canva",
]);

export const IntegrationTestSchema = z.object({
  provider: IntegrationProviderSchema,
  config: z.record(z.string(), z.string()).optional(),
});

export const JobBoardWebhookSchema = z.object({
  provider: z.enum(["indeed", "computrabajo"]),
  payload: z.record(z.string(), z.any()).default({}),
});

export const GenericWebhookSchema = z.object({
  event: z.string().default("external.event"),
  source: z.string().optional(),
  payload: z.record(z.string(), z.any()).default({}),
  candidate: z.record(z.string(), z.any()).optional(),
});

export const LoginRequestSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

export const FacebookAdsAnalyzeSchema = z.object({
  datePreset: z.string().default("last_30d"),
  dailyBudget: z.number().positive().default(150),
  targetLeads: z.number().int().positive().default(30),
  targetHires: z.number().int().positive().default(5),
  leadToInterviewRate: z.number().min(0.01).max(1).default(0.35),
  interviewToHireRate: z.number().min(0.01).max(1).default(0.25),
  config: z.record(z.string(), z.string()).optional(),
});

// Auth schemas
export const AuthSchema = z.object({
  userId: z.string().min(1, "userId es requerido"),
  role: z.enum(["Admin", "Manager", "Recruiter", "Supervisor"]).optional(),
});

export const MessageChannelSchema = z.enum([
  "whatsapp",
  "instagram",
  "messenger",
  "facebook",
  "email",
  "manual",
]);

export const ConversationProviderSchema = z.enum([
  "baileys",
  "meta",
  "gmail",
  "manual",
]);

export const AiModeSchema = z.enum([
  "off",
  "suggest",
  "auto_with_approval",
  "auto_send",
]);

export const ConversationCreateSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().min(1).optional(),
  candidateId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  channel: MessageChannelSchema.default("manual"),
  provider: ConversationProviderSchema.optional(),
  status: z.enum(["open", "pending_ai", "pending_human", "closed"]).optional(),
  assignedAgentId: z.string().optional(),
  assignedRecruiterId: z.string().optional(),
  lastMessageAt: z.number().optional(),
  unreadCount: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  aiMode: AiModeSchema.optional(),
});

export const MessageCreateSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().min(1).optional(),
  conversationId: z.string().min(1),
  candidateId: z.string().optional(),
  channel: MessageChannelSchema.default("manual"),
  provider: ConversationProviderSchema.optional(),
  direction: z.enum(["inbound", "outbound"]),
  body: z.string().min(1, "El mensaje no puede estar vacio"),
  sender: z.string().default("user"),
  status: z.enum(["draft", "pending_approval", "sent", "delivered", "read", "failed"]).optional(),
  providerMessageId: z.string().optional(),
  sentAt: z.number().optional(),
  deliveredAt: z.number().optional(),
  readAt: z.number().optional(),
  failedReason: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  aiAgentId: z.string().optional(),
  aiConfidence: z.number().min(0).max(1).optional(),
  intent: z.string().optional(),
  sentiment: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().optional(),
  dedupeKey: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  contactName: z.string().optional(),
  aiMode: AiModeSchema.optional(),
});

export const AiDraftRequestSchema = z.object({
  companyId: z.string().min(1).optional(),
  conversationId: z.string().min(1),
  candidate: CandidateSchema.partial().optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  agentPrompt: z.string().optional(),
  customInstruction: z.string().optional(),
  approvalMode: z.enum(["suggest", "auto_with_approval", "auto_send"]).optional(),
});

export const StructuredAiOutputSchema = z.object({
  reply: z.string().min(1),
  intent: z.enum([
    "greeting",
    "ask_vacancy",
    "ask_requirements",
    "schedule_interview",
    "salary_question",
    "location_question",
    "general_followup",
  ]),
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
  nextStage: z.string().optional(),
  requiresApproval: z.boolean(),
  escalationReason: z.string().optional(),
});

export const MessageApprovalSchema = z.object({
  sendNow: z.boolean().optional(),
  reason: z.string().optional(),
});

export type CandidateType = z.infer<typeof CandidateSchema>;
export type GeminiReplyRequestType = z.infer<typeof GeminiReplyRequestSchema>;
export type AgentReplyRequestType = z.infer<typeof AgentReplyRequestSchema>;
export type AudioTranscriptionRequestType = z.infer<typeof AudioTranscriptionRequestSchema>;
export type IntegrationTestType = z.infer<typeof IntegrationTestSchema>;
export type FacebookAdsAnalyzeType = z.infer<typeof FacebookAdsAnalyzeSchema>;
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;
