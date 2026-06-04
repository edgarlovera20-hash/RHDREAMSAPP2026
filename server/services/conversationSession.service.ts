import path from "path";
import fs from "fs/promises";
import { ChatMessage } from "../types";
import { logger } from "../utils/logger";
import { HDRS_SERVER_PROMPT_CONTEXT, HDRS_SCORE_GUIDE } from "../config/hdrs.config";

export type ConversationStage =
  | "WELCOME"
  | "ASK_NAME"
  | "VACANCY_SELECTION"
  | "VACANCY_INFO"
  | "PREQUALIFICATION"
  | "AGE_VALIDATION"
  | "EXPERIENCE_VALIDATION"
  | "SCORING"
  | "INTERVIEW_SCHEDULING"
  | "INTERVIEW_CONFIRMED"
  | "FOLLOW_UP"
  | "TALENT_POOL"
  | "HIRED"
  | "REJECTED";

export type ConversationIntent =
  | "GREETING"
  | "ASK_VACANCY"
  | "ASK_SALARY"
  | "ASK_SCHEDULE"
  | "ASK_LOCATION"
  | "ASK_REQUIREMENTS"
  | "SELECT_VACANCY"
  | "PROVIDE_NAME"
  | "PROVIDE_AGE"
  | "PROVIDE_EXPERIENCE"
  | "PROVIDE_AVAILABILITY"
  | "PROVIDE_TRANSPORT"
  | "PROVIDE_EDUCATION"
  | "PROVIDE_CONTACT"
  | "CONFIRM_INTERVIEW"
  | "REJECT_INTERVIEW"
  | "GOODBYE"
  | "UNKNOWN";

type MemoryMessage = {
  id: string;
  sender: "user" | "assistant";
  message: string;
  createdAt: string;
};

type HdrsScoreBreakdown = {
  experience: number;
  availability: number;
  proximity: number;
  skills: number;
  attitude: number;
  total: number;
};

export type ConversationMemory = {
  id: string;
  sessionId: string;
  contactId: string;
  phone: string;
  channel?: "WhatsApp";
  leadId?: string;
  crmStatus?: "Nuevo" | "Interesado" | "Datos Capturados" | "Evaluacion" | "Entrevista Programada" | "Talent Pool" | "Contratado" | "Rechazado";
  name?: string;
  lastName?: string;
  vacancy?: string;
  email?: string;
  city?: string;
  availability?: string;
  transport?: string;
  education?: string;
  lastJob?: string;
  timeWorked?: string;
  jobFunctions?: string;
  desiredRole?: string;
  minorDocumentation?: "pending" | "reported";
  hdrsScore?: HdrsScoreBreakdown;
  candidateScore?: number;
  candidatePriority?: "Prioridad A" | "Prioridad B" | "Prioridad C" | "Descartado";
  talentPoolCategory?: "Ventas" | "Operativos" | "Administrativos" | "Especializados";
  stage: ConversationStage;
  status: "active" | "follow_up" | "interview_confirmed" | "hired" | "rejected";
  age?: number;
  experience?: string;
  aiNotes?: string;
  lastIntent?: ConversationIntent;
  lastResponseType?: string;
  firstLeadEventAt?: string;
  createdAt: string;
  updatedAt: string;
  lastInteractionAt?: string;
  messages: MemoryMessage[];
};

type ConversationTurnInput = {
  sessionId: string;
  contactId: string;
  inboundBody: string;
  agentName: string;
  companyName: string;
};

type ConversationTurn = {
  conversation: ConversationMemory;
  intent: ConversationIntent;
  normalizedInput: string;
  firstAssistantContact: boolean;
  history: ChatMessage[];
  systemContext: string;
  userPrompt: string;
};

const CONVERSATION_ROOT = path.join(process.cwd(), ".sessions", "conversations");
const MAX_HISTORY_MESSAGES = 20;

const stageOrder: ConversationStage[] = [
  "WELCOME",
  "ASK_NAME",
  "VACANCY_SELECTION",
  "VACANCY_INFO",
  "PREQUALIFICATION",
  "AGE_VALIDATION",
  "EXPERIENCE_VALIDATION",
  "SCORING",
  "INTERVIEW_SCHEDULING",
  "INTERVIEW_CONFIRMED",
  "FOLLOW_UP",
  "TALENT_POOL",
  "HIRED",
  "REJECTED",
];

const nowIso = () => new Date().toISOString();

const getTimeGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 11) return "Hola, buenos dias.";
  if (hour >= 12 && hour <= 18) return "Hola, buenas tardes.";
  return "Hola, buenas noches.";
};

