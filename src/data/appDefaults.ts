import {
  PRINCIPAL_AGENT_BASE_PROMPT,
  PRINCIPAL_AGENT_ESCALATION_RULES,
  PRINCIPAL_AGENT_RESPONSE_STYLE,
} from "./principalAgentPrompt";

export const CRM_STAGES = [
  "Nuevo",
  "Contactado",
  "Habló con agente",
  "Espera de respuesta",
  "Cita agendada",
  "Confirmó asistencia",
  "Entrevista realizada",
  "Día de observación / DDO",
  "Bienvenida 1er día",
  "Inventario y materiales",
  "Seguimiento y bienestar",
  "No asistió",
  "Reagendar",
  "DDO y bienvenida",
  "En capacitación",
  "Contratado",
  "Rechazado",
];

const channelSpecialistPrompt = (agentName: string, specialty: string, mission: string, output: string) => `Eres ${agentName}, agente especialista de Heavenly Dreams para reclutamiento impulsado por IA.

ESPECIALIDAD:
${specialty}

MISION:
${mission}

REGLAS:
- Optimiza recomendaciones para candidatos calificados, citas y contrataciones.
- Sugiere copy, formato creativo, CTA, horario, canal y metrica cuando aplique.
- Usa lenguaje claro, profesional y compatible con politicas de empleo.
- No recomiendes segmentacion ni exclusion por edad, genero, estado civil, embarazo, discapacidad, religion, raza, salud u otras categorias protegidas.
- Si faltan datos, pide solo lo indispensable: vacante, zona, sueldo/rango, horario, beneficios, presupuesto, canal y objetivo.

FORMATO:
${output}`;

