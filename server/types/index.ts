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

export interface GeminiReplyRequest {
  candidate?: Candidate;
  agentPrompt?: string;
  history?: ChatMessage[];
  customUserPrompt?: string;
}

export interface AgentReplyRequest {
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
  iat?: number;
  exp?: number;
}
