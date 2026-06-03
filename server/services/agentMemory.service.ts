import { ChatMessage } from "../types";
import { AGENT_TRAINING_MEMORIES } from "../config/agentTrainingKnowledge";
import { readRuntimeCollection, writeRuntimeCollection } from "./runtimeStore.service";

const AGENT_MEMORY_FILE = "agent-memory.json";
const MAX_AGENT_MEMORIES = Number(process.env.AGENT_MEMORY_MAX_RECORDS || 1000);
const MAX_RELEVANT_MEMORIES = Number(process.env.AGENT_MEMORY_CONTEXT_LIMIT || 8);

export type AgentMemoryRecord = {
  id: string;
  companyId: string;
  agentId: string;
  agentName: string;
  source: string;
  channel?: string;
  intent: string;
  lesson: string;
  userText: string;
  reply: string;
  fingerprint: string;
  uses: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
};

type MemoryLookupInput = {
  companyId: string;
  agentId?: string;
  agentName?: string;
  userPrompt: string;
  conversationHistory?: ChatMessage[];
  limit?: number;
};

type MemoryWriteInput = {
  companyId: string;
  agentId?: string;
  agentName?: string;
  source?: string;
  userText: string;
  reply: string;
  conversationHistory?: ChatMessage[];
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const stableAgentId = (agentId?: string, agentName?: string) =>
  (agentId || agentName || "agent-default")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "agent-default";

const compact = (value: string, max = 700) => value.trim().replace(/\s+/g, " ").slice(0, max);

const keywords = (value: string) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter((word) => word.length >= 4)
      .filter((word) => !["para", "como", "este", "esta", "tengo", "quiero", "puedo", "hola"].includes(word))
      .slice(0, 30)
  );

const detectIntent = (value: string) => {
  const text = normalize(value);
  if (/reagendar|cambiar|no puedo asistir|otro horario/.test(text)) return "reagendar entrevista";
  if (/entrevista|cita|agenda|horario/.test(text)) return "agendar entrevista";
  if (/sueldo|salario|pago|prestacion|comision/.test(text)) return "pregunta de compensacion";
  if (/requisito|documento|ine|curp|papel/.test(text)) return "requisitos/documentos";
  if (/ubicacion|direccion|zona|donde|ciudad/.test(text)) return "ubicacion";
  if (/vacante|empleo|trabajo|puesto|area|contratando/.test(text)) return "interes en vacante";
  if (/hola|buenas|info|informacion/.test(text)) return "primer contacto";
  return "seguimiento general";
};

const detectChannel = (value: string) => {
  const text = normalize(value);
  if (/whatsapp/.test(text)) return "WhatsApp";
  if (/instagram/.test(text)) return "Instagram";
  if (/facebook|messenger/.test(text)) return "Meta";
  if (/tiktok/.test(text)) return "TikTok";
  if (/indeed|computrabajo|occ/.test(text)) return "Bolsa de trabajo";
  return undefined;
};

const fingerprintFor = (agentId: string, intent: string, userText: string) => {
  const signature = normalize(userText).split(" ").slice(0, 18).join(" ");
  return `${agentId}:${intent}:${signature}`.slice(0, 220);
};

const buildLesson = (input: MemoryWriteInput, intent: string) => {
  const text = normalize(input.userText);
  const shouldAskOneThing = /edad|nombre|ubicacion|vacante|correo|telefono/.test(text);
  const shouldEscalate = /legal|queja|demanda|contrato|pago exacto|salario exacto|documento oficial/.test(text);
  const action = shouldEscalate
    ? "es mejor escalar o pedir confirmacion humana antes de prometer datos"
    : shouldAskOneThing
      ? "funciona pedir un solo dato faltante y mantener la respuesta breve"
      : "funciona responder con contexto, sin repetir plantillas, y avanzar al siguiente paso";

  return `${input.source || "interaccion"}: para "${intent}", ${action}. Referencia: candidato dijo "${compact(input.userText, 180)}" y el agente respondio "${compact(input.reply, 220)}".`;
};

async function readMemories() {
  return readRuntimeCollection<AgentMemoryRecord>(AGENT_MEMORY_FILE);
}

function readTrainingMemories(): AgentMemoryRecord[] {
  return AGENT_TRAINING_MEMORIES as AgentMemoryRecord[];
}

async function writeMemories(memories: AgentMemoryRecord[]) {
  await writeRuntimeCollection(AGENT_MEMORY_FILE, memories.slice(0, MAX_AGENT_MEMORIES));
}

