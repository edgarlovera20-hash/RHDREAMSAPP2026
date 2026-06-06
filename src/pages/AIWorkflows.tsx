import { useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  Braces,
  Calendar,
  Check,
  Copy,
  Database,
  Filter,
  GitBranch,
  Loader2,
  Mail,
  MessageSquare,
  MousePointerClick,
  PlayCircle,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, readApiJson } from "@/lib/api";
import { RH_PROMPT_CATEGORIES, RH_PROMPT_LIBRARY, RH_PROMPT_LIBRARY_META, type RhPromptTemplate } from "@/data/rhPromptLibrary";
import { HDRS_GOALS, HDRS_KPIS, HDRS_PHASES, HDRS_SCORING_RULES, HDRS_TALENT_POOL } from "@/data/hdrsRecruitmentSystem";

type VariableType = "texto" | "numero" | "fecha" | "opcion" | "booleano" | "lista" | "json";
type VariableSource = "Candidato" | "Vacante" | "Canal" | "Calendario" | "Documento" | "Manual" | "Sistema";
type StepType = "ai" | "condition" | "message" | "calendar" | "task" | "webhook" | "handoff";
type WorkflowStatus = "Activo" | "Borrador" | "Pausado";
type ApprovalMode = "Sin aprobación" | "Aprobar antes de enviar" | "Solo escalar excepciones";
type ConditionOperator = "contiene" | "igual a" | "mayor que" | "menor que" | "existe" | "no existe";

type WorkflowVariable = {
  id: string;
  key: string;
  label: string;
  type: VariableType;
  source: VariableSource;
  fallback: string;
  required: boolean;
  description: string;
};

type WorkflowCondition = {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  actionOnFail: "detener" | "escalar" | "continuar";
};

type WorkflowStep = {
  id: string;
  name: string;
  type: StepType;
  agent: string;
  instruction: string;
  output: string;
  channel: string;
  waitMinutes: number;
  requiresApproval: boolean;
  successCriteria: string;
};

type TriggerConfig = {
  event: string;
  source: string;
  schedule: string;
  debounceMinutes: number;
  runWindow: string;
};

type AiWorkflow = {
  id: string;
  name: string;
  status: WorkflowStatus;
  channel: string;
  autonomous: boolean;
  approvalMode: ApprovalMode;
  trigger: TriggerConfig;
  conditions: WorkflowCondition[];
  variables: WorkflowVariable[];
  steps: WorkflowStep[];
};

const VARIABLE_TYPES: VariableType[] = ["texto", "numero", "fecha", "opcion", "booleano", "lista", "json"];
const VARIABLE_SOURCES: VariableSource[] = ["Candidato", "Vacante", "Canal", "Calendario", "Documento", "Manual", "Sistema"];
const CHANNELS = ["WhatsApp Normal", "WhatsApp Business", "Messenger", "Gmail", "Google Calendar", "Indeed", "Computrabajo", "OCC", "Facebook Leads", "Facebook Jobs", "Marketplace", "Instagram DM", "TikTok Leads", "Referidos", "Universidades", "Ferias de empleo", "Webhook"];
const AGENTS = ["IA Reclutadora HDRS", "Agente de recepción", "Agente de agenda", "Agente de recuperacion", "Agente de talent pool", "Candidate Sourcer", "Creador de Anuncios", "Especialista en políticas", "Reclutador Humano", "Coordinador de Reclutamiento", "Supervisor Humano"];
const TRIGGER_EVENTS = [
  "Lead omnicanal captado",
  "Nueva postulación recibida",
  "Mensaje entrante sin responder",
  "Candidato pasa a entrevista",
  "Candidato no responde",
  "Candidato abandona proceso",
  "Recordatorio 24 horas antes",
  "Confirmacion 2 horas antes",
  "Ultimo aviso 30 minutos antes",
  "Nueva vacante compatible con talent pool",
  "CV o PDF nuevo en Google Drive",
  "Lead nuevo desde Indeed",
  "Lead nuevo desde Computrabajo",
  "Lead nuevo desde OCC",
  "Lead nuevo desde Facebook",
  "Lead nuevo desde TikTok",
  "Ejecución programada",
  "Webhook recibido"
];
const TRIGGER_SOURCES = ["CRM", "Formulario", "WhatsApp Normal", "WhatsApp Business", "Messenger", "Gmail", "Google Calendar", "Indeed", "Computrabajo", "OCC", "Facebook", "Instagram", "TikTok", "Referidos", "Universidades", "Webhook"];

const DEFAULT_VARIABLES: WorkflowVariable[] = [
  { id: "var-candidate-name", key: "candidate_name", label: "Nombre candidato", type: "texto", source: "Candidato", fallback: "", required: true, description: "Nombre visible del candidato." },
  { id: "var-candidate-phone", key: "candidate_phone", label: "Telefono", type: "texto", source: "Candidato", fallback: "", required: true, description: "Telefono o WhatsApp normal para contacto asistido." },
  { id: "var-candidate-location", key: "candidate_location", label: "Ubicacion", type: "texto", source: "Candidato", fallback: "", required: false, description: "Ciudad, pais o modalidad preferida." },
  { id: "var-job-name", key: "job_name", label: "Vacante", type: "texto", source: "Vacante", fallback: "", required: true, description: "Titulo de la oferta." },
  { id: "var-job-profile", key: "job_target_profile", label: "A quien buscar", type: "texto", source: "Vacante", fallback: "", required: true, description: "Perfil objetivo de la vacante." },
  { id: "var-experience", key: "required_experience", label: "Experiencia requerida", type: "texto", source: "Vacante", fallback: "", required: false, description: "Experiencia minima o deseable." },
  { id: "var-education", key: "education_level", label: "Preparacion academica", type: "texto", source: "Vacante", fallback: "", required: false, description: "Nivel academico requerido." },
  { id: "var-schedule", key: "work_schedule", label: "Horario", type: "texto", source: "Vacante", fallback: "", required: false, description: "Horario y disponibilidad." },
  { id: "var-offer", key: "offer_details", label: "Que se ofrece", type: "texto", source: "Vacante", fallback: "", required: false, description: "Oferta, beneficios y salario." },
  { id: "var-interview-date", key: "interview_date", label: "Fecha entrevista", type: "fecha", source: "Calendario", fallback: "", required: false, description: "Fecha propuesta o confirmada." },
  { id: "var-candidate-age", key: "candidate_age", label: "Edad", type: "numero", source: "Candidato", fallback: "", required: true, description: "Edad para aplicar arbol legal HDRS." },
  { id: "var-candidate-email", key: "candidate_email", label: "Correo", type: "texto", source: "Candidato", fallback: "", required: false, description: "Correo para seguimiento y agenda." },
  { id: "var-transport", key: "candidate_transport", label: "Transporte", type: "texto", source: "Candidato", fallback: "", required: false, description: "Medio de traslado y cercania real." },
  { id: "var-start-availability", key: "start_availability", label: "Inicio inmediato", type: "texto", source: "Candidato", fallback: "", required: false, description: "Disponibilidad para iniciar o asistir a entrevista." },
  { id: "var-last-job", key: "last_job", label: "Ultimo empleo", type: "texto", source: "Candidato", fallback: "", required: false, description: "Ultima empresa o puesto reportado." },
  { id: "var-time-worked", key: "time_worked", label: "Tiempo laborado", type: "texto", source: "Candidato", fallback: "", required: false, description: "Duracion en el ultimo empleo." },
  { id: "var-functions", key: "job_functions", label: "Funciones", type: "texto", source: "Candidato", fallback: "", required: false, description: "Funciones o responsabilidades previas." },
  { id: "var-desired-role", key: "desired_role", label: "Puesto deseado", type: "texto", source: "Candidato", fallback: "", required: true, description: "Vacante o area que desea el candidato." },
  { id: "var-score-experience", key: "score_experience", label: "Score experiencia", type: "numero", source: "Sistema", fallback: "0", required: false, description: "0 a 20 puntos." },
  { id: "var-score-availability", key: "score_availability", label: "Score disponibilidad", type: "numero", source: "Sistema", fallback: "0", required: false, description: "0 a 20 puntos." },
  { id: "var-score-proximity", key: "score_proximity", label: "Score cercania", type: "numero", source: "Sistema", fallback: "0", required: false, description: "0 a 20 puntos." },
  { id: "var-score-skills", key: "score_skills", label: "Score habilidades", type: "numero", source: "Sistema", fallback: "0", required: false, description: "0 a 20 puntos." },
  { id: "var-score-attitude", key: "score_attitude", label: "Score actitud", type: "numero", source: "Sistema", fallback: "0", required: false, description: "0 a 20 puntos." },
  { id: "var-candidate-score", key: "candidate_fit_score", label: "Score total", type: "numero", source: "Sistema", fallback: "0", required: false, description: "Score total HDRS de 0 a 100." },
  { id: "var-priority", key: "candidate_priority", label: "Prioridad", type: "opcion", source: "Sistema", fallback: "Prioridad C", required: false, description: "Prioridad A, B, C o descartado." },
  { id: "var-talent-pool", key: "talent_pool_category", label: "Talent pool", type: "opcion", source: "Sistema", fallback: "Ventas", required: false, description: "Ventas, Operativos, Administrativos o Especializados." }
];