const toCrmStatus = (stage: ConversationStage, intent: ConversationIntent): ConversationMemory["crmStatus"] => {
  if (stage === "REJECTED") return "Rechazado";
  if (stage === "HIRED") return "Contratado";
  if (stage === "TALENT_POOL") return "Talent Pool";
  if (stage === "INTERVIEW_CONFIRMED" || stage === "INTERVIEW_SCHEDULING") return "Entrevista Programada";
  if (stage === "SCORING" || stage === "EXPERIENCE_VALIDATION" || stage === "AGE_VALIDATION") return "Evaluacion";
  if (stage === "VACANCY_INFO" || stage === "PREQUALIFICATION") return "Datos Capturados";
  if (stage === "VACANCY_SELECTION" || intent === "ASK_VACANCY" || intent === "SELECT_VACANCY") return "Interesado";
  return "Nuevo";
};

const safeKey = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);

const normalizePhone = (contactId: string) =>
  contactId
    .split("@")[0]
    .replace(/[^\d]/g, "")
    .trim();

const conversationId = (sessionId: string, contactId: string) =>
  `${safeKey(sessionId || "default")}__${safeKey(normalizePhone(contactId) || contactId || "unknown")}`;

const conversationPath = (sessionId: string, contactId: string) =>
  path.join(CONVERSATION_ROOT, `${conversationId(sessionId, contactId)}.json`);

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s$+.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeCandidateInput(value: string) {
  const normalized = normalizeText(value);
  if (/^(ho+a+l+a+|hol+a+|ola+|holi|buen[oa]s|buen dia|buenas tardes|buenas noches)$/.test(normalized)) {
    return "hola";
  }
  if (/^(si|sii|sip|claro|ok|va|vale|perfecto|correcto)$/.test(normalized)) {
    return "si";
  }
  return normalized;
}

export function detectIntent(message: string, stage: ConversationStage = "WELCOME"): ConversationIntent {
  const text = normalizeCandidateInput(message);
  const hasAge = /\b(1[0-9]|[2-6][0-9])\b/.test(text);

  if (!text) return "UNKNOWN";
  if (/\b(adios|gracias|muchas gracias|bye|hasta luego)\b/.test(text)) return "GOODBYE";
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(message)) return "PROVIDE_CONTACT";
  if (/^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches)$/.test(text)) return "GREETING";
  if (/^(si|ok|claro|va|vale|perfecto|confirmo|confirmado)$/.test(text)) {
    return stage === "INTERVIEW_SCHEDULING" ? "CONFIRM_INTERVIEW" : "UNKNOWN";
  }
  if (/\b(no puedo|no gracias|ya no|cancelar|rechazo|no me interesa)\b/.test(text)) return "REJECT_INTERVIEW";
  if (hasAge || /\b(tengo|edad|anos|años)\b/.test(text)) return "PROVIDE_AGE";
  if (/\b(disponible|disponibilidad|inmediato|puedo empezar|empiezo|turno|horario|tiempo completo|medio tiempo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/.test(text)) {
    return "PROVIDE_AVAILABILITY";
  }
  if (/\b(transporte|metro|metrobus|camion|camión|combi|auto|coche|moto|cerca|lejos|traslado|vivo cerca)\b/.test(text)) {
    return "PROVIDE_TRANSPORT";
  }
  if (/\b(primaria|secundaria|prepa|preparatoria|bachillerato|licenciatura|universidad|carrera|trunca|terminada|escolaridad)\b/.test(text)) {
    return "PROVIDE_EDUCATION";
  }
  if (/\b(me llamo|mi nombre es|soy)\b/.test(text) && text.split(" ").length <= 8) return "PROVIDE_NAME";
  if (/\b(experiencia|trabaje|trabajo en|he trabajado|supervise|atiendo|ventas|atencion)\b/.test(text)) {
    return "PROVIDE_EXPERIENCE";
  }
  if (/\b(supervisor|ayudante|asesor|promotor|atencion a clientes|atencion|ventas|embajador|volantero|vacante de)\b/.test(text)) {
    return "SELECT_VACANCY";
  }
  if (/\b(sueldo|pagan|pago|salario|bono|comision|cuanto gan)\b/.test(text)) return "ASK_SALARY";
  if (/\b(horario|turno|dias|descanso|hora)\b/.test(text)) return "ASK_SCHEDULE";
  if (/\b(ubicacion|direccion|donde|zona|sede|alcaldia|municipio)\b/.test(text)) return "ASK_LOCATION";
  if (/\b(requisito|documento|papeles|ine|curp|rfc|solicitan|piden)\b/.test(text)) return "ASK_REQUIREMENTS";
  if (/\b(info|informacion|empleo|trabajo|vacante|contratando|busco)\b/.test(text)) return "ASK_VACANCY";

  return "UNKNOWN";
}

