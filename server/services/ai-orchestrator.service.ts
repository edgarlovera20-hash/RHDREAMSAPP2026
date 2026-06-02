import { z } from "zod";
import { ChatMessage } from "../types";
import { StructuredAiOutputSchema } from "../validators/schemas";
import { appendAuditLog } from "./audit-log.service";
import { DEFAULT_COMPANY_ID, getConversation } from "./conversation.service";
import { createMessage, listMessages } from "./message.service";
import { getGeminiService } from "./gemini.service";
import { HDRS_SERVER_PROMPT_CONTEXT, HDRS_SCORE_GUIDE } from "../config/hdrs.config";
import {
  formatAgentMemoryContext,
  getRelevantAgentMemories,
  rememberAgentInteraction,
} from "./agentMemory.service";

type AiDraftInput = {
  companyId?: string;
  conversationId: string;
  candidate?: {
    name?: string;
    role?: string;
    location?: string;
    experience?: string;
    salaryDemand?: string;
    notes?: string;
  };
  agentId?: string;
  agentName?: string;
  agentPrompt?: string;
  customInstruction?: string;
  approvalMode?: "suggest" | "auto_with_approval" | "auto_send";
};

type StructuredAiOutput = z.infer<typeof StructuredAiOutputSchema>;

const inferIntent = (text: string): StructuredAiOutput["intent"] => {
  const value = text.toLowerCase();
  if (/entrevista|cita|agenda|horario/.test(value)) return "schedule_interview";
  if (/vacante|empleo|trabajo|puesto|area/.test(value)) return "ask_vacancy";
  if (/document|requisito|ine|curp|papel/.test(value)) return "ask_requirements";
  if (/sueldo|salario|pago|prestacion/.test(value)) return "salary_question";
  if (/ubicacion|direccion|zona|donde/.test(value)) return "location_question";
  if (/hola|buenas|info|informacion/.test(value)) return "greeting";
  return "general_followup";
};

const needsHumanApproval = (reply: string, intent: StructuredAiOutput["intent"], confidence: number) => {
  if (confidence < 0.78) return true;
  if (["salary_question", "ask_requirements"].includes(intent)) return true;
  return /rechaz|contrato|legal|demanda|menor|datos personales|documento oficial/i.test(reply);
};

const buildAgentPrompt = (
  input: AiDraftInput,
  history: ChatMessage[],
  firstContact: boolean,
  memoryContext?: string
) => {
  const agentName = input.agentName || "Agente de Heavenly Dreams";
  const lastInbound = [...history].reverse().find((message) => message.sender !== "me");
  const currentHour = new Date().getHours();
  const greeting =
    currentHour >= 6 && currentHour <= 11
      ? "Hola, buenos dias."
      : currentHour >= 12 && currentHour <= 18
        ? "Hola, buenas tardes."
        : "Hola, buenas noches.";

  const firstContactInstruction = firstContact
    ? `Si es tu primer mensaje, saluda segun la hora con "${greeting}", di que eres ${agentName}, ofrece ayuda de reclutamiento y haz una sola pregunta para iniciar. No copies una plantilla fija.`
    : "Continua la conversacion de forma natural segun el ultimo mensaje.";

  return `
${input.agentPrompt || "Eres un agente de reclutamiento de Heavenly Dreams. Atiendes candidatos con claridad, calidez y precision."}

Identidad visible del agente: ${agentName}

Modelo operativo obligatorio:
${HDRS_SERVER_PROMPT_CONTEXT}

${HDRS_SCORE_GUIDE}

Reglas operativas:
- Responde en espanol, breve y humano.
- Crea cada respuesta desde cero; no uses plantillas ni mensajes fijos.
- Haz solo una pregunta por mensaje.
- No inventes sueldo, horarios, direccion, requisitos ni promesas de contratacion.
- Si faltan datos, pide el siguiente dato minimo.
- Si el tema es sensible o requiere autorizacion, pide continuar con un reclutador humano.

${firstContactInstruction}

${memoryContext || "Memoria persistente del agente: sin aprendizajes previos relevantes."}

Ultimo mensaje del candidato:
${lastInbound?.body || lastInbound?.text || input.customInstruction || "Sin mensaje entrante registrado."}
  `.trim();
};

export async function createAiDraft(input: AiDraftInput, actorId?: string) {
  const companyId = input.companyId || DEFAULT_COMPANY_ID;
  const conversation = await getConversation(input.conversationId, companyId);
  if (!conversation) {
    throw new Error("Conversacion no encontrada.");
  }

  const messages = await listMessages(companyId, { conversationId: conversation.id });
  const history: ChatMessage[] = messages.map((message) => ({
    sender: message.direction === "outbound" ? "me" : "user",
    body: message.body,
    text: message.body,
  }));
  const firstContact = !messages.some((message) => message.direction === "outbound");
  const lastUserMessage =
    input.customInstruction ||
    [...messages].reverse().find((message) => message.direction === "inbound")?.body ||
    "Inicia una conversacion de reclutamiento y ofrece ayuda.";
  const memories = await getRelevantAgentMemories({
    companyId,
    agentId: input.agentId || conversation.assignedAgentId,
    agentName: input.agentName,
    userPrompt: lastUserMessage,
    conversationHistory: history,
  });
  const memoryContext = formatAgentMemoryContext(memories);

  const geminiService = getGeminiService();
  const result = await geminiService.generateCandidateResponse(
    input.candidate as any,
    buildAgentPrompt(input, history, firstContact, memoryContext),
    history,
    lastUserMessage
  );

  const intent = inferIntent(`${lastUserMessage}\n${result.reply}`);
  const confidence = intent === "general_followup" ? 0.82 : 0.9;
  const requiresApproval =
    input.approvalMode !== "auto_send" ||
    needsHumanApproval(result.reply, intent, confidence);
  const structured = StructuredAiOutputSchema.parse({
    reply: result.reply,
    intent,
    confidence,
    sentiment: "neutral",
    nextStage: intent === "schedule_interview" ? "Cita sugerida" : undefined,
    requiresApproval,
    escalationReason: requiresApproval ? "Revision humana antes de enviar" : undefined,
  });

  const draftMessage = await createMessage({
    companyId,
    conversationId: conversation.id,
    candidateId: conversation.candidateId,
    channel: conversation.channel,
    provider: conversation.provider,
    direction: "outbound",
    sender: "me",
    body: structured.reply,
    status: structured.requiresApproval ? "pending_approval" : "sent",
    aiGenerated: true,
    aiAgentId: input.agentId,
    aiConfidence: structured.confidence,
    intent: structured.intent,
    sentiment: structured.sentiment,
    requiresApproval: structured.requiresApproval,
  }, actorId);
  await rememberAgentInteraction({
    companyId,
    agentId: input.agentId || conversation.assignedAgentId,
    agentName: input.agentName,
    source: "conversation-ai-draft",
    userText: lastUserMessage,
    reply: structured.reply,
    conversationHistory: history,
  });

  await appendAuditLog({
    companyId,
    action: "ai.draft.created",
    actorId,
    entityType: "ai",
    entityId: draftMessage.id,
    metadata: {
      conversationId: conversation.id,
      intent: structured.intent,
      confidence: structured.confidence,
      requiresApproval: structured.requiresApproval,
    },
  });

  return {
    conversation,
    message: draftMessage,
    decision: structured,
  };
}
