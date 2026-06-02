export type HdrsPhase = {
  id: string;
  name: string;
  owner: "IA Reclutadora" | "Reclutador Humano" | "Coordinador RH";
  objective: string;
  actions: string[];
};

export type HdrsScoreDimension = {
  id: string;
  label: string;
  maxPoints: number;
  criteria: string;
};

export const HDRS_GOALS = [
  "Reducir tiempo de contratacion de 15 dias a 72 horas.",
  "Recuperar 30% de candidatos que abandonan procesos.",
  "Automatizar 80% de conversaciones iniciales.",
  "Mantener una base activa de talento para futuras vacantes.",
  "Medir captacion, conversacion, agenda, recuperacion y contratacion con KPIs.",
];

export const HDRS_DEPARTMENT_LEVELS = [
  {
    level: "Nivel 1",
    name: "IA Reclutadora",
    responsibility:
      "Responde WhatsApp, explica vacantes, filtra candidatos, agenda entrevistas, envia recordatorios, da seguimiento y recupera candidatos perdidos.",
  },
  {
    level: "Nivel 2",
    name: "Reclutador Humano",
    responsibility:
      "Interviene cuando el candidato pasa filtros, hay negociacion salarial, vacantes especializadas o entrevistas finales.",
  },
  {
    level: "Nivel 3",
    name: "Coordinador de Reclutamiento",
    responsibility:
      "Supervisa KPIs, fuentes de reclutamiento, calidad de contratacion, retencion y mejora continua del sistema.",
  },
];

export const HDRS_PHASES: HdrsPhase[] = [
  {
    id: "capture",
    name: "Fase 1 Captacion omnicanal",
    owner: "Coordinador RH",
    objective: "Captar candidatos desde fuentes gratuitas y pagadas sin mezclar canales.",
    actions: [
      "Facebook Jobs, grupos locales, Marketplace, TikTok, Instagram, referidos, universidades y ferias.",
      "OCC, Computrabajo e Indeed para volumen pagado o especializado.",
      "Registrar fuente, vacante, zona y primer contacto en CRM.",
    ],
  },
  {
    id: "ai-contact",
    name: "Fase 2 IA contacta",
    owner: "IA Reclutadora",
    objective: "Responder rapido, presentarse con nombre visible y abrir una conversacion humana.",
    actions: [
      "Saludar segun hora y nombre personal del agente.",
      "Agradecer interes y ofrecer ayuda concreta.",
      "Pedir solo un dato por mensaje para reducir abandono.",
    ],
  },
  {
    id: "prequalification",
    name: "Fase 3 Precalificacion",
    owner: "IA Reclutadora",
    objective: "Capturar datos minimos para decidir avance, seguimiento o escalamiento.",
    actions: [
      "Datos personales: nombre, edad, ciudad, telefono y correo.",
      "Disponibilidad: horario, transporte e inicio inmediato.",
      "Experiencia: ultimo empleo, tiempo laborado y funciones.",
      "Escolaridad y vacante deseada.",
    ],
  },
  {
    id: "age-tree",
    name: "Arbol de decisiones de edad",
    owner: "IA Reclutadora",
    objective: "Aplicar reglas legales antes de agendar o solicitar documentos.",
    actions: [
      "Menor de 16: cerrar con respeto por cumplimiento laboral.",
      "16-17: solicitar carta responsiva, tutor legal, INE del tutor y comprobante de domicilio.",
      "Edad valida: continuar evaluacion por competencias.",
    ],
  },
  {
    id: "scoring",
    name: "Sistema de scoring",
    owner: "IA Reclutadora",
    objective: "Asignar prioridad con criterios trazables y no discriminatorios.",
    actions: [
      "Experiencia 0-20, disponibilidad 0-20, cercania 0-20, habilidades 0-20 y actitud 0-20.",
      "90-100 Prioridad A, 70-89 Prioridad B, 50-69 Prioridad C, menor 50 descartado o talent pool.",
      "Escalar cuando el score sea incierto, falten datos criticos o haya tema sensible.",
    ],
  },
  {
    id: "interview",
    name: "Entrevista IA y agenda",
    owner: "IA Reclutadora",
    objective: "Validar interes, conducta y disponibilidad antes de programar entrevista.",
    actions: [
      "Preguntar: cuentame sobre ti, por que te interesa, como manejas clientes dificiles y que problema resolviste.",
      "Usar solo horarios reales de Google Calendar, Outlook o Calendly.",
      "Confirmar fecha, hora, ubicacion, documentos y asistencia.",
    ],
  },
  {
    id: "follow-up",
    name: "Seguimiento y recuperacion",
    owner: "IA Reclutadora",
    objective: "Reducir abandono con recordatorios y mensajes de rescate respetuosos.",
    actions: [
      "Recordatorio 24 horas antes, confirmacion 2 horas antes y ultimo aviso 30 minutos antes.",
      "Ghosting: preguntar si desea continuar sin presionar.",
      "Indecisos: ofrecer una ruta simple para cerrar la vacante esta semana.",
      "Finalistas: avisar nuevas oportunidades compatibles.",
    ],
  },
  {
    id: "talent-pool",
    name: "Talent Pool Heavenly Dreams",
    owner: "Reclutador Humano",
    objective: "Clasificar candidatos para futuras vacantes y reactivarlos con consentimiento.",
    actions: [
      "Ventas: vendedores, promotores, cajeros.",
      "Operativos: almacenistas, choferes, produccion.",
      "Administrativos: RH, auxiliares, recepcion.",
      "Especializados: TI, marketing, IA y desarrollo.",
    ],
  },
  {
    id: "kpis",
    name: "KPIs y mejora continua",
    owner: "Coordinador RH",
    objective: "Medir el sistema por contratacion, WhatsApp, IA y calidad.",
    actions: [
      "Tiempo de contratacion, costo por contratacion y conversion por fuente.",
      "Tasa de respuesta, recuperacion y agendamiento por WhatsApp.",
      "Conversaciones iniciadas, entrevistas realizadas y contrataciones generadas por IA.",
      "Retencion 30/90 dias y rotacion.",
    ],
  },
];