const extractName = (message: string) => {
  const original = message.trim().replace(/\s+/g, " ");
  const normalized = normalizeCandidateInput(message);
  const explicit = original.match(/\b(?:me llamo|mi nombre es|soy)\s+([a-zA-ZÁÉÍÓÚÜÑáéíóúüñ ]{2,40})/i);
  if (explicit?.[1]) {
    const candidateName = explicit[1].replace(/[^\p{L}\s]/gu, "").trim();
    if (/^(de|del|la|el|en|zona)\b/i.test(candidateName)) return undefined;
    return candidateName.split(" ").slice(0, 3).join(" ");
  }
  const firstWord = original.match(/^([A-ZÁÉÍÓÚÜÑ][a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]{1,24})\b/)?.[1];
  const looksLikeVacancySelection = /\b(supervisor|ayudante|asesor|promotor|atencion|ventas|embajador|volantero|vacante|empleo|trabajo)\b/i.test(original);
  const nonNameFirstWords = new Set([
    "Hola",
    "Buenos",
    "Buenas",
    "Supervisor",
    "Ayudante",
    "Asesor",
    "Promotor",
    "Atencion",
    "Ventas",
    "Vacante",
    "Trabajo",
    "Empleo",
  ]);
  if (firstWord && looksLikeVacancySelection && !nonNameFirstWords.has(firstWord)) {
    return firstWord;
  }
  if (
    normalized.split(" ").length <= 3 &&
    !["hola", "si", "ok", "info", "informacion"].includes(normalized) &&
    /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]{2,40}$/.test(original)
  ) {
    return original.trim().split(" ").slice(0, 3).join(" ");
  }
  return undefined;
};

const splitName = (name: string | undefined) => {
  if (!name) return {};
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    name: parts.slice(0, Math.max(1, parts.length - 1)).join(" "),
    lastName: parts.length > 1 ? parts.slice(-1).join(" ") : undefined,
  };
};

const extractEmail = (message: string) => {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
};

const extractCity = (message: string) => {
  const match = message.match(/\b(?:ciudad|vivo en|soy de|estoy en|zona)\s+([a-zA-ZÁÉÍÓÚÜÑáéíóúüñ .-]{2,40})/i);
  return match?.[1]?.trim().replace(/[,.!?]+$/g, "").split(/\s+/).slice(0, 5).join(" ");
};

const extractAge = (message: string) => {
  const match = normalizeCandidateInput(message).match(/\b(1[0-9]|[2-6][0-9])\b/);
  return match ? Number(match[1]) : undefined;
};

const extractVacancy = (message: string) => {
  const text = normalizeCandidateInput(message);
  const options: Array<[RegExp, string]> = [
    [/\bsupervisor(?: de personal)?\b/, "Supervisor de Personal"],
    [/\bayudante(?: general)?\b/, "Ayudante General"],
    [/\batencion(?: a clientes)?\b/, "Atencion a Clientes"],
    [/\basesor(?: comercial)?\b|\bventas\b/, "Asesor Comercial"],
    [/\bpromotor\b/, "Promotor"],
    [/\bembajador(?: de marca)?\b/, "Embajador de Marca"],
    [/\bvolantero\b/, "Volantero"],
  ];
  return options.find(([pattern]) => pattern.test(text))?.[1];
};

const extractAvailability = (message: string) => {
  const text = normalizeCandidateInput(message);
  if (!/\b(disponible|disponibilidad|inmediato|puedo empezar|empiezo|turno|horario|tiempo completo|medio tiempo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|manana|mañana|hoy)\b/.test(text)) {
    return undefined;
  }
  return message.trim().slice(0, 180);
};

const extractTransport = (message: string) => {
  const text = normalizeCandidateInput(message);
  if (!/\b(transporte|metro|metrobus|camion|camión|combi|auto|coche|moto|cerca|lejos|traslado|vivo cerca|sin problema)\b/.test(text)) {
    return undefined;
  }
  return message.trim().slice(0, 180);
};

const extractEducation = (message: string) => {
  const text = normalizeCandidateInput(message);
  if (!/\b(primaria|secundaria|prepa|preparatoria|bachillerato|licenciatura|universidad|carrera|trunca|terminada|escolaridad)\b/.test(text)) {
    return undefined;
  }
  return message.trim().slice(0, 180);
};

const extractLastJob = (message: string) => {
  const text = normalizeCandidateInput(message);
  if (!/\b(ultimo empleo|ultimo trabajo|trabaje en|trabajaba en|mi empleo anterior|mi ultimo|experiencia)\b/.test(text)) {
    return undefined;
  }
  return message.trim().slice(0, 220);
};