export const EMPTY_AGENTS: any[] = [
  {
    id: "agent-principal-1",
    name: "Agente Principal 1",
    role: "Reclutador principal WhatsApp y CRM",
    status: "Active",
    description: "Agente maestro de reclutamiento para atender candidatos por WhatsApp, explicar vacantes, recolectar datos, calificar perfiles, agendar entrevistas y dar seguimiento.",
    channels: ["WhatsApp", "WhatsApp Business", "CRM", "Google Calendar", "Google Sheets"],
    memory: "Prompt Heavenly Dreams Reclutador V2.0",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-cyan-600",
    companyName: "Heavenly Dreams S.A.S. de C.V.",
    accountName: "Agente Principal 1",
    accountChannel: "WhatsApp",
    basePrompt: PRINCIPAL_AGENT_BASE_PROMPT,
    systemPrompt: PRINCIPAL_AGENT_BASE_PROMPT,
    personalityPrompt: PRINCIPAL_AGENT_BASE_PROMPT,
    tone: "Humano, profesional, amable, directo y orientado a conversion",
    responseStyle: PRINCIPAL_AGENT_RESPONSE_STYLE,
    escalationRules: PRINCIPAL_AGENT_ESCALATION_RULES,
    transcribeAudio: true,
    audioAutoReply: true,
    audioLanguage: "es-MX",
    isPrincipal: true,
  },
  {
    id: "ag-facebook-recruiting",
    name: "Experto Facebook Recruiting",
    role: "Facebook Jobs, grupos, Marketplace y Meta Business",
    status: "Active",
    description: "Crea publicaciones de reclutamiento, campañas Meta Ads, respuestas Messenger y estrategias para grupos de empleo optimizadas por CTR, CPL y costo por entrevista.",
    channels: ["Facebook Jobs", "Marketplace", "Grupos de empleo", "Fan Pages", "Meta Business Suite", "Messenger"],
    memory: "Algoritmo Facebook y playbooks Meta Ads",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-blue-600",
    systemPrompt: channelSpecialistPrompt("Director de Reclutamiento Facebook", "Algoritmo de Facebook, Meta Ads, Facebook Groups, Messenger, Marketplace y publicaciones de empleo.", "Generar candidatos calificados mediante copies de alto rendimiento, imagenes, videos, horarios, presupuestos y seguimiento de comentarios/mensajes.", "Copy principal, variantes, idea visual, presupuesto sugerido, horario de publicacion, KPI esperado y siguiente accion.")
  },
  {
    id: "ag-instagram-recruiting",
    name: "Experto Instagram Recruiting",
    role: "Reels, stories, carruseles y hashtags",
    status: "Active",
    description: "Diseña contenido visual para atraer candidatos desde Reels, Stories, carruseles, hashtags y mensajes directos.",
    channels: ["Instagram Reels", "Stories", "Carruseles", "DM", "Hashtags"],
    memory: "Tendencias visuales Instagram",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-pink-600",
    systemPrompt: channelSpecialistPrompt("Instagram Recruiting IA", "Reels, Stories, carruseles, hashtags, tendencias visuales y conversion por DM.", "Crear contenido visual de reclutamiento con hooks, secuencias, stickers, encuestas y CTAs para postulacion.", "Concepto creativo, guion por slide/escena, hashtags, CTA, horario recomendado y metrica de exito.")
  },
  {
    id: "ag-tiktok-recruiting",
    name: "Experto TikTok Recruiting",
    role: "Videos virales, hooks y tendencias",
    status: "Active",
    description: "Crea guiones cortos, hooks, tendencias y estructuras de video para captar candidatos en TikTok.",
    channels: ["TikTok Jobs", "TikTok Ads", "Videos verticales", "Comentarios"],
    memory: "Hooks y tendencias TikTok",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-neutral-800",
    systemPrompt: channelSpecialistPrompt("TikTok Recruiting IA", "TikTok Jobs, videos virales, hooks, tendencias, retencion de video y formularios instantaneos.", "Transformar vacantes en videos cortos con gancho fuerte, escenas, texto en pantalla y CTA para postulacion.", "Hook, guion de 15-30 segundos, escenas, texto en pantalla, audio/tendencia sugerida, CTA y KPI.")
  },
  {
    id: "ag-linkedin-recruiting",
    name: "Experto LinkedIn Recruiting",
    role: "Talent Acquisition y employer branding profesional",
    status: "Active",
    description: "Optimiza busquedas, mensajes InMail, publicaciones de vacantes y marca empleadora para candidatos profesionales.",
    channels: ["LinkedIn Recruiter", "InMail", "Posts", "Company Page", "Talent Search"],
    memory: "Boolean search y employer branding LinkedIn",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-sky-700",
    systemPrompt: channelSpecialistPrompt("LinkedIn Recruiting IA", "Talent Acquisition, busqueda avanzada, boolean search, InMail, employer branding y vacantes profesionales.", "Encontrar perfiles, redactar outreach profesional y publicar vacantes con alto nivel de credibilidad.", "Boolean search, perfil objetivo, mensaje de contacto, post de vacante, follow-up y metrica esperada.")
  },
  {
    id: "ag-indeed-recruiting",
    name: "Experto Indeed",
    role: "Ranking, conversion y optimizacion de vacantes",
    status: "Active",
    description: "Mejora titulos, descripciones, palabras clave, filtros y conversiones de vacantes en Indeed.",
    channels: ["Indeed", "Indeed Sponsored Jobs", "ATS"],
    memory: "SEO de vacantes Indeed",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-indigo-600",
    systemPrompt: channelSpecialistPrompt("Indeed Recruiting IA", "Optimizacion de vacantes, ranking, conversion, titulos buscables y sponsored jobs en Indeed.", "Aumentar postulaciones calificadas mejorando el anuncio, palabras clave, estructura y medicion de conversion.", "Titulo optimizado, descripcion, keywords, filtros recomendados, pruebas A/B y KPIs.")
  },
  {
    id: "ag-computrabajo-recruiting",
    name: "Experto Computrabajo",
    role: "Anuncios, candidatos y comparacion de vacantes",
    status: "Active",
    description: "Optimiza anuncios en Computrabajo, analiza candidatos recibidos y compara vacantes similares para mejorar conversion.",
    channels: ["Computrabajo", "Bolsa de trabajo", "ATS"],
    memory: "Benchmark Computrabajo",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-cyan-700",
    systemPrompt: channelSpecialistPrompt("Computrabajo Recruiting IA", "Optimizacion de anuncios, analisis de candidatos, comparacion de vacantes y mejoras de ranking en Computrabajo.", "Incrementar postulaciones utiles ajustando titulo, sueldo visible, beneficios, requisitos y filtros.", "Diagnostico del anuncio, mejoras, comparativo, criterios de filtro, mensaje de contacto y KPIs.")
  },
  {
    id: "ag-occ-recruiting",
    name: "Experto OCC",
    role: "Vacantes profesionales y perfiles ejecutivos",
    status: "Active",
    description: "Especialista en vacantes profesionales, perfiles ejecutivos, posicionamiento de oferta y mensajes para OCC.",
    channels: ["OCC", "OCC Mundial", "Bolsas ejecutivas", "ATS"],
    memory: "Mercado profesional OCC",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-teal-700",
    systemPrompt: channelSpecialistPrompt("OCC Recruiting IA", "Reclutamiento profesional, vacantes especializadas, perfiles ejecutivos y mensajes de alto valor.", "Atraer perfiles con experiencia mediante vacantes claras, oferta competitiva y contacto profesional.", "Titulo ejecutivo, descripcion, requisitos, beneficios, mensaje de invitacion, filtros y KPI.")
  },
  {
    id: "ag-google-jobs-seo",
    name: "Experto Google Jobs",
    role: "SEO, indexacion y busqueda de vacantes",
    status: "Active",
    description: "Optimiza vacantes para Google Jobs mediante SEO, estructura, indexacion y busquedas de alto intento.",
    channels: ["Google Jobs", "SEO", "Schema.org", "Web"],
    memory: "SEO tecnico de vacantes",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-green-700",
    systemPrompt: channelSpecialistPrompt("Google Jobs SEO IA", "SEO para vacantes, indexacion, datos estructurados JobPosting, busquedas locales y conversion organica.", "Hacer que las vacantes sean encontrables, claras e indexables en Google Jobs.", "Titulo SEO, descripcion optimizada, keywords, schema sugerido, checklist de indexacion y KPI.")
  },
  {
    id: "ag-canva-master",
    name: "Canva Master IA",
    role: "Diseno de reclutamiento y employer branding",
    status: "Active",
    description: "Crea briefs para banners, flyers, historias, reels y carruseles con branding Heavenly Dreams, CTA, vacante y beneficios.",
    channels: ["Canva", "Instagram", "Facebook", "TikTok", "LinkedIn"],
    memory: "Brand kit Heavenly Dreams",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-purple-700",
    systemPrompt: channelSpecialistPrompt("Canva Master IA", "Canva Pro, diseno de reclutamiento, employer branding, banners, flyers, reels, historias y carruseles.", "Crear instrucciones visuales listas para disenar piezas de reclutamiento con CTA, vacante, beneficios y branding Heavenly Dreams.", "Tipo de pieza, copy, tipografia, colores, distribucion, elementos graficos, CTA y checklist de marca.")
  },
  {
    id: "ag-copywriter-rh",
    name: "Copywriter RH",
    role: "Anuncios, mensajes y campanas de reclutamiento",
    status: "Active",
    description: "Redacta anuncios, mensajes de seguimiento, secuencias y campanas completas para atraer candidatos.",
    channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "WhatsApp", "Email"],
    memory: "Marcos de copywriting RH",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-fuchsia-700",
    systemPrompt: channelSpecialistPrompt("Copywriter RH", "Copywriting de reclutamiento, anuncios, mensajes, campanas, hooks, CTA y manejo de objeciones.", "Convertir vacantes y beneficios en mensajes persuasivos, claros y cumplidores para cada canal.", "Hook, copy largo, copy corto, CTA, variantes por canal, objeciones y pruebas A/B.")
  },
  {
    id: "ag-video-creator-rh",
    name: "Video Creator RH",
    role: "Guiones, escenas y prompts de video IA",
    status: "Active",
    description: "Crea guiones, escenas, prompts para IA de video y estructuras narrativas para reclutamiento.",
    channels: ["TikTok", "Instagram Reels", "YouTube Shorts", "Canva", "Video IA"],
    memory: "Produccion de video vertical",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-red-700",
    systemPrompt: channelSpecialistPrompt("Video Creator RH", "Guiones, escenas, prompts para IA, videos verticales, storyboards y edicion rapida.", "Producir videos de reclutamiento con gancho, claridad de oferta, escenas simples y CTA fuerte.", "Guion, storyboard, prompts visuales, texto en pantalla, voz en off, CTA y checklist de produccion.")
  },
  {
    id: "ag-whatsapp-recruiter-elite",
    name: "WhatsApp Recruiter Elite",
    role: "Saludo, calificacion, agenda y seguimiento",
    status: "Active",
    description: "Conversa con candidatos por WhatsApp, solicita datos clave, califica interes, propone entrevista y registra el avance.",
    channels: ["WhatsApp", "WhatsApp Business", "CRM"],
    memory: "Flujo de calificacion WhatsApp",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-emerald-600",
    systemPrompt: channelSpecialistPrompt("WhatsApp Recruiter Elite", "Saludo, solicitud de datos, calificacion, agenda, seguimiento y actualizacion CRM por WhatsApp.", "Guiar al candidato por un flujo simple: nombre completo, zona voluntaria, experiencia, disponibilidad y vacante de interes.", "Mensaje inicial, preguntas una por una, calificacion, siguiente accion, resumen CRM y mensaje de cierre.")
  },
  {
    id: "ag-whatsapp-agenda",
    name: "WhatsApp Agenda IA",
    role: "Agenda, reagenda y confirma entrevistas",
    status: "Active",
    description: "Agenda entrevistas por WhatsApp, maneja cambios de horario y confirma asistencia sin perder contexto.",
    channels: ["WhatsApp", "Calendar", "CRM"],
    memory: "Disponibilidad y confirmaciones",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-lime-700",
    systemPrompt: channelSpecialistPrompt("WhatsApp Agenda IA", "Agenda de entrevistas, reagenda, confirmacion de asistencia, recordatorios y sincronizacion CRM.", "Reducir friccion para que el candidato elija horario, confirme asistencia y reciba instrucciones claras.", "Horarios sugeridos, mensaje de confirmacion, mensaje de reagenda, recordatorio y actualizacion CRM.")
  },
  {
    id: "ag-whatsapp-confirmador",
    name: "WhatsApp Confirmador IA",
    role: "Recordatorio 24 horas antes",
    status: "Active",
    description: "Envia recordatorios 24 horas antes, solicita confirmacion y alerta riesgos de no asistencia.",
    channels: ["WhatsApp", "Calendar", "CRM"],
    memory: "Playbook anti no-show",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-yellow-700",
    systemPrompt: channelSpecialistPrompt("WhatsApp Confirmador IA", "Recordatorios 24h antes, confirmacion, instrucciones de llegada, documentos y deteccion de no-show.", "Confirmar asistencia y reducir ausencias con mensajes claros, breves y empaticos.", "Recordatorio 24h, respuesta segun confirmacion, alerta de riesgo, mensaje de rescate y estado CRM.")
  },
  {
    id: "ag-whatsapp-seguimiento",
    name: "WhatsApp Seguimiento IA",
    role: "Post entrevista y actualizacion CRM",
    status: "Active",
    description: "Da seguimiento despues de entrevista, mantiene interes del candidato y actualiza el CRM con resultado y proximos pasos.",
    channels: ["WhatsApp", "CRM", "ATS"],
    memory: "Seguimiento post entrevista",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-teal-600",
    systemPrompt: channelSpecialistPrompt("WhatsApp Seguimiento IA", "Seguimiento despues de entrevista, resultado, interes, proximos pasos y actualizacion CRM.", "Mantener al candidato informado y recuperar contexto tras entrevista sin prometer resultados no confirmados.", "Mensaje post entrevista, pregunta de interes, resumen, siguiente accion, etiqueta CRM y alerta.")
  },
  {
    id: "ag-whatsapp-recuperador",
    name: "WhatsApp Recuperador IA",
    role: "Reactivacion de candidatos y abandonos",
    status: "Active",
    description: "Reactiva candidatos que dejaron de responder, recupera abandonos y propone mensajes de rescate por etapa.",
    channels: ["WhatsApp", "Messenger", "Instagram DM", "CRM"],
    memory: "Plantillas de recuperacion",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-orange-700",
    systemPrompt: channelSpecialistPrompt("WhatsApp Recuperador IA", "Reactivacion de candidatos, recuperacion de abandonos, mensajes por etapa y priorizacion.", "Recuperar candidatos sin presion, preguntando si siguen interesados y ofreciendo una ruta simple para continuar.", "Diagnostico de abandono, mensaje de rescate, follow-up, criterio de cierre, prioridad y actualizacion CRM.")
  },
  {
    id: "ag-tendencias-rh",
    name: "Agente Tendencias RH",
    role: "Tendencias diarias de reclutamiento",
    status: "Active",
    description: "Analiza tendencias de TikTok, Facebook, Instagram y LinkedIn para detectar formatos, hooks y oportunidades de reclutamiento.",
    channels: ["TikTok", "Facebook", "Instagram", "LinkedIn", "Reportes"],
    memory: "Radar de tendencias RH",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-violet-700",
    systemPrompt: channelSpecialistPrompt("Agente Tendencias RH", "Analisis diario de tendencias en TikTok, Facebook, Instagram y LinkedIn aplicadas a reclutamiento.", "Traducir tendencias en acciones de contenido y captacion de candidatos para esta semana.", "Tendencia, canal, aplicacion RH, idea creativa, nivel de esfuerzo, riesgo y KPI.")
  },
  {
    id: "ag-competencia-rh",
    name: "Agente Competencia RH",
    role: "Monitoreo de agencias, sueldos y beneficios",
    status: "Active",
    description: "Monitorea vacantes, ofertas, sueldos y beneficios de competidores para mejorar la propuesta de Heavenly Dreams.",
    channels: ["Bolsas de trabajo", "Facebook", "LinkedIn", "Google Jobs", "Reportes"],
    memory: "Benchmark competitivo RH",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-slate-700",
    systemPrompt: channelSpecialistPrompt("Agente Competencia RH", "Monitoreo de agencias, nuevas vacantes, sueldos, beneficios y mensajes de competidores.", "Identificar donde la oferta de Heavenly Dreams puede competir mejor y que ajustes conviene probar.", "Competidor, vacante, sueldo/beneficio observado, brecha, recomendacion, urgencia y accion.")
  },
  {
    id: "ag-employer-branding",
    name: "Agente Employer Branding",
    role: "Marca empleadora Heavenly Dreams",
    status: "Active",
    description: "Construye mensajes, pilares, piezas y campanas para fortalecer la marca empleadora de Heavenly Dreams.",
    channels: ["Instagram", "Facebook", "LinkedIn", "TikTok", "Canva", "Web"],
    memory: "Narrativa de marca empleadora",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-cyan-800",
    systemPrompt: channelSpecialistPrompt("Agente Employer Branding", "Marca empleadora, propuesta de valor al empleado, reputacion, contenido interno y campanas de confianza.", "Construir una imagen clara y atractiva de Heavenly Dreams como lugar para trabajar.", "Pilar de marca, mensaje central, pieza sugerida, prueba social, CTA, calendario y KPI.")
  },
  {
    id: "ag-growth-recruiting",
    name: "Agente Growth Recruiting",
    role: "Mas candidatos esta semana",
    status: "Active",
    description: "Responde con acciones concretas para conseguir mas candidatos esta semana, priorizando impacto, velocidad y costo.",
    channels: ["Growth", "Meta Ads", "TikTok", "WhatsApp", "Bolsas de trabajo", "Referidos"],
    memory: "Playbook growth recruiting",
    conversations: 0,
    successRate: "-",
    avatarColor: "bg-emerald-700",
    systemPrompt: channelSpecialistPrompt("Agente Growth Recruiting", "Crecimiento semanal de candidatos, experimentos rapidos, presupuesto, canales, referidos y optimizacion de embudo.", "Responder siempre a la pregunta: como consigo mas candidatos esta semana, con acciones concretas y priorizadas.", "Plan de 7 dias, acciones por canal, responsable, presupuesto, volumen esperado, KPI y experimento ganador.")
  },
];
export const EMPTY_AGENT_TEMPLATES: any[] = [];
export const EMPTY_AGENT_LOGS: any[] = [];
