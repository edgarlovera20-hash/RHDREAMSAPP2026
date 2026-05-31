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
  "facebook_ads",
]);

export const IntegrationTestSchema = z.object({
  provider: IntegrationProviderSchema,
  config: z.record(z.string(), z.string()).optional(),
});

export const JobBoardWebhookSchema = z.object({
  provider: z.enum(["indeed", "computrabajo"]),
  payload: z.record(z.string(), z.any()).default({}),
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

export type CandidateType = z.infer<typeof CandidateSchema>;
export type GeminiReplyRequestType = z.infer<typeof GeminiReplyRequestSchema>;
export type AgentReplyRequestType = z.infer<typeof AgentReplyRequestSchema>;
export type AudioTranscriptionRequestType = z.infer<typeof AudioTranscriptionRequestSchema>;
export type IntegrationTestType = z.infer<typeof IntegrationTestSchema>;
export type FacebookAdsAnalyzeType = z.infer<typeof FacebookAdsAnalyzeSchema>;