const extractTimeWorked = (message: string) => {
  const match = normalizeCandidateInput(message).match(/\b(\d{1,2}\s*(?:meses|mes|anos|año|años|semanas|semana)|medio ano|medio año|un ano|un año)\b/);
  return match?.[0];
};

const extractJobFunctions = (message: string) => {
  const text = normalizeCandidateInput(message);
  if (!/\b(funciones|actividades|hacia|hacía|me encargaba|atendia|atendía|vendia|vendía|supervisaba|repartia|repartía|limpieza|caja|inventario)\b/.test(text)) {
    return undefined;
  }
  return message.trim().slice(0, 240);
};

const extractMinorDocumentation = (message: string) => {
  const text = normalizeCandidateInput(message);
  return /\b(carta responsiva|permiso|tutor|tutora|ine de mi|ine del tutor|acta|comprobante|mis papas|mi mama|mi papa|padre|madre)\b/.test(text)
    ? "reported" as const
    : undefined;
};

const clampScore = (score: number) => Math.max(0, Math.min(20, Math.round(score)));

const scoreHdrsCandidate = (conversation: ConversationMemory, latestMessage: string): HdrsScoreBreakdown => {
  const text = normalizeCandidateInput([
    latestMessage,
    conversation.vacancy,
    conversation.experience,
    conversation.availability,
    conversation.transport,
    conversation.education,
    conversation.jobFunctions,
  ].filter(Boolean).join(" "));

  if (conversation.age !== undefined && conversation.age < 16) {
    return { experience: 0, availability: 0, proximity: 0, skills: 0, attitude: 0, total: 0 };
  }

  let experience = conversation.experience || conversation.lastJob ? 12 : 5;
  if (/\b(experiencia|trabaje|trabajaba|supervisaba|ventas|atencion|caja|inventario|ayudante|promotor)\b/.test(text)) experience += 5;
  if (conversation.timeWorked) experience += 2;

  let availability = conversation.availability ? 13 : 6;
  if (/\b(inmediato|hoy|manana|mañana|tiempo completo|disponible)\b/.test(text)) availability += 6;
  if (/\b(no puedo|solo fines|limitado)\b/.test(text)) availability -= 4;

  let proximity = conversation.city || conversation.transport ? 12 : 6;
  if (/\b(cerca|sin problema|metro|metrobus|transporte|auto|moto|iztapalapa|tlahuac|nezahualcoyotl)\b/.test(text)) proximity += 6;
  if (/\b(lejos|muy lejos|no tengo transporte)\b/.test(text)) proximity -= 4;

  let skills = conversation.vacancy ? 10 : 6;
  if (/\b(ventas|atencion|cliente|supervisor|equipo|inventario|caja|limpieza|responsable|puntual)\b/.test(text)) skills += 6;
  if (conversation.education) skills += 2;

  let attitude = 11;
  if (/\b(me interesa|si|claro|disponible|gracias|por favor|quiero|puedo)\b/.test(text)) attitude += 5;
  if (conversation.name && conversation.vacancy) attitude += 2;
  if (/\b(no gracias|no me interesa|cancelar|ya no)\b/.test(text)) attitude -= 6;

  const breakdown = {
    experience: clampScore(experience),
    availability: clampScore(availability),
    proximity: clampScore(proximity),
    skills: clampScore(skills),
    attitude: clampScore(attitude),
    total: 0,
  };
  breakdown.total = breakdown.experience + breakdown.availability + breakdown.proximity + breakdown.skills + breakdown.attitude;
  return breakdown;
};

const classifyPriority = (score: number): ConversationMemory["candidatePriority"] => {
  if (score >= 90) return "Prioridad A";
  if (score >= 70) return "Prioridad B";
  if (score >= 50) return "Prioridad C";
  return "Descartado";
};

const classifyTalentPool = (conversation: ConversationMemory): ConversationMemory["talentPoolCategory"] => {
  const text = normalizeCandidateInput([
    conversation.vacancy,
    conversation.desiredRole,
    conversation.experience,
    conversation.jobFunctions,
  ].filter(Boolean).join(" "));
  if (/\b(ventas|asesor|promotor|embajador|cliente)\b/.test(text)) return "Ventas";
  if (/\b(admin|capturista|oficina|recepcion|archivo|datos)\b/.test(text)) return "Administrativos";
  if (/\b(tecnico|especialista|licenciatura|ingenieria|programador|diseno|diseño)\b/.test(text)) return "Especializados";
  return "Operativos";
};

