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
  candidateId: string;
  channel: "whatsapp" | "email" | "messenger" | "instagram" | "manual";
  direction: "inbound" | "outbound";
  body: string;
  sender: string;
  status: "sent" | "delivered" | "read" | "failed" | "pending_approval";
  createdAt: number;
  attachmentType?: "audio" | "image" | "file";
  audioBase64?: string;
  audioMimeType?: string;
  audioFileName?: string;
  transcription?: string;
  transcriptionStatus?: "pending" | "completed" | "failed";
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  actions: string[];
  conditions?: any[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  candidateId?: string;
  createdAt: number;
}

export interface Agent {
  id: string;
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