const DEFAULT_CONDITIONS: WorkflowCondition[] = [
  { id: "cond-phone", field: "candidate_phone", operator: "existe", value: "", actionOnFail: "escalar" },
  { id: "cond-job", field: "job_name", operator: "existe", value: "", actionOnFail: "detener" },
  { id: "cond-age", field: "candidate_age", operator: "existe", value: "", actionOnFail: "escalar" },
  { id: "cond-score", field: "candidate_fit_score", operator: "mayor que", value: "49", actionOnFail: "continuar" }
];

const INITIAL_WORKFLOWS: AiWorkflow[] = [
  {
    id: "flow-hdrs-master-72h",
    name: "HDRS Flujo Maestro 72h",
    status: "Activo",
    channel: "WhatsApp Normal",
    autonomous: true,
    approvalMode: "Solo escalar excepciones",
    trigger: {
      event: "Lead omnicanal captado",
      source: "CRM",
      schedule: "Inmediato",
      debounceMinutes: 1,
      runWindow: "Lunes a sabado 08:00-21:00"
    },
    conditions: DEFAULT_CONDITIONS,
    variables: DEFAULT_VARIABLES,
    steps: [
      {
        id: "step-capture",
        name: "1. Captacion omnicanal",
        type: "ai",
        agent: "IA Reclutadora HDRS",
        instruction: "Registra la fuente del candidato, vacante de interes y canal. Fuentes gratuitas: Facebook Jobs, grupos locales, Marketplace, TikTok, Instagram, referidos, universidades y ferias. Fuentes pagadas: OCC, Computrabajo e Indeed. Devuelve lead normalizado y dato faltante mas importante.",
        output: "normalized_lead",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Lead capturado con fuente, canal, vacante y siguiente accion."
      },
      {
        id: "step-greeting",
        name: "2. Contacto IA humano",
        type: "message",
        agent: "IA Reclutadora HDRS",
        instruction: "Redacta un saludo breve y natural. Usa el nombre personal del agente, agradece el interes y ofrece ayuda. Si no hay nombre, pide solo el nombre. No uses plantilla fija ni parrafo largo.",
        output: "outbound_message",
        channel: "WhatsApp Normal",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Mensaje inicial humano, breve y con una sola pregunta."
      },
      {
        id: "step-prequal",
        name: "3. Precalificacion",
        type: "ai",
        agent: "IA Reclutadora HDRS",
        instruction: "Solicita y ordena datos minimos: nombre, edad, ciudad, telefono, correo, horario, transporte, inicio inmediato, ultimo empleo, tiempo laborado, funciones, escolaridad y puesto deseado. Pide un dato por mensaje y guarda avance.",
        output: "prequalification_profile",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Perfil con datos minimos o lista clara de faltantes."
      },
      {
        id: "step-age-tree",
        name: "4. Arbol de edad",
        type: "condition",
        agent: "Especialista en políticas",
        instruction: "Aplica arbol legal: menor de 15 = rechazado respetuoso; 16-17 = solicitar carta responsiva, tutor legal, INE tutor y comprobante domicilio; edad valida = continuar evaluacion. No avanzar a agenda si falta edad.",
        output: "age_decision",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Edad validada y rama legal aplicada sin discriminacion indebida."
      },
      {
        id: "step-score",
        name: "5. Scoring 0-100",
        type: "ai",
        agent: "IA Reclutadora HDRS",
        instruction: "Calcula score HDRS: experiencia 0-20, disponibilidad 0-20, cercania 0-20, habilidades 0-20 y actitud 0-20. Clasifica: 90-100 Prioridad A, 70-89 B, 50-69 C, menor 50 descartado respetuoso o talent pool. Devuelve score por dimension, total, prioridad y razon.",
        output: "candidate_fit_score",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Score trazable, prioridad y siguiente accion."
      },
      {
        id: "step-interview-ia",
        name: "6. Entrevista IA",
        type: "ai",
        agent: "IA Reclutadora HDRS",
        instruction: "Si el score permite avanzar, realiza preguntas conductuales una por una: cuentame sobre ti, por que te interesa trabajar aqui, como manejas clientes dificiles y describe un problema que hayas resuelto. Resume respuestas y riesgos.",
        output: "ai_interview_summary",
        channel: "WhatsApp Normal",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Entrevista conversacional sin interrogatorio ni mensajes extensos."
      },
      {
        id: "step-calendar",
        name: "7. Agenda automatica",
        type: "calendar",
        agent: "Agente de agenda",
        instruction: "Agenda solo con horarios reales de Google Calendar, Outlook o Calendly. Ofrece maximo 3 opciones, confirma antes de registrar y guarda fecha, hora, ubicacion y documentos.",
        output: "interview_event",
        channel: "Google Calendar",
        waitMinutes: 0,
        requiresApproval: true,
        successCriteria: "Entrevista propuesta o confirmada con datos completos."
      },
      {
        id: "step-reminders",
        name: "8. Recordatorios",
        type: "message",
        agent: "Agente de agenda",
        instruction: "Programa seguimiento: 24 horas antes recordatorio, 2 horas antes confirmacion, 30 minutos antes ultimo aviso. Si responde REPROGRAMAR, conserva interes y ofrece nuevas opciones.",
        output: "reminder_sequence",
        channel: "WhatsApp Normal",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Recordatorios claros con CONFIRMO, REPROGRAMAR o CANCELAR."
      },
      {
        id: "step-recovery",
        name: "9. Recuperacion",
        type: "message",
        agent: "Agente de recuperacion",
        instruction: "Si el candidato no responde, usa recuperacion respetuosa: ghosting = seguimos interesados, indeciso = cerrar vacante esta semana, finalista = nuevas oportunidades compatibles. No presiones ni envies spam.",
        output: "recovery_message",
        channel: "WhatsApp Normal",
        waitMinutes: 1440,
        requiresApproval: false,
        successCriteria: "Mensaje breve con opcion clara de continuar o cerrar."
      },
      {
        id: "step-talent-pool",
        name: "10. Talent Pool",
        type: "task",
        agent: "Agente de talent pool",
        instruction: "Clasifica automaticamente: Ventas, Operativos, Administrativos o Especializados. Guarda consentimiento, fuente, score, vacante compatible y fecha sugerida de reactivacion.",
        output: "talent_pool_update",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Candidato clasificado para futuras vacantes sin perder contexto."
      },
      {
        id: "step-kpis",
        name: "11. KPIs HDRS",
        type: "task",
        agent: "Coordinador de Reclutamiento",
        instruction: "Actualiza KPIs: tiempo de contratacion, costo por contratacion, conversion por fuente, tasa respuesta, recuperacion, agendamiento, entrevistas IA, contrataciones, retencion 30/90 dias y rotacion.",
        output: "hdrs_kpi_update",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Dashboard alimentado con metricas de reclutamiento, WhatsApp, IA y calidad."
      },
      {
        id: "step-handoff",
        name: "12. Escalamiento humano",
        type: "handoff",
        agent: "Reclutador Humano",
        instruction: "Escala si el candidato pasa filtros, hay negociacion salarial, vacante especializada, entrevista final, duda legal, baja certeza, queja o solicitud de hablar con una persona.",
        output: "human_handoff",
        channel: "Sistema",
        waitMinutes: 0,
        requiresApproval: false,
        successCriteria: "Caso escalado con resumen, prioridad y motivo."
      }
    ]
  }
];