const isPrequalificationComplete = (conversation: ConversationMemory) =>
  Boolean(
    conversation.name &&
      conversation.vacancy &&
      conversation.age !== undefined &&
      conversation.email &&
      conversation.city &&
      conversation.availability &&
      conversation.transport &&
      conversation.education &&
      conversation.experience
  );

const nextHdrsField = (conversation: ConversationMemory) => {
  if (!conversation.email) return "correo electronico";
  if (!conversation.city) return "ciudad o zona donde vive";
  if (!conversation.availability) return "disponibilidad de horario e inicio";
  if (!conversation.transport) return "medio de transporte o facilidad de traslado";
  if (!conversation.education) return "escolaridad";
  if (!conversation.experience) return "ultimo empleo o experiencia relacionada";
  if (!conversation.jobFunctions) return "funciones principales de su ultimo empleo";
  return "disponibilidad para entrevista";
};

const inferStage = (conversation: ConversationMemory, intent: ConversationIntent): ConversationStage => {
  if (conversation.status === "rejected") return "REJECTED";
  if (conversation.status === "interview_confirmed") return "INTERVIEW_CONFIRMED";
  if (conversation.age !== undefined && conversation.age < 16) return "REJECTED";
  if ((conversation.age === 16 || conversation.age === 17) && conversation.minorDocumentation !== "reported") return "AGE_VALIDATION";
  if (intent === "GOODBYE") return "FOLLOW_UP";
  if (intent === "CONFIRM_INTERVIEW") return "INTERVIEW_CONFIRMED";
  if (intent === "REJECT_INTERVIEW") return "FOLLOW_UP";
  if (!conversation.name) return "ASK_NAME";
  if (!conversation.vacancy) return "VACANCY_SELECTION";
  if (["ASK_VACANCY", "ASK_SALARY", "ASK_SCHEDULE", "ASK_LOCATION", "ASK_REQUIREMENTS", "SELECT_VACANCY"].includes(intent)) {
    return "VACANCY_INFO";
  }
  if (conversation.age === undefined) return "AGE_VALIDATION";
  if (!isPrequalificationComplete(conversation)) return "PREQUALIFICATION";
  if ((conversation.candidateScore || 0) < 50) return "TALENT_POOL";
  if (stageOrder.indexOf(conversation.stage) < stageOrder.indexOf("SCORING")) {
    return "SCORING";
  }
  if (stageOrder.indexOf(conversation.stage) < stageOrder.indexOf("INTERVIEW_SCHEDULING")) {
    return "INTERVIEW_SCHEDULING";
  }
  return conversation.stage;
};

const stageInstruction = (conversation: ConversationMemory) => {
  switch (conversation.stage) {
    case "ASK_NAME":
      return "Objetivo del siguiente mensaje: presentarte si es primer contacto, ofrecer ayuda y pedir solamente el nombre del candidato.";
    case "VACANCY_SELECTION":
      return "Objetivo del siguiente mensaje: explicar brevemente que hay vacantes y pedir cual puesto le interesa.";
    case "VACANCY_INFO":
      return "Objetivo del siguiente mensaje: responder la duda especifica sobre la vacante sin inventar datos, y avanzar al siguiente dato faltante.";
    case "PREQUALIFICATION":
      return `Objetivo del siguiente mensaje: continuar la precalificacion HDRS y pedir solamente ${nextHdrsField(conversation)}.`;
    case "AGE_VALIDATION":
      if (conversation.age !== undefined && conversation.age < 16) {
        return "Objetivo del siguiente mensaje: agradecer el interes, explicar con respeto que por edad no se puede continuar y cerrar el proceso.";
      }
      if (conversation.age === 16 || conversation.age === 17) {
        return "Objetivo del siguiente mensaje: explicar que para continuar se requiere carta responsiva, tutor legal, INE del tutor y comprobante de domicilio; pregunta si cuenta con esos documentos.";
      }
      return "Objetivo del siguiente mensaje: pedir solamente la edad del candidato.";
    case "EXPERIENCE_VALIDATION":
      return "Objetivo del siguiente mensaje: pedir solamente experiencia breve relacionada con la vacante.";
    case "SCORING":
      return "Objetivo del siguiente mensaje: resumir brevemente que el perfil va avanzando, mantener tono humano y pedir disponibilidad para entrevista.";
    case "INTERVIEW_SCHEDULING":
      return "Objetivo del siguiente mensaje: proponer avanzar a entrevista y pedir disponibilidad de dia u horario.";
    case "INTERVIEW_CONFIRMED":
      return "Objetivo del siguiente mensaje: confirmar que la entrevista quedo en seguimiento y mantener tono profesional.";
    case "FOLLOW_UP":
      return "Objetivo del siguiente mensaje: dar seguimiento sin presionar y preguntar si desea continuar.";
    case "TALENT_POOL":
      return "Objetivo del siguiente mensaje: cerrar con respeto o dejar al candidato en bolsa de talento para futuras vacantes, sin hacerlo sentir rechazado.";
    case "REJECTED":
      return "Objetivo del siguiente mensaje: cerrar con respeto, sin insistir.";
    default:
      return "Objetivo del siguiente mensaje: continuar la conversacion de reclutamiento de forma natural.";
  }
};