export async function listAgentMemories(companyId: string, agentId?: string) {
  const normalizedAgentId = agentId ? stableAgentId(agentId) : undefined;
  const memories = [...readTrainingMemories(), ...(await readMemories())];
  return memories
    .filter((memory) => memory.companyId === companyId)
    .filter((memory) => !normalizedAgentId || memory.agentId === normalizedAgentId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getRelevantAgentMemories(input: MemoryLookupInput) {
  const agentId = stableAgentId(input.agentId, input.agentName);
  const runtimeMemories = await readMemories();
  const all = [...readTrainingMemories(), ...runtimeMemories];
  const promptKeywords = keywords([
    input.userPrompt,
    ...(input.conversationHistory || []).slice(-6).map((message) => message.body || message.text || ""),
  ].join(" "));
  const promptIntent = detectIntent(input.userPrompt);

  const scored = all
    .filter((memory) => memory.companyId === input.companyId)
    .filter((memory) => memory.agentId === agentId || memory.agentName === input.agentName)
    .map((memory) => {
      const memoryKeywords = keywords(`${memory.intent} ${memory.lesson} ${memory.userText}`);
      let score = memory.intent === promptIntent ? 8 : 0;
      for (const word of promptKeywords) {
        if (memoryKeywords.has(word)) score += 1;
      }
      score += Math.min(4, memory.uses);
      return { memory, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.memory.updatedAt - a.memory.updatedAt)
    .slice(0, input.limit || MAX_RELEVANT_MEMORIES)
    .map((item) => item.memory);

  if (scored.length) {
    const now = Date.now();
    const ids = new Set(
      scored
        .filter((memory) => !memory.id.startsWith("training-"))
        .map((memory) => memory.id)
    );
    if (!ids.size) return scored;
    await writeMemories(
      runtimeMemories.map((memory) =>
        ids.has(memory.id)
          ? { ...memory, uses: memory.uses + 1, lastUsedAt: now, updatedAt: now }
          : memory
      )
    );
  }

  return scored;
}

export function formatAgentMemoryContext(memories: AgentMemoryRecord[]) {
  if (!memories.length) {
    return "Memoria persistente del agente: sin aprendizajes previos relevantes.";
  }

  return `Memoria persistente del agente:
${memories.map((memory, index) => `${index + 1}. Intencion: ${memory.intent}
Leccion: ${memory.lesson}
Canal/fuente: ${memory.channel || "general"} / ${memory.source}
Ultimo uso: ${memory.lastUsedAt ? new Date(memory.lastUsedAt).toISOString() : "sin uso previo"}`).join("\n\n")}

Usa estas lecciones como contexto. No las repitas palabra por palabra: adapta la respuesta al candidato actual.`;
}

export async function rememberAgentInteraction(input: MemoryWriteInput) {
  const userText = compact(input.userText, 900);
  const reply = compact(input.reply, 900);
  if (!userText || !reply || /error|no se pudo|ocurri[oó] un error/i.test(reply)) {
    return null;
  }

  const agentId = stableAgentId(input.agentId, input.agentName);
  const agentName = input.agentName || agentId;
  const intent = detectIntent(`${userText}\n${reply}`);
  const fingerprint = fingerprintFor(agentId, intent, userText);
  const now = Date.now();
  const memories = await readMemories();
  const existing = memories.find(
    (memory) =>
      memory.companyId === input.companyId &&
      memory.agentId === agentId &&
      memory.fingerprint === fingerprint
  );

  const record: AgentMemoryRecord = {
    id: existing?.id || `mem-${crypto.randomUUID()}`,
    companyId: input.companyId,
    agentId,
    agentName,
    source: input.source || "agent-reply",
    channel: detectChannel(userText),
    intent,
    lesson: buildLesson(input, intent),
    userText,
    reply,
    fingerprint,
    uses: existing?.uses || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastUsedAt: existing?.lastUsedAt,
  };

  const next = existing
    ? memories.map((memory) => (memory.id === existing.id ? record : memory))
    : [record, ...memories];

  await writeMemories(next.sort((a, b) => b.updatedAt - a.updatedAt));
  return record;
}

export async function clearAgentMemories(companyId: string, agentId?: string) {
  const normalizedAgentId = agentId ? stableAgentId(agentId) : undefined;
  const memories = await readMemories();
  const remaining = memories.filter(
    (memory) => memory.companyId !== companyId || (normalizedAgentId && memory.agentId !== normalizedAgentId)
  );
  const removed = memories.length - remaining.length;
  await writeMemories(remaining);
  return { removed };
}
