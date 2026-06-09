export const DEFAULT_COMPANY_ID = "heavenly-dreams";

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  stage: string;
  source: string;
  rating: number;
  location: string;
  pool: string;
  experience: string;
  salaryDemand: string;
  cvUrl: string;
  notes: string;
  jobId?: string;
  companyId?: string;
  createdAt: number;
  updatedAt: number;
  assignedAgentId?: string;
  tags?: string[];
  visitReason?: string;
  onboarding?: {
    processStage?: string;
    ddoDate?: string;
    firstDayDate?: string;
    inventoryDelivered?: boolean;
    materialsDelivered?: boolean;
    uniformDelivered?: boolean;
    folderDelivered?: boolean;
    salesCount?: number;
    attendanceCount?: number;
    wellbeingScore?: number;
    followUpNotes?: string;
    lastFollowUpAt?: number;
  };
  
  // Extension fields used by advanced candidate views.
  experienceTime?: string;
  linkedin?: string;
  age?: string;
  lastJob?: string;
  whatsapp?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Draft" | "Active" | "Closed" | "Pausada";
  description: string;
  requirements: string[];
  salaryRange?: string;
  sourceChannels?: string[];
  companyId?: string;
  applicants: number;
  platforms: string[];
  createdAt: number;
  updatedAt: number;
  // Rich description fields used in the Jobs form
  targetProfile?: string;
  ageRange?: string;
  experience?: string;
  education?: string;
  responsibilities?: string;
  offer?: string;
  schedule?: string;
  benefits?: string;
  agentInstructions?: string;
}

export interface Appointment {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  companyId?: string;
  date: string;
  time: string;
  status: "scheduled" | "confirmed" | "attended" | "no_show" | "rescheduled";
  calendarEventId?: string;
  meetingLink?: string;
  notes?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  companyId?: string;
  conversationId?: string;
  candidateId: string;
  channel: "whatsapp" | "email" | "messenger" | "instagram" | "facebook" | "manual";
  direction: "inbound" | "outbound";
  body: string;
  sender: string;
  status: "draft" | "pending_approval" | "sent" | "delivered" | "read" | "failed";
  createdAt: number;
  updatedAt?: number;
  provider?: "baileys" | "meta" | "gmail" | "manual";
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
  attachmentType?: "audio" | "image" | "file";
  audioBase64?: string;
  audioMimeType?: string;
  audioFileName?: string;
  transcription?: string;
  transcriptionStatus?: "pending" | "completed" | "failed";
}

export interface Conversation {
  id: string;
  companyId: string;
  candidateId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  channel: "whatsapp" | "instagram" | "messenger" | "facebook" | "email" | "manual";
  provider: "baileys" | "meta" | "gmail" | "manual";
  status: "open" | "pending_ai" | "pending_human" | "closed";
  assignedAgentId?: string;
  assignedRecruiterId?: string;
  lastMessageAt: number;
  unreadCount: number;
  tags: string[];
  aiMode: "off" | "suggest" | "auto_with_approval" | "auto_send";
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowRun {
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

export interface Automation {
  id: string;
  companyId?: string;
  name: string;
  trigger: string;
  active: boolean;
  actions: string[];
  conditions?: any[];
}

export interface Notification {
  id: string;
  companyId?: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  candidateId?: string;
  createdAt: number;
}

export interface Agent {
  id: string;
  companyId?: string;
  name: string;
  role: string;
  status: "Active" | "Draft";
  description: string;
  channels: string[];
  memory: string;
  conversations: number;
  successRate: string;
  avatarColor: string;
  userId: string;
  createdAt: number;
  basePrompt: string;
  personalityPrompt?: string;
  tone?: string;
  responseStyle?: string;
  escalationRules?: string;
  transcribeAudio?: boolean;
  audioAutoReply?: boolean;
  audioLanguage?: string;
}