async function loadConversation(sessionId: string, contactId: string): Promise<ConversationMemory> {
  const filePath = conversationPath(sessionId, contactId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as ConversationMemory;
    return {
      ...parsed,
      stage: parsed.stage || "WELCOME",
      status: parsed.status || "active",
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_HISTORY_MESSAGES) : [],
    };
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      logger.warn("Could not load conversation memory; creating a fresh session", { error: error.message });
    }
    const createdAt = nowIso();
    return {
      id: conversationId(sessionId, contactId),
      sessionId,
      contactId,
      phone: normalizePhone(contactId),
      channel: "WhatsApp",
      leadId: `lead-${conversationId(sessionId, contactId)}`,
      crmStatus: "Nuevo",
      stage: "WELCOME",
      status: "active",
      firstLeadEventAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      lastInteractionAt: createdAt,
      messages: [],
    };
  }
}

async function saveConversation(conversation: ConversationMemory) {
  await fs.mkdir(CONVERSATION_ROOT, { recursive: true });
  const filePath = conversationPath(conversation.sessionId, conversation.contactId);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), { mode: 0o600 });
}

const toChatHistory = (conversation: ConversationMemory): ChatMessage[] =>
  conversation.messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    sender: message.sender === "assistant" ? "me" : "user",
    body: message.message,
    text: message.message,
  }));

const buildSystemContext = (
  conversation: ConversationMemory,
  intent: ConversationIntent,
  firstAssistantContact: boolean,
  agentName: string,
  companyName: string
) => `
Ficha CRM del lead:
- ID lead: ${conversation.leadId || conversation.id}
- Telefono: ${conversation.phone || "sin telefono"}
- Canal origen: ${conversation.channel || "WhatsApp"}
- Nombre candidato: ${conversation.name || "pendiente"}
- Apellido: ${conversation.lastName || "pendiente"}
- Email: ${conversation.email || "pendiente"}
- Ciudad: ${conversation.city || "pendiente"}
- Vacante: ${conversation.vacancy || "pendiente"}
- Edad: ${conversation.age ?? "pendiente"}
- Experiencia: ${conversation.experience || "pendiente"}
- Disponibilidad: ${conversation.availability || "pendiente"}
- Transporte: ${conversation.transport || "pendiente"}
- Escolaridad: ${conversation.education || "pendiente"}
- Ultimo empleo: ${conversation.lastJob || "pendiente"}
- Tiempo laborado: ${conversation.timeWorked || "pendiente"}
- Funciones: ${conversation.jobFunctions || "pendiente"}
- Score HDRS: ${conversation.candidateScore ?? "pendiente"}
- Prioridad HDRS: ${conversation.candidatePriority || "pendiente"}
- Talent Pool: ${conversation.talentPoolCategory || "pendiente"}
- Pipeline CRM: ${conversation.crmStatus || "Nuevo"}
- Etapa conversacional: ${conversation.stage}
- Fecha registro: ${conversation.createdAt}
- Ultima interaccion: ${conversation.lastInteractionAt || conversation.updatedAt}
- Ultima intencion detectada: ${intent}
- Empresa/cuenta: ${companyName}
- Nombre visible del agente: ${agentName}

Modelo HDRS obligatorio:
${HDRS_SERVER_PROMPT_CONTEXT}

${HDRS_SCORE_GUIDE}

Reglas obligatorias de respuesta:
- Responder en maximo 2 o 3 lineas.
- No enviar parrafos largos.
- Hacer una sola pregunta por mensaje.
- Mantener tono profesional, humano, conversacional y natural.
- Antes de responder, detecta la intencion y responde solo a esa intencion.
- Categorias de intencion: vacantes y empleo, reclutamiento, servicios empresariales, informacion general, ubicacion/contacto, redes sociales, preguntas frecuentes, conversacion casual, quejas/problemas, solicitud de atencion humana.
- Evitar repetir informacion o copiar exactamente el mensaje anterior.
- No repitas saludos en cada mensaje.
- No repitas el nombre de la empresa innecesariamente.
- No repitas datos que el candidato ya dio; continua desde el contexto guardado.
- Si el usuario escribe vacantes, empleo, trabajo o contratacion, explica con tus propias palabras que puedes ayudarle a revisar opciones y pregunta por el area o puesto que busca.
- Solicita solo datos necesarios para avanzar: nombre, telefono, correo si hace falta, vacante, ciudad/zona, edad cuando aplique, experiencia y disponibilidad.
- Si falta nombre, pide solamente el nombre completo.
- No pidas CURP, RFC, NSS, identificaciones ni datos sensibles por chat salvo instruccion explicita de RH y proceso confirmado.
- No inventes sueldo, horario, direccion, prestaciones ni promesas de contratacion si no estan confirmadas.
- Aplica scoring HDRS internamente, pero no muestres puntajes al candidato salvo que un reclutador lo solicite.

Reglas de saludo:
- Si es primer contacto (${firstAssistantContact ? "si" : "no"}), inicia con ${getTimeGreeting()}, menciona que eres ${agentName} de ${companyName}, ofrece ayuda y haz una pregunta simple para avanzar.
- No copies un texto fijo; varia la redaccion manteniendo claridad.
- No vuelvas a presentarte si ya hay mensajes del asistente en el historial.
- Interpreta respuestas cortas como "si", "ok" o "claro" segun la etapa actual; no reinicies la conversacion.
- Si falta un dato, pide el siguiente dato necesario y guarda el contexto.
- Si detectas molestia, queja, problema complejo o solicitud de atencion humana, ofrece canalizar con una persona del equipo por WhatsApp.
- Menores de 16: agradecer, explicar requisito de edad y cerrar.
- 16 o 17: pedir tutor/carta responsiva antes de continuar.
- Edad valida: continuar evaluacion segun vacante y cumplimiento laboral.
- Nunca rechaces por edad, genero, origen, religion, discapacidad u otra condicion protegida. Solo aplica requisitos legales y operativos confirmados.

${stageInstruction(conversation)}
`.trim();

