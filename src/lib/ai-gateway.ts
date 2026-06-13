const BASE = import.meta.env.VITE_AI_GATEWAY_URL ?? "/api/ai";

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("hd_token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AiAgent {
  id: string;
  name: string;
  module: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  allowedRoles: string[];
  requiresApproval: boolean;
  enabled: boolean;
}

export interface AiTask {
  taskId: string;
  status: "pending" | "running" | "needs_approval" | "completed" | "failed" | "cancelled";
  output?: Record<string, unknown>;
  needsApproval?: boolean;
  approvalReason?: string;
  error?: string;
  durationMs?: number;
}

export interface CandidateEvaluation {
  summary: string;
  score: number;
  recommendedRole: string;
  priority: "alta" | "media" | "baja";
  strengths: string[];
  risks: string[];
  missingData: string[];
  interviewQuestions: string[];
  whatsappMessageSuggestion: string;
  nextAction: string;
}

export const aiGateway = {
  health: () => apiCall<{ status: string; engine: string; latencyMs?: number }>("/health"),

  listAgents: () => apiCall<AiAgent[]>("/agents"),

  chat: (messages: Array<{ role: string; content: string }>, sessionId?: string) =>
    apiCall<{ content: string; model?: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ messages, sessionId }),
    }),

  runAgent: (agentId: string, instruction: string, context?: Record<string, unknown>) =>
    apiCall<AiTask>(`/agents/${agentId}/run`, {
      method: "POST",
      body: JSON.stringify({ instruction, context }),
    }),

  evaluateCandidate: async (candidate: {
    name: string;
    phone?: string;
    position?: string;
    experience?: string;
    zone?: string;
    notes?: string;
  }): Promise<{ task: AiTask; evaluation?: CandidateEvaluation }> => {
    const instruction = `Evalúa al siguiente candidato:\n${JSON.stringify(candidate, null, 2)}`;
    const task = await apiCall<AiTask>("/agents/recruitment_evaluator/run", {
      method: "POST",
      body: JSON.stringify({ instruction, context: candidate }),
    });
    let evaluation: CandidateEvaluation | undefined;
    if (task.output && typeof task.output.score === "number") {
      evaluation = task.output as unknown as CandidateEvaluation;
    } else if (task.output?.content && typeof task.output.content === "string") {
      try {
        const match = (task.output.content as string).match(/\{[\s\S]*\}/);
        if (match) evaluation = JSON.parse(match[0]) as CandidateEvaluation;
      } catch { /* ignore parse error */ }
    }
    return { task, evaluation };
  },

  suggestWhatsApp: (candidateInfo: string) =>
    apiCall<AiTask>("/agents/whatsapp_recruitment/run", {
      method: "POST",
      body: JSON.stringify({ instruction: candidateInfo }),
    }),

  approveTask: (taskId: string) =>
    apiCall<{ approved: boolean }>(`/approve-action/${taskId}`, { method: "POST" }),

  rejectTask: (taskId: string) =>
    apiCall<{ rejected: boolean }>(`/reject-action/${taskId}`, { method: "POST" }),

  searchMemory: (namespace: string, query: string) =>
    apiCall<{ results: Array<{ id: string; content: string; score?: number }> }>(
      `/memory/search?namespace=${encodeURIComponent(namespace)}&query=${encodeURIComponent(query)}`
    ),

  getAuditLog: () => apiCall<{ logs: unknown[] }>("/audit"),
};
