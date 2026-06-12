// RH_AGENT — candidate analysis only. NEVER hires, rejects, or issues offers without human approval.
import { randomUUID } from "crypto";

export interface RhAgentInput {
  type: "candidate_summary" | "interview_prep" | "vacancy_analysis";
  candidateId?: string;
  vacancyId?: string;
}

export interface RhAgentResult {
  agentId: "RH_AGENT";
  correlationId: string;
  actorType: "agent";
  input: RhAgentInput;
  output: Record<string, unknown>;
  timestamp: string;
}

const FORBIDDEN_ACTIONS = ["hire_candidate", "reject_candidate", "issue_offer", "bypass_rbac", "access_crm_data"];
const PERMITTED_ACTIONS = ["candidate_summary", "interview_prep", "vacancy_analysis"];

export function runRhAgent(input: RhAgentInput, actorId: string): RhAgentResult {
  const correlationId = randomUUID();
  if (!PERMITTED_ACTIONS.includes(input.type)) {
    console.warn(`[RH_AGENT] FORBIDDEN action: ${input.type} actor=${actorId} correlationId=${correlationId}`);
    throw new Error(`RH_AGENT: action '${input.type}' not permitted. Forbidden: ${FORBIDDEN_ACTIONS.join(", ")}`);
  }
  console.log(`[AUDIT STUB] RH_AGENT action=${input.type} actorId=${actorId} actorType=agent correlationId=${correlationId} platform=HD-RH severity=info`);
  return {
    agentId: "RH_AGENT",
    correlationId,
    actorType: "agent",
    input,
    output: {
      analysis: `RH_AGENT stub: ${input.type} completed`,
      requiresHumanApproval: true,
      note: "RH_AGENT never hires, rejects, or issues offers autonomously.",
    },
    timestamp: new Date().toISOString(),
  };
}