export const HDRS_SCORING_RULES: HdrsScoreDimension[] = [
  { id: "experience", label: "Experiencia", maxPoints: 20, criteria: "Experiencia comprobable o potencial claro para la vacante." },
  { id: "availability", label: "Disponibilidad", maxPoints: 20, criteria: "Horario compatible, inicio inmediato y posibilidad de asistir a entrevista." },
  { id: "proximity", label: "Cercania", maxPoints: 20, criteria: "Zona, transporte y facilidad real de traslado." },
  { id: "skills", label: "Habilidades", maxPoints: 20, criteria: "Habilidades tecnicas o blandas relevantes para el puesto." },
  { id: "attitude", label: "Actitud", maxPoints: 20, criteria: "Interes, claridad, seguimiento, trato y motivacion." },
];

export const HDRS_RECOVERY_MESSAGES = {
  ghosting:
    "Hola {{candidate_name}}, seguimos interesados en tu perfil. ¿Te gustaria continuar con el proceso?",
  undecided:
    "Hola {{candidate_name}}, necesitamos cerrar la vacante esta semana. ¿Deseas seguir participando?",
  finalist:
    "Hola {{candidate_name}}, tenemos nuevas oportunidades que podrian ajustarse a tu perfil. ¿Quieres que te comparta detalles?",
};

export const HDRS_TALENT_POOL = [
  { category: "Ventas", profiles: ["Vendedores", "Promotores", "Cajeros"] },
  { category: "Operativos", profiles: ["Almacenistas", "Choferes", "Produccion"] },
  { category: "Administrativos", profiles: ["RH", "Auxiliares", "Recepcion"] },
  { category: "Especializados", profiles: ["TI", "Marketing", "IA", "Desarrollo"] },
];

export const HDRS_JOB_FORMAT = [
  "Ubicacion exacta",
  "Modalidad: presencial, hibrida o remota",
  "Horarios",
  "Actividades",
  "Requisitos obligatorios, maximo 5",
  "Deseables, maximo 3",
  "Beneficios",
  "Salario",
  "Proceso de seleccion",
];

export const HDRS_KPIS = [
  "Tiempo de contratacion",
  "Costo por contratacion",
  "Conversion por fuente",
  "Tasa de respuesta WhatsApp",
  "Tasa de recuperacion",
  "Tasa de agendamiento",
  "Conversaciones iniciadas por IA",
  "Entrevistas realizadas",
  "Contrataciones generadas",
  "Retencion 30 dias",
  "Retencion 90 dias",
  "Rotacion",
];

export const HDRS_ROADMAP = [
  { phase: "0-30 dias", goals: ["CRM Reclutamiento", "WhatsApp IA", "Base candidatos", "Agenda automatica"] },
  { phase: "30-60 dias", goals: ["Evaluacion automatica", "Scoring IA", "Dashboard RH"] },
  { phase: "60-90 dias", goals: ["Entrevistas IA por voz", "Matching automatico", "Prediccion de rotacion"] },
  { phase: "90-180 dias", goals: ["Reclutamiento omnicanal", "ATS propio", "Talent Marketplace interno", "Agente RH autonomo"] },
];

export const HDRS_PROMPT_CONTEXT = `
Modelo Heavenly Dreams Recruiting System (HDRS):
- Meta: contratar mas rapido, reducir abandono, automatizar seguimiento y construir una base propia de talento.
- Objetivos: 72 horas para contratacion prioritaria, recuperar 30% de abandonos, automatizar 80% de conversaciones iniciales y medir KPIs.
- Flujo maestro: captacion omnicanal, contacto IA, precalificacion, arbol de edad, scoring, entrevista IA, agenda, recordatorios, recuperacion, talent pool y KPIs.
- Precalificacion minima: nombre, edad, ciudad, telefono, correo, horario, transporte, inicio inmediato, ultimo empleo, tiempo laborado, funciones, escolaridad y puesto deseado.
- Scoring: experiencia 0-20, disponibilidad 0-20, cercania 0-20, habilidades 0-20 y actitud 0-20. 90-100 Prioridad A, 70-89 B, 50-69 C, menor 50 descartar con respeto o mover a talent pool.
- Menor de 16: no continuar por cumplimiento laboral. 16-17: pedir carta responsiva, tutor legal, INE del tutor y comprobante. Edad valida: continuar evaluacion.
- Recuperacion: ghosting, indecisos y finalistas se contactan con mensajes breves, respetuosos y con opcion clara de continuar o cerrar.
- Talent pool: clasificar en Ventas, Operativos, Administrativos o Especializados.
`.trim();
