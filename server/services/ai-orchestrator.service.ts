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

const extractCandidateFacts = (history: ChatMessage[]): string => {
  const outbound = history.filter((m) => m.sender === "me").map((m) => m.body || m.text || "");
  const inbound = history.filter((m) => m.sender !== "me").map((m) => m.body || m.text || "");
  const all = inbound.join(" ").toLowerCase();

  const facts: string[] = [];

  const nameMatch = all.match(/(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i);
  if (nameMatch) facts.push(`Nombre del candidato: ${nameMatch[1]}`);

  const ageMatch = all.match(/\b(1[6-9]|[2-5][0-9])\s*a[ñn]os?\b/i);
  if (ageMatch) facts.push(`Edad: ${ageMatch[1]} años`);

  if (/disponible|puedo iniciar|cuando quieran|de inmediato/.test(all)) facts.push("Disponibilidad: inmediata");
  if (/no tengo exp|sin exp|primera vez|reci[eé]n egres/.test(all)) facts.push("Experiencia: sin experiencia previa");
  if (/turno\s*(matutino|ma[ñn]ana)|de\s*d[ií]a/.test(all)) facts.push("Turno preferido: matutino");
  if (/turno\s*(vespertino|tarde)/.test(all)) facts.push("Turno preferido: vespertino");
  if (/turno\s*nocturno|de\s*noche/.test(all)) facts.push("Turno preferido: nocturno");

  const cityMatch = all.match(/(?:en|de|vivo en|estoy en)\s+([\wáéíóúñÁÉÍÓÚÑ]+(?:\s+[\wáéíóúñÁÉÍÓÚÑ]+)?)\s*(?:,|\.|\n|$)/i);
  if (cityMatch) facts.push(`Ciudad/zona: ${cityMatch[1]}`);

  const alreadyAsked = new Set<string>();
  for (const msg of outbound) {
    const q = msg.match(/¿([^?]+\?)/)?.[1];
    if (q) alreadyAsked.add(q.trim().toLowerCase().slice(0, 50));
  }
  if (alreadyAsked.size) {
    facts.push(`Preguntas ya realizadas: ${[...alreadyAsked].slice(0, 4).join(" | ")}`);
  }

  return facts.length ? facts.join("\n") : "Sin datos confirmados del candidato aún.";
};

const extractRecentAgentOpenings = (history: ChatMessage[]): string[] => {
  return history
    .filter((m) => m.sender === "me")
    .slice(-6)
    .map((m) => {
      const text = (m.body || m.text || "").trim();
      return text.split(/[\n.!]/)[0].trim().toLowerCase().slice(0, 60);
    })
    .filter(Boolean);
};

const buildAgentPrompt = (
  input: AiDraftInput,
  history: ChatMessage[],
  firstContact: boolean,
  memoryContext?: string
) => {
  const agentName = input.agentName || "Agente de Heavenly Dreams";
  const lastInbound = [...history].reverse().find((message) => message.sender !== "me");
  const turnCount = history.filter((m) => m.sender === "me").length;
  const currentHour = new Date().getHours();

  const greetingVariants = currentHour < 12
    ? ["¡Buenos días!", "Buen día,", "Hola, buenos días."]
    : currentHour < 19
      ? ["¡Buenas tardes!", "Buenas tardes,", "Hola, buenas tardes."]
      : ["¡Buenas noches!", "Buenas noches,", "Hola, buenas noches."];
  const greeting = greetingVariants[Math.floor(Math.random() * greetingVariants.length)];

  const recentOpenings = extractRecentAgentOpenings(history);
  const antiRepetitionBlock = recentOpenings.length
    ? `\nFRASES YA USADAS — NO repetir ni comenzar igual:\n${recentOpenings.map((p) => `- "${p}..."`).join("\n")}\n`
    : "";

  const candidateFacts = extractCandidateFacts(history);

  const conversationPhase =
    firstContact
      ? `PRIMER CONTACTO: Saluda con "${greeting}", preséntate como ${agentName} y haz UNA sola pregunta para conocer al candidato. Máximo 2-3 líneas.`
      : turnCount < 4
        ? "CONVERSACIÓN INICIAL: El candidato acaba de llegar. Sé cálido, recoge información básica de a una pregunta por mensaje."
        : turnCount < 10
          ? "CONVERSACIÓN EN CURSO: Ya te conocen. Ve directo al punto, sin reintroducirte. Avanza al siguiente paso del proceso."
          : "CONVERSACIÓN AVANZADA: Conoces bien al candidato. Habla de tú a tú, usa su nombre si lo sabes, cierra con acción concreta.";

  return `
PERSONALIDAD Y ESTILO:
${input.agentPrompt || "Eres un reclutador experto de Heavenly Dreams. Hablas como una persona real: cálido, directo, sin rodeos. Tu tono es profesional pero cercano, como un colega confiable."}

Identidad: ${agentName} | Empresa: Heavenly Dreams

FASE ACTUAL: ${conversationPhase}
${antiRepetitionBlock}
LO QUE YA SABES DEL CANDIDATO:
${candidateFacts}

REGLAS DE CONVERSACIÓN NATURAL:
- Escribe como una persona real, no como un bot de atención.
- Varía la longitud: a veces 1 línea, a veces 3. Nunca rígido.
- No uses saludos genéricos si ya llevas varios mensajes.
- No hagas más de UNA pregunta por mensaje.
- No repitas información que ya diste antes.
- Si el candidato comparte algo personal (nervios, situación difícil), reconócelo brevemente antes de continuar.
- Usa el nombre del candidato cuando lo sepas, sin abusar.
- Responde SOLO a lo que preguntaron, no adelantes temas no mencionados.
- Nunca inventes datos: sueldo, dirección, fechas exactas, promesas de contratación.

MODELO OPERATIVO:
${HDRS_SERVER_PROMPT_CONTEXT}

${HDRS_SCORE_GUIDE}

${memoryContext || ""}

MENSAJE ACTUAL DEL CANDIDATO:
${lastInbound?.body || lastInbound?.text || input.customInstruction || "Inicia conversación."}
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