const STEP_META: Record<StepType, { label: string; icon: typeof Bot; color: string }> = {
  ai: { label: "Agente IA", icon: Bot, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  condition: { label: "Condición", icon: GitBranch, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  message: { label: "Mensaje", icon: MessageSquare, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  calendar: { label: "Calendario", icon: Calendar, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  task: { label: "Tarea CRM", icon: UserCheck, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  webhook: { label: "Webhook", icon: Database, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" },
  handoff: { label: "Escalar", icon: ShieldCheck, color: "text-zinc-300 bg-zinc-500/10 border-zinc-400/30" }
};

function renderWithVariables(template: string, variables: WorkflowVariable[]) {
  return variables.reduce((result, variable) => result.replaceAll(`{{${variable.key}}}`, variable.fallback || `[${variable.label}]`), template);
}

function createStep(type: StepType = "ai"): WorkflowStep {
  return {
    id: `step-${Date.now()}`,
    name: type === "message" ? "Enviar mensaje" : type === "condition" ? "Validar condición" : "Nuevo paso IA",
    type,
    agent: type === "handoff" ? "Supervisor Humano" : "Agente de recepción",
    instruction: "Usa {{candidate_name}}, {{job_name}} y {{job_target_profile}} para decidir el siguiente movimiento.",
    output: `${type}_result`,
    channel: type === "message" ? "WhatsApp Normal" : "Sistema",
    waitMinutes: 0,
    requiresApproval: type === "message",
    successCriteria: "Resultado valido, trazable y sin datos inventados."
  };
}

function createVariable(): WorkflowVariable {
  return {
    id: `var-${Date.now()}`,
    key: "nueva_variable",
    label: "Nueva variable",
    type: "texto",
    source: "Manual",
    fallback: "",
    required: false,
    description: "Describe para que usa esta variable el agente."
  };
}

function createCondition(): WorkflowCondition {
  return {
    id: `cond-${Date.now()}`,
    field: "candidate_name",
    operator: "existe",
    value: "",
    actionOnFail: "escalar"
  };
}

const containsAny = (text: string, words: string[]) => words.some((word) => text.includes(word));

function inferChannel(prompt: string) {
  if (containsAny(prompt, ["instagram", "ig", "dm"])) return "Instagram DM";
  if (containsAny(prompt, ["messenger", "facebook chat"])) return "Messenger";
  if (containsAny(prompt, ["facebook", "meta", "lead ads"])) return "Facebook Leads";
  if (containsAny(prompt, ["tiktok", "tik tok"])) return "TikTok Leads";
  if (containsAny(prompt, ["indeed"])) return "Indeed";
  if (containsAny(prompt, ["computrabajo"])) return "Computrabajo";
  if (containsAny(prompt, ["gmail", "correo", "email"])) return "Gmail";
  if (containsAny(prompt, ["webhook", "formulario", "externo"])) return "Webhook";
  return "WhatsApp Normal";
}

function inferTrigger(prompt: string, channel: string): TriggerConfig {
  if (containsAny(prompt, ["no responde", "seguimiento", "follow up", "recordatorio"])) {
    return { event: "Candidato no responde", source: channel, schedule: "Despues de 24 horas sin respuesta", debounceMinutes: 1440, runWindow: "Lunes a sabado 09:00-19:00" };
  }
  if (containsAny(prompt, ["entrevista", "agenda", "agendar", "cita"])) {
    return { event: "Candidato pasa a entrevista", source: channel, schedule: "Inmediato", debounceMinutes: 10, runWindow: "Lunes a viernes 08:00-20:00" };
  }
  if (containsAny(prompt, ["webhook", "formulario", "externo"])) {
    return { event: "Webhook recibido", source: "Webhook", schedule: "Inmediato", debounceMinutes: 1, runWindow: "24/7" };
  }
  if (containsAny(prompt, ["mensaje", "inbox", "dm", "whatsapp"])) {
    return { event: "Mensaje entrante sin responder", source: channel, schedule: "Inmediato", debounceMinutes: 3, runWindow: "Lunes a sabado 08:00-21:00" };
  }
  return { event: "Nueva postulación recibida", source: channel === "Webhook" ? "Webhook" : channel, schedule: "Inmediato", debounceMinutes: 5, runWindow: "Lunes a viernes 08:00-20:00" };
}

function createWorkflowFromPrompt(prompt: string): AiWorkflow {
  const normalized = prompt.toLowerCase();
  const channel = inferChannel(normalized);
  const needsInterview = containsAny(normalized, ["entrevista", "agenda", "agendar", "calendar", "cita"]);
  const needsWebhook = containsAny(normalized, ["webhook", "api", "externo", "formulario"]);
  const needsFollowUp = containsAny(normalized, ["seguimiento", "follow", "no responde", "recordatorio", "reactivar"]);
  const needsScoring = containsAny(normalized, ["calificar", "score", "filtrar", "evaluar", "perfil", "embudo"]);
  const needsDocuments = containsAny(normalized, ["cv", "documento", "ine", "pdf", "archivo"]);
  const needsRecovery = needsFollowUp || containsAny(normalized, ["ghosting", "abandono", "recuperar", "indeciso", "finalista"]);
  const needsTalentPool = containsAny(normalized, ["talent pool", "base de talento", "futuras vacantes", "reactivar"]);

  const extraVariables: WorkflowVariable[] = [
    { id: "var-channel-source", key: "channel_source", label: "Canal origen", type: "texto", source: "Canal", fallback: channel, required: true, description: "Canal o integracion que disparo el flujo." },
    { id: "var-funnel-stage", key: "funnel_stage", label: "Etapa del embudo", type: "opcion", source: "Sistema", fallback: "contacto", required: true, description: "contacto, calificacion, entrevista, seguimiento o cierre." },
    { id: "var-agent-personality", key: "agent_personality", label: "Personalidad del agente", type: "texto", source: "Manual", fallback: "Humano, profesional, amable, directo y orientado a conversion.", required: false, description: "Forma de responder durante este flujo." },
    { id: "var-branch-result", key: "branch_result", label: "Resultado de rama", type: "texto", source: "Sistema", fallback: "", required: false, description: "Guarda si el candidato avanza, se escala o se pausa." },
    { id: "var-recovery-reason", key: "recovery_reason", label: "Motivo recuperacion", type: "opcion", source: "Sistema", fallback: "ghosting", required: false, description: "ghosting, indeciso o finalista." },
  ];

  const variables = [
    ...DEFAULT_VARIABLES,
    ...extraVariables,
    ...(needsInterview ? [{ id: "var-interview-link", key: "interview_link", label: "Link entrevista", type: "texto" as VariableType, source: "Calendario" as VariableSource, fallback: "", required: false, description: "Link de Google Meet o direccion de entrevista." }] : []),
    ...(needsDocuments ? [{ id: "var-required-documents", key: "required_documents", label: "Documentos requeridos", type: "lista" as VariableType, source: "Documento" as VariableSource, fallback: "CV, identificacion, comprobante", required: false, description: "Lista de documentos solicitados al candidato." }] : []),
  ];

  const conditions: WorkflowCondition[] = [
    { id: "cond-phone", field: "candidate_phone", operator: "existe", value: "", actionOnFail: "escalar" },
    { id: "cond-job", field: "job_name", operator: "existe", value: "", actionOnFail: "detener" },
    { id: "cond-channel", field: "channel_source", operator: "existe", value: "", actionOnFail: "detener" },
    { id: "cond-age-hdrs", field: "candidate_age", operator: "existe" as ConditionOperator, value: "", actionOnFail: "escalar" as const },
    { id: "cond-score", field: "candidate_fit_score", operator: "mayor que" as ConditionOperator, value: needsScoring ? "69" : "49", actionOnFail: "continuar" as const },
    ...(needsInterview ? [{ id: "cond-availability", field: "work_schedule", operator: "existe" as ConditionOperator, value: "", actionOnFail: "continuar" as const }] : []),
  ];

  const steps: WorkflowStep[] = [
    {
      id: "step-receive",
      name: "1. Capturar entrada",
      type: needsWebhook ? "webhook" : "ai",
      agent: "Agente de recepción",
      instruction: `Lee la entrada del canal {{channel_source}} y normaliza datos del candidato. Prompt original del usuario: ${prompt}`,
      output: "normalized_lead",
      channel: channel === "Webhook" ? "Webhook" : "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "Datos base normalizados: nombre, telefono, vacante, fuente y etapa inicial del embudo.",
    },
    {
      id: "step-score",
      name: "2. Precalificar y calificar perfil",
      type: "ai",
      agent: "IA Reclutadora HDRS",
      instruction: "Aplica HDRS. Captura nombre, edad, ciudad, telefono, correo, horario, transporte, inicio inmediato, ultimo empleo, tiempo laborado, funciones, escolaridad y puesto deseado. Despues evalua {{candidate_name}} para {{job_name}} contra {{job_target_profile}}, {{required_experience}}, {{education_level}}, {{work_schedule}} y {{offer_details}}. Calcula experiencia 0-20, disponibilidad 0-20, cercania 0-20, habilidades 0-20 y actitud 0-20. Devuelve score 0-100, prioridad A/B/C/descartado, talent pool, objeciones, datos faltantes y rama sugerida.",
      output: "candidate_fit_score",
      channel: "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "Score, rama y razones trazables sin inventar informacion.",
    },
    {
      id: "step-branch",
      name: "3. Arbol de decision HDRS",
      type: "condition",
      agent: "Supervisor Humano",
      instruction: "Aplica arbol de edad y score. Menor de 15: cierre respetuoso. 16-17: solicitar tutor/carta/INE tutor/comprobante. Score 90-100 Prioridad A, 70-89 B, 50-69 C, menor 50 cerrar con respeto o enviar a talent pool. Si hay alerta legal, salario no confirmado, molestia o baja certeza, escalar.",
      output: "branch_result",
      channel: "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "Cada candidato queda en una rama unica del embudo.",
    },
    {
      id: "step-message",
      name: "4. Mensaje personalizado",
      type: "message",
      agent: "Agente de recepción",
      instruction: "Redacta respuesta para {{candidate_name}} con personalidad {{agent_personality}}. Usa la rama {{branch_result}}, explica {{job_name}}, confirma interes, pide solo un dato faltante por mensaje y evita prometer contratacion.",
      output: "outbound_message",
      channel,
      waitMinutes: 0,
      requiresApproval: channel !== "WhatsApp Normal" && channel !== "Webhook",
      successCriteria: "Mensaje breve, humano, claro, sin discriminacion y listo para enviar.",
    },
    ...(needsInterview ? [{
      id: "step-calendar",
      name: "5. Agendar entrevista",
      type: "calendar" as StepType,
      agent: "Agente de agenda",
      instruction: "Si la rama es avanza, ofrece horarios compatibles con {{work_schedule}}, crea evento y guarda {{interview_date}} y {{interview_link}}.",
      output: "interview_event",
      channel: "Google Calendar",
      waitMinutes: 0,
      requiresApproval: true,
      successCriteria: "Entrevista propuesta o agendada con fecha, hora e instrucciones.",
    }] : []),
    ...(needsFollowUp || needsRecovery ? [{
      id: "step-follow-up",
      name: "Seguimiento y recuperacion",
      type: "message" as StepType,
      agent: "Agente de recuperacion",
      instruction: "Si no hay respuesta despues del tiempo definido, envia recuperacion segun {{recovery_reason}}. Ghosting: seguimos interesados. Indeciso: cerrar vacante esta semana. Finalista: nuevas oportunidades compatibles. Siempre deja opcion de continuar o cerrar.",
      output: "follow_up_message",
      channel,
      waitMinutes: 1440,
      requiresApproval: false,
      successCriteria: "Seguimiento sin presion, con opcion clara de continuar o cerrar.",
    }] : []),
    ...(needsTalentPool ? [{
      id: "step-talent-pool",
      name: "Clasificar talent pool",
      type: "task" as StepType,
      agent: "Agente de talent pool",
      instruction: "Clasifica a {{candidate_name}} en Ventas, Operativos, Administrativos o Especializados. Guarda score, fuente, consentimiento, vacante compatible y fecha de reactivacion.",
      output: "talent_pool_update",
      channel: "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "Candidato listo para reactivacion futura con categoria correcta.",
    }] : []),
    {
      id: "step-crm",
      name: "Actualizar CRM y embudo",
      type: "task",
      agent: "Agente de recepción",
      instruction: "Actualiza etapa {{funnel_stage}}, guarda score, rama, ultimo mensaje, siguiente accion y alerta si requiere humano.",
      output: "crm_update",
      channel: "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "CRM actualizado con estado del embudo y proxima accion.",
    },
    {
      id: "step-escalate",
      name: "Escalar excepciones",
      type: "handoff",
      agent: "Supervisor Humano",
      instruction: "Escala cuando falten datos criticos, haya queja, duda legal, solicitud fuera de politica, candidato molesto, salario fuera de rango o autorizacion humana requerida.",
      output: "human_handoff",
      channel: "Sistema",
      waitMinutes: 0,
      requiresApproval: false,
      successCriteria: "Excepciones visibles para supervisor con resumen y recomendacion.",
    },
  ];

  const nameFromPrompt = prompt
    .split(/[.?\n]/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

  return {
    id: `flow-ai-${Date.now()}`,
    name: nameFromPrompt || "Flujo generado por IA",
    status: "Borrador",
    channel,
    autonomous: true,
    approvalMode: "Solo escalar excepciones",
    trigger: inferTrigger(normalized, channel),
    conditions,
    variables,
    steps,
  };
}

export function AIWorkflows() {
  const [workflows, setWorkflows] = useState<AiWorkflow[]>(INITIAL_WORKFLOWS);
  const [activeWorkflowId, setActiveWorkflowId] = useState(INITIAL_WORKFLOWS[0].id);
  const [activeStepId, setActiveStepId] = useState(INITIAL_WORKFLOWS[0].steps[0].id);
  const [activeTab, setActiveTab] = useState<"builder" | "trigger" | "conditions" | "variables" | "library" | "preview">("builder");
  const [copied, setCopied] = useState(false);
  const [promptSearch, setPromptSearch] = useState("");
  const [promptCategory, setPromptCategory] = useState<string>("Todas");
  const [isStartingWorkflow, setIsStartingWorkflow] = useState(false);
  const [workflowRun, setWorkflowRun] = useState<{ runId: string; status: string } | null>(null);
  const [workflowRunError, setWorkflowRunError] = useState<string | null>(null);
  const [flowPrompt, setFlowPrompt] = useState("");
  const [generatedNotice, setGeneratedNotice] = useState("");

  const activeWorkflow = workflows.find((workflow) => workflow.id === activeWorkflowId) || workflows[0];
  const activeStep = activeWorkflow.steps.find((step) => step.id === activeStepId) || activeWorkflow.steps[0];

  const executionPayload = useMemo(() => ({
    workflowId: activeWorkflow.id,
    name: activeWorkflow.name,
    status: activeWorkflow.status,
    channel: activeWorkflow.channel,
    trigger: activeWorkflow.trigger,
    autonomous: activeWorkflow.autonomous,
    approvalMode: activeWorkflow.approvalMode,
    conditions: activeWorkflow.conditions,
    variables: Object.fromEntries(activeWorkflow.variables.map((variable) => [variable.key, {
      value: variable.fallback,
      type: variable.type,
      source: variable.source,
      required: variable.required
    }])),
    steps: activeWorkflow.steps.map((step, index) => ({
      order: index + 1,
      type: step.type,
      agent: step.agent,
      channel: step.channel,
      waitMinutes: step.waitMinutes,
      requiresApproval: step.requiresApproval,
      output: step.output,
      prompt: renderWithVariables(step.instruction, activeWorkflow.variables),
      successCriteria: step.successCriteria
    }))
  }), [activeWorkflow]);

  const renderedInstruction = useMemo(() => renderWithVariables(activeStep?.instruction || "", activeWorkflow.variables), [activeStep?.instruction, activeWorkflow.variables]);

  const filteredPromptLibrary = useMemo(() => {
    const query = promptSearch.trim().toLowerCase();
    return RH_PROMPT_LIBRARY.filter((template) => {
      const matchesCategory = promptCategory === "Todas" || template.category === promptCategory;
      const matchesSearch = !query || [template.title, template.category, template.useCase, template.prompt].join(" ").toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [promptCategory, promptSearch]);

  const updateActiveWorkflow = (patch: Partial<AiWorkflow>) => {
    setWorkflows((items) => items.map((workflow) => workflow.id === activeWorkflow.id ? { ...workflow, ...patch } : workflow));
  };

  const updateTrigger = (patch: Partial<TriggerConfig>) => updateActiveWorkflow({ trigger: { ...activeWorkflow.trigger, ...patch } });

  const updateStep = (stepId: string, patch: Partial<WorkflowStep>) => {
    updateActiveWorkflow({ steps: activeWorkflow.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step) });
  };

  const updateVariable = (variableId: string, patch: Partial<WorkflowVariable>) => {
    updateActiveWorkflow({ variables: activeWorkflow.variables.map((variable) => variable.id === variableId ? { ...variable, ...patch } : variable) });
  };

  const updateCondition = (conditionId: string, patch: Partial<WorkflowCondition>) => {
    updateActiveWorkflow({ conditions: activeWorkflow.conditions.map((condition) => condition.id === conditionId ? { ...condition, ...patch } : condition) });
  };

  const addWorkflow = () => {
    const workflow: AiWorkflow = {
      id: `flow-${Date.now()}`,
      name: "Nuevo flujo IA",
      status: "Borrador",
      channel: "WhatsApp Normal",
      autonomous: true,
      approvalMode: "Aprobar antes de enviar",
      trigger: { event: "Nueva postulación recibida", source: "CRM", schedule: "Inmediato", debounceMinutes: 5, runWindow: "Lunes a viernes 08:00-20:00" },
      conditions: [createCondition()],
      variables: DEFAULT_VARIABLES,
      steps: [createStep()]
    };
    setWorkflows((items) => [workflow, ...items]);
    setActiveWorkflowId(workflow.id);
    setActiveStepId(workflow.steps[0].id);
  };

  const generateWorkflowFromPrompt = () => {
    const prompt = flowPrompt.trim();
    if (!prompt) return;
    const workflow = createWorkflowFromPrompt(prompt);
    setWorkflows((items) => [workflow, ...items]);
    setActiveWorkflowId(workflow.id);
    setActiveStepId(workflow.steps[0].id);
    setActiveTab("preview");
    setGeneratedNotice(`Flujo creado con ${workflow.variables.length} variables, ${workflow.conditions.length} reglas/ramas y ${workflow.steps.length} pasos de embudo.`);
    window.setTimeout(() => setGeneratedNotice(""), 4000);
  };

  const removeStep = (stepId: string) => {
    if (activeWorkflow.steps.length === 1) return;
    const nextSteps = activeWorkflow.steps.filter((step) => step.id !== stepId);
    updateActiveWorkflow({ steps: nextSteps });
    if (activeStepId === stepId) setActiveStepId(nextSteps[0].id);
  };

  const insertVariableIntoStep = (key: string) => {
    if (!activeStep) return;
    updateStep(activeStep.id, { instruction: `${activeStep.instruction} {{${key}}}` });
    setActiveTab("builder");
  };

  const applyPromptToStep = (template: RhPromptTemplate) => {
    if (!activeStep) return;
    updateStep(activeStep.id, {
      name: template.title,
      type: "ai",
      instruction: template.prompt,
      output: `${template.id.replace(/-/g, "_")}_result`,
      successCriteria: `Resultado util para ${template.useCase.toLowerCase()} sin inventar datos y usando solo variables disponibles.`,
    });
    setActiveTab("builder");
  };

  const copyPayload = async () => {
    await navigator.clipboard.writeText(JSON.stringify(executionPayload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startWorkflowRun = async () => {
    setIsStartingWorkflow(true);
    setWorkflowRun(null);
    setWorkflowRunError(null);
    try {
      const response = await apiFetch("/api/workflows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executionPayload),
      });
      const payload = await readApiJson<{ success: boolean; data: { runId: string; status: string } }>(response);
      setWorkflowRun(payload.data);
    } catch (error) {
      setWorkflowRunError(error instanceof Error ? error.message : "No se pudo iniciar el flujo.");
    } finally {
      setIsStartingWorkflow(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GitBranch className="h-6 w-6 icon-fuchsia" />
            Creador de Flujos IA
          </h1>
          <p className="mt-1 text-sm text-slate-400">Configura disparadores, condiciones, variables, acciones y aprobaciones para tus agentes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addWorkflow} className="btn-primary flex h-10 items-center gap-2 px-4 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Crear flujo
          </button>
          <button className="btn-secondary flex h-10 items-center gap-2 px-4 text-sm font-semibold">
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-300" />
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-100">Generador automatico por prompt</h2>
            </div>
            <textarea
              value={flowPrompt}
              onChange={(event) => setFlowPrompt(event.target.value)}
              placeholder="Ej: Crea un flujo para Facebook Leads que califique candidatos, los separe por score, pida datos faltantes, agende entrevista en Google Calendar, mande seguimiento si no responden y escale excepciones legales o salariales."
              className="min-h-[104px] w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-zinc-400/60"
            />
            {generatedNotice && (
              <p className="mt-2 text-xs font-semibold text-zinc-300">{generatedNotice}</p>
            )}
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/40 p-3">
            <div className="space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-white">Crea automaticamente:</p>
              <p>Disparadores, ramas, reglas, embudo, variables, pasos, aprobaciones, webhooks y payload de prueba.</p>
              <p className="text-zinc-200">{HDRS_PHASES.length} fases HDRS y {HDRS_KPIS.length} KPIs listos para medir.</p>
            </div>
            <button
              onClick={generateWorkflowFromPrompt}
              disabled={!flowPrompt.trim()}
              className="btn-primary flex h-11 items-center justify-center gap-2 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Crear flujo con IA
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <div className="glass-panel rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-4 xl:col-span-2">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-zinc-200">
            <ShieldCheck className="h-4 w-4" />
            Modelo HDRS
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Sistema Heavenly Dreams para contratar en 72 horas, automatizar 80% del primer contacto, recuperar abandonos y mantener talent pool propio.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {HDRS_GOALS.slice(0, 4).map((goal) => (
              <div key={goal} className="rounded-lg border border-zinc-400/15 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-300">
                {goal}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-zinc-500/20 bg-slate-950/25 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-200">Scoring IA</div>
          <div className="mt-3 space-y-2">
            {HDRS_SCORING_RULES.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2 text-xs">
                <span className="text-slate-300">{rule.label}</span>
                <span className="font-mono font-bold text-zinc-200">{rule.maxPoints}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-zinc-500/20 bg-slate-950/25 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-200">Talent pool</div>
          <div className="mt-3 space-y-2">
            {HDRS_TALENT_POOL.map((pool) => (
              <div key={pool.category} className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2">
                <p className="text-xs font-semibold text-white">{pool.category}</p>
                <p className="mt-1 truncate text-[11px] text-slate-400">{pool.profiles.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(620px,1fr)_320px]">
        <aside className="glass-panel flex min-h-[260px] flex-col overflow-hidden rounded-lg border border-slate-700/60">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Flujos</span>
            <span className="rounded-md border border-zinc-400/30 bg-zinc-500/10 px-2 py-1 text-[10px] font-bold text-zinc-300">
              {workflows.filter((workflow) => workflow.status === "Activo").length} activos
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 styled-scrollbar">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => {
                  setActiveWorkflowId(workflow.id);
                  setActiveStepId(workflow.steps[0]?.id || "");
                }}
                className={cn("w-full rounded-lg border p-3 text-left transition-colors", workflow.id === activeWorkflow.id ? "border-zinc-400/50 bg-zinc-500/10" : "border-slate-700/60 bg-slate-950/30 hover:border-slate-500/80")}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{workflow.name}</h3>
                  <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", workflow.status === "Activo" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : workflow.status === "Pausado" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-slate-700")}>{workflow.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{workflow.trigger.event}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <Braces className="h-3.5 w-3.5 text-zinc-300" /> {workflow.variables.length} vars
                  <span className="h-1 w-1 rounded-full bg-slate-600" /> {workflow.conditions.length} reglas
                  <span className="h-1 w-1 rounded-full bg-slate-600" /> {workflow.steps.length} pasos
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass-panel min-h-[680px] min-w-0 overflow-hidden rounded-lg border border-slate-700/60">
          <div className="border-b border-white/5 bg-slate-950/20 p-4">
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_150px_180px]">
              <Field className="lg:col-span-2 2xl:col-span-1" label="Nombre del flujo" value={activeWorkflow.name} onChange={(value) => updateActiveWorkflow({ name: value })} />
              <Select label="Estado" value={activeWorkflow.status} options={["Activo", "Borrador", "Pausado"]} onChange={(value) => updateActiveWorkflow({ status: value as WorkflowStatus })} />
              <Select label="Canal principal" value={activeWorkflow.channel} options={CHANNELS} onChange={(value) => updateActiveWorkflow({ channel: value })} />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[160px_minmax(220px,320px)] 2xl:grid-cols-[160px_260px_minmax(0,1fr)]">
              <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/40 px-3">
                <input type="checkbox" checked={activeWorkflow.autonomous} onChange={(event) => updateActiveWorkflow({ autonomous: event.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-zinc-500 focus:ring-zinc-500" />
                <span className="text-sm text-slate-200">Autónomo</span>
              </label>
              <Select compact label="Aprobación" value={activeWorkflow.approvalMode} options={["Sin aprobación", "Aprobar antes de enviar", "Solo escalar excepciones"]} onChange={(value) => updateActiveWorkflow({ approvalMode: value as ApprovalMode })} />
              <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/40 p-1 styled-scrollbar xl:col-span-2 2xl:col-span-1">
                {[
                  { id: "builder", label: "Pasos", icon: Settings2 },
                  { id: "trigger", label: "Disparador", icon: Zap },
                  { id: "conditions", label: "Reglas", icon: Filter },
                  { id: "variables", label: "Variables", icon: Braces },
                  { id: "library", label: "Biblioteca RH", icon: BookOpen },
                  { id: "preview", label: "Prueba", icon: PlayCircle }
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors", activeTab === tab.id ? "bg-zinc-500/15 text-zinc-200" : "text-slate-400 hover:text-white")}>
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-0 p-4">
            {activeTab === "trigger" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Select label="Evento disparador" value={activeWorkflow.trigger.event} options={TRIGGER_EVENTS} onChange={(value) => updateTrigger({ event: value })} />
                <Select label="Fuente" value={activeWorkflow.trigger.source} options={TRIGGER_SOURCES} onChange={(value) => updateTrigger({ source: value })} />
                <Field label="Frecuencia / cron" value={activeWorkflow.trigger.schedule} onChange={(value) => updateTrigger({ schedule: value })} placeholder="Inmediato, diario 09:00, cada 2 horas..." />
                <Field label="Ventana de ejecución" value={activeWorkflow.trigger.runWindow} onChange={(value) => updateTrigger({ runWindow: value })} placeholder="Lunes a viernes 08:00-20:00" />
                <Field label="Esperar antes de correr (min)" value={String(activeWorkflow.trigger.debounceMinutes)} onChange={(value) => updateTrigger({ debounceMinutes: Number(value) || 0 })} />
                <div className="rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-4 text-sm text-slate-300">
                  <h3 className="mb-2 font-semibold text-zinc-200">Cómo se activará</h3>
                  Cuando ocurra <b>{activeWorkflow.trigger.event}</b> desde <b>{activeWorkflow.trigger.source}</b>, el flujo esperará <b>{activeWorkflow.trigger.debounceMinutes} min</b> y correrá dentro de <b>{activeWorkflow.trigger.runWindow}</b>.
                </div>
              </div>
            )}

            {activeTab === "conditions" && (
              <div className="space-y-3">
                {activeWorkflow.conditions.map((condition) => (
                  <div key={condition.id} className="grid gap-3 rounded-lg border border-slate-700/60 bg-slate-950/30 p-4 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_150px_40px]">
                    <Select label="Campo" value={condition.field} options={activeWorkflow.variables.map((variable) => variable.key)} onChange={(value) => updateCondition(condition.id, { field: value })} />
                    <Select label="Operador" value={condition.operator} options={["contiene", "igual a", "mayor que", "menor que", "existe", "no existe"]} onChange={(value) => updateCondition(condition.id, { operator: value as ConditionOperator })} />
                    <Field label="Valor" value={condition.value} onChange={(value) => updateCondition(condition.id, { value })} placeholder="Valor esperado, opcional si existe/no existe" />
                    <Select label="Si falla" value={condition.actionOnFail} options={["detener", "escalar", "continuar"]} onChange={(value) => updateCondition(condition.id, { actionOnFail: value as WorkflowCondition["actionOnFail"] })} />
                    <button onClick={() => updateActiveWorkflow({ conditions: activeWorkflow.conditions.filter((item) => item.id !== condition.id) })} className="mt-6 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:border-zinc-400/40 hover:text-zinc-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <AddButton label="Agregar regla o condición" onClick={() => updateActiveWorkflow({ conditions: [...activeWorkflow.conditions, createCondition()] })} />
              </div>
            )}

            {activeTab === "builder" && (
              <div className="space-y-3">
                {activeWorkflow.steps.map((step, index) => {
                  const meta = STEP_META[step.type];
                  const Icon = meta.icon;
                  return (
                    <div key={step.id} className={cn("rounded-lg border bg-slate-950/30 p-4", step.id === activeStepId ? "border-zinc-400/50" : "border-slate-700/60")}>
                      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start">
                        <button onClick={() => setActiveStepId(step.id)} className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", meta.color)} title={meta.label}>
                          <Icon className="h-5 w-5" />
                        </button>
                        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_135px_180px_150px]">
                          <Field label={`Paso ${index + 1}`} value={step.name} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { name: value })} />
                          <Select label="Tipo" value={step.type} options={Object.keys(STEP_META)} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { type: value as StepType })} />
                          <Select label="Agente" value={step.agent} options={AGENTS} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { agent: value })} />
                          <Select label="Canal" value={step.channel} options={["Sistema", ...CHANNELS]} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { channel: value })} />
                        </div>
                        <button onClick={() => removeStep(step.id)} disabled={activeWorkflow.steps.length === 1} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:border-zinc-400/40 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 2xl:grid-cols-[minmax(0,1fr)_170px_180px]">
                        <textarea value={step.instruction} onFocus={() => setActiveStepId(step.id)} onChange={(event) => updateStep(step.id, { instruction: event.target.value })} className="min-h-[112px] resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-3 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-zinc-400" />
                        <div className="grid gap-3 sm:grid-cols-2 2xl:block 2xl:space-y-3">
                          <Field label="Salida" value={step.output} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { output: value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
                          <Field label="Espera min" value={String(step.waitMinutes)} onFocus={() => setActiveStepId(step.id)} onChange={(value) => updateStep(step.id, { waitMinutes: Number(value) || 0 })} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)] 2xl:block 2xl:space-y-3">
                          <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/40 px-3 2xl:mt-6">
                            <input type="checkbox" checked={step.requiresApproval} onChange={(event) => updateStep(step.id, { requiresApproval: event.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-zinc-500 focus:ring-zinc-500" />
                            <span className="text-xs text-slate-200">Requiere aprobación</span>
                          </label>
                          <textarea value={step.successCriteria} onFocus={() => setActiveStepId(step.id)} onChange={(event) => updateStep(step.id, { successCriteria: event.target.value })} className="min-h-[58px] resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none focus:border-zinc-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(["ai", "condition", "message", "calendar", "task", "webhook", "handoff"] as StepType[]).map((type) => (
                    <button key={type} onClick={() => { const step = createStep(type); updateActiveWorkflow({ steps: [...activeWorkflow.steps, step] }); setActiveStepId(step.id); }} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-400/40 bg-zinc-500/5 text-xs font-semibold text-zinc-200 hover:bg-zinc-500/10">
                      <Plus className="h-4 w-4" />
                      {STEP_META[type].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "variables" && (
              <div className="space-y-3">
                {activeWorkflow.variables.map((variable) => (
                  <div key={variable.id} className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_150px_130px_40px]">
                      <Field label="Variable" value={variable.key} onChange={(value) => updateVariable(variable.id, { key: value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} mono prefix="{{" suffix="}}" />
                      <Select label="Tipo" value={variable.type} options={VARIABLE_TYPES} onChange={(value) => updateVariable(variable.id, { type: value as VariableType })} />
                      <Select label="Fuente" value={variable.source} options={VARIABLE_SOURCES} onChange={(value) => updateVariable(variable.id, { source: value as VariableSource })} />
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Obligatoria</span>
                        <button onClick={() => updateVariable(variable.id, { required: !variable.required })} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-xs font-bold", variable.required ? "border-zinc-400/40 bg-zinc-500/10 text-zinc-300" : "border-slate-700 bg-slate-950/60 text-slate-400")}>
                          {variable.required && <Check className="h-3.5 w-3.5" />}
                          {variable.required ? "Sí" : "No"}
                        </button>
                      </label>
                      <button onClick={() => updateActiveWorkflow({ variables: activeWorkflow.variables.filter((item) => item.id !== variable.id) })} className="mt-6 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:border-zinc-400/40 hover:text-zinc-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <Field label="Etiqueta" value={variable.label} onChange={(value) => updateVariable(variable.id, { label: value })} />
                      <Field label="Valor de prueba" value={variable.fallback} onChange={(value) => updateVariable(variable.id, { fallback: value })} />
                      <Field label="Descripción" value={variable.description} onChange={(value) => updateVariable(variable.id, { description: value })} />
                    </div>
                  </div>
                ))}
                <AddButton label="Agregar variable" onClick={() => updateActiveWorkflow({ variables: [...activeWorkflow.variables, createVariable()] })} />
              </div>
            )}

            {activeTab === "library" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-500/20 bg-zinc-500/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                        <BookOpen className="h-4 w-4 text-zinc-300" />
                        Biblioteca RH para agentes
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{RH_PROMPT_LIBRARY_META.usage}</p>
                      <p className="mt-1 text-xs text-slate-500">Fuente cargada: {RH_PROMPT_LIBRARY_META.source}.</p>
                    </div>
                    <span className="rounded-lg border border-zinc-400/30 bg-slate-950/60 px-3 py-2 text-xs font-bold text-zinc-200">
                      {RH_PROMPT_LIBRARY.length} plantillas
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Buscar prompt</span>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 focus-within:border-zinc-400">
                      <Search className="h-4 w-4 text-slate-500" />
                      <input
                        value={promptSearch}
                        onChange={(event) => setPromptSearch(event.target.value)}
                        placeholder="Ej: entrevista, onboarding, bienestar..."
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </label>
                  <Select label="Categoria" value={promptCategory} options={["Todas", ...RH_PROMPT_CATEGORIES]} onChange={setPromptCategory} />
                </div>

                <div className="grid gap-3">
                  {filteredPromptLibrary.map((template) => (
                    <div key={template.id} className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">{template.title}</h3>
                            <span className="rounded-md border border-zinc-400/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-200">
                              {template.category}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{template.useCase}</p>
                        </div>
                        <button onClick={() => applyPromptToStep(template)} className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-500 px-3 text-xs font-bold text-slate-950 hover:bg-zinc-400">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          Usar en paso activo
                        </button>
                      </div>
                      <p className="mt-3 rounded-lg border border-slate-700/60 bg-black/20 p-3 font-mono text-xs leading-5 text-slate-300">{template.prompt}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <button key={variable} onClick={() => insertVariableIntoStep(variable)} className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-[11px] text-zinc-200 hover:border-zinc-400/40">
                            {"{{"}{variable}{"}}"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredPromptLibrary.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                      No encontre plantillas con ese filtro.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="grid gap-4">
                <Panel
                  title="Vista previa del paso activo"
                  icon={PlayCircle}
                  action={
                    <button
                      onClick={startWorkflowRun}
                      disabled={isStartingWorkflow}
                      className="btn-primary flex h-8 items-center gap-2 px-3 text-xs font-bold disabled:cursor-wait disabled:opacity-70"
                    >
                      {isStartingWorkflow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                      {isStartingWorkflow ? "Iniciando" : "Ejecutar flujo"}
                    </button>
                  }
                >
                  <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm leading-6 text-slate-200 styled-scrollbar">{renderedInstruction}</pre>
                  {workflowRun && (
                    <div className="mt-3 rounded-lg border border-zinc-400/30 bg-zinc-500/10 p-3 text-sm text-zinc-100">
                      Flujo iniciado. Run ID: <span className="font-mono text-zinc-200">{workflowRun.runId}</span>
                    </div>
                  )}
                  {workflowRunError && (
                    <div className="mt-3 rounded-lg border border-zinc-400/30 bg-zinc-500/10 p-3 text-sm text-zinc-100">
                      {workflowRunError}
                    </div>
                  )}
                </Panel>
                <Panel title="Payload completo del flujo" icon={Database} action={<button onClick={copyPayload} className="flex h-8 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:border-zinc-400/50 hover:text-zinc-200">{copied ? <Check className="h-3.5 w-3.5 text-zinc-300" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar"}</button>}>
                  <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/30 p-4 text-xs leading-5 text-slate-300 styled-scrollbar">{JSON.stringify(executionPayload, null, 2)}</pre>
                </Panel>
              </div>
            )}
          </div>
        </section>

        <aside className="glass-panel flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-slate-700/60 xl:col-span-2 2xl:col-span-1">
          <div className="border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Braces className="h-4 w-4 text-zinc-300" /> Variables disponibles</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 styled-scrollbar">
            <div className="grid gap-2">
              {activeWorkflow.variables.map((variable) => (
                <button key={variable.id} onClick={() => insertVariableIntoStep(variable.key)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-950/40 px-3 py-2 text-left hover:border-zinc-400/40 hover:bg-zinc-500/5">
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-zinc-200">{"{{"}{variable.key}{"}}"}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{variable.source} • {variable.type} • {variable.required ? "req" : "opc"}</span>
                  </span>
                  <MousePointerClick className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/5 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={Braces} label="Vars" value={activeWorkflow.variables.length} />
              <Metric icon={Filter} label="Reglas" value={activeWorkflow.conditions.length} />
              <Metric icon={Zap} label="Pasos" value={activeWorkflow.steps.length} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, onFocus, placeholder, mono, prefix, suffix, className }: { label: string; value: string; onChange: (value: string) => void; onFocus?: () => void; placeholder?: string; mono?: boolean; prefix?: string; suffix?: string; className?: string }) {
  return (
    <label className={cn("min-w-0 space-y-1", className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex h-10 rounded-lg border border-slate-700 bg-slate-950/60 focus-within:border-zinc-400">
        {prefix && <span className="flex items-center px-3 font-mono text-xs text-slate-500">{prefix}</span>}
        <input value={value} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cn("min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none", mono && "font-mono text-zinc-200", prefix && "pl-0", suffix && "pr-0")} />
        {suffix && <span className="flex items-center px-3 font-mono text-xs text-slate-500">{suffix}</span>}
      </div>
    </label>
  );
}

function Select({ label, value, options, onChange, onFocus, compact }: { label: string; value: string; options: string[]; onChange: (value: string) => void; onFocus?: () => void; compact?: boolean }) {
  return (
    <label className={cn("space-y-1", compact && "min-w-[220px]")}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <select value={value} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-zinc-400">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-400/40 bg-zinc-500/5 text-sm font-semibold text-zinc-200 hover:bg-zinc-500/10">
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function Panel({ title, icon: Icon, children, action }: { title: string; icon: typeof Bot; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-zinc-300" />{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
      <Icon className="mx-auto h-4 w-4 text-zinc-300" />
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