export async function prepareRecruitmentConversationTurn(input: ConversationTurnInput): Promise<ConversationTurn> {
  const conversation = await loadConversation(input.sessionId, input.contactId);
  const firstAssistantContact = !conversation.messages.some((message) => message.sender === "assistant");
  const normalizedInput = normalizeCandidateInput(input.inboundBody);
  const intent = detectIntent(normalizedInput, conversation.stage);
  const inboundCreatedAt = nowIso();

  const extractedName = extractName(input.inboundBody);
  const extractedAge = extractAge(input.inboundBody);
  const extractedVacancy = extractVacancy(input.inboundBody);
  const extractedEmail = extractEmail(input.inboundBody);
  const extractedCity = extractCity(input.inboundBody);
  const extractedAvailability = extractAvailability(input.inboundBody);
  const extractedTransport = extractTransport(input.inboundBody);
  const extractedEducation = extractEducation(input.inboundBody);
  const extractedLastJob = extractLastJob(input.inboundBody);
  const extractedTimeWorked = extractTimeWorked(input.inboundBody);
  const extractedJobFunctions = extractJobFunctions(input.inboundBody);
  const extractedMinorDocumentation = extractMinorDocumentation(input.inboundBody);

  if (!conversation.channel) conversation.channel = "WhatsApp";
  if (!conversation.leadId) conversation.leadId = `lead-${conversation.id}`;
  if (!conversation.firstLeadEventAt) conversation.firstLeadEventAt = conversation.createdAt || inboundCreatedAt;
  if (!conversation.name && extractedName) {
    const parsedName = splitName(extractedName);
    conversation.name = parsedName.name || extractedName;
    conversation.lastName = parsedName.lastName;
  }
  if (extractedAge !== undefined) conversation.age = extractedAge;
  if (extractedVacancy) conversation.vacancy = extractedVacancy;
  if (extractedVacancy) conversation.desiredRole = extractedVacancy;
  if (extractedEmail) conversation.email = extractedEmail;
  if (extractedCity) conversation.city = extractedCity;
  if (extractedAvailability) conversation.availability = extractedAvailability;
  if (extractedTransport) conversation.transport = extractedTransport;
  if (extractedEducation) conversation.education = extractedEducation;
  if (extractedLastJob) conversation.lastJob = extractedLastJob;
  if (extractedTimeWorked) conversation.timeWorked = extractedTimeWorked;
  if (extractedJobFunctions) conversation.jobFunctions = extractedJobFunctions;
  if (extractedMinorDocumentation) conversation.minorDocumentation = extractedMinorDocumentation;
  if (intent === "PROVIDE_EXPERIENCE" && !conversation.experience) conversation.experience = input.inboundBody.trim().slice(0, 240);
  if (!conversation.experience && (extractedLastJob || extractedJobFunctions)) conversation.experience = input.inboundBody.trim().slice(0, 240);

  conversation.hdrsScore = scoreHdrsCandidate(conversation, input.inboundBody);
  conversation.candidateScore = conversation.hdrsScore.total;
  conversation.candidatePriority = classifyPriority(conversation.candidateScore);
  conversation.talentPoolCategory = classifyTalentPool(conversation);

  conversation.lastIntent = intent;
  conversation.stage = inferStage(conversation, intent);
  conversation.crmStatus = toCrmStatus(conversation.stage, intent);
  conversation.aiNotes = [
    `Intencion: ${intent}`,
    `Etapa: ${conversation.crmStatus}`,
    conversation.name ? "Nombre capturado" : "Nombre pendiente",
    conversation.vacancy ? `Vacante: ${conversation.vacancy}` : "Vacante pendiente",
    `Score HDRS: ${conversation.candidateScore}`,
    conversation.candidatePriority ? `Prioridad: ${conversation.candidatePriority}` : "Prioridad pendiente",
    conversation.talentPoolCategory ? `Talent pool: ${conversation.talentPoolCategory}` : "Talent pool pendiente",
  ].join(" | ");
  conversation.status =
    conversation.stage === "REJECTED"
      ? "rejected"
      : conversation.stage === "INTERVIEW_CONFIRMED"
        ? "interview_confirmed"
        : conversation.stage === "FOLLOW_UP"
          ? "follow_up"
          : "active";
  conversation.updatedAt = inboundCreatedAt;
  conversation.lastInteractionAt = inboundCreatedAt;
  conversation.messages.push({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: "user",
    message: input.inboundBody.trim(),
    createdAt: inboundCreatedAt,
  });
  conversation.messages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);

  await saveConversation(conversation);

  const systemContext = buildSystemContext(
    conversation,
    intent,
    firstAssistantContact,
    input.agentName,
    input.companyName
  );

  return {
    conversation,
    intent,
    normalizedInput,
    firstAssistantContact,
    history: toChatHistory(conversation),
    systemContext,
    userPrompt: `
Mensaje recibido del candidato:
"${input.inboundBody.trim()}"

Intencion detectada: ${intent}
Pipeline CRM: ${conversation.crmStatus}
Etapa actual: ${conversation.stage}
Score HDRS interno: ${conversation.candidateScore ?? "pendiente"} (${conversation.candidatePriority || "sin prioridad"})
Siguiente dato HDRS si falta informacion: ${nextHdrsField(conversation)}
Responde como ${input.agentName} en maximo 2 o 3 lineas. Haz una sola pregunta y no repitas el mensaje anterior.
`.trim(),
  };
}

export async function recordRecruitmentAssistantReply(input: {
  sessionId: string;
  contactId: string;
  reply: string;
  responseType?: string;
}) {
  const conversation = await loadConversation(input.sessionId, input.contactId);
  conversation.messages.push({
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: "assistant",
    message: input.reply.trim(),
    createdAt: nowIso(),
  });
  conversation.messages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);
  conversation.lastResponseType = input.responseType || conversation.stage;
  conversation.updatedAt = nowIso();
  conversation.lastInteractionAt = conversation.updatedAt;
  await saveConversation(conversation);
  return conversation;
}

export async function getRecruitmentLeadProfile(sessionId: string, contactId: string) {
  const conversation = await loadConversation(sessionId, contactId);
  return {
    id: conversation.leadId || conversation.id,
    fecha_registro: conversation.createdAt,
    nombre: conversation.name || "",
    apellido: conversation.lastName || "",
    edad: conversation.age ?? "",
    telefono: conversation.phone,
    correo: conversation.email || "",
    ciudad: conversation.city || "",
    vacante_interes: conversation.vacancy || "",
    disponibilidad: conversation.availability || "",
    transporte: conversation.transport || "",
    escolaridad: conversation.education || "",
    ultimo_empleo: conversation.lastJob || "",
    tiempo_laborado: conversation.timeWorked || "",
    funciones: conversation.jobFunctions || "",
    score_hdrs: conversation.candidateScore ?? "",
    prioridad_hdrs: conversation.candidatePriority || "",
    talent_pool: conversation.talentPoolCategory || "",
    canal: conversation.channel || "WhatsApp",
    estatus: conversation.crmStatus || "Nuevo",
    etapa: conversation.crmStatus || "Nuevo",
    ultima_interaccion: conversation.lastInteractionAt || conversation.updatedAt,
    observaciones_ia: conversation.aiNotes || "",
    raw: conversation,
  };
}
