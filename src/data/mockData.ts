export const MOCK_JOBS: any[] = [];

export const CRM_STAGES = [
  "Nuevo",
  "Contactado",
  "Espera de respuesta",
  "Cita agendada",
  "Confirmó asistencia",
  "Entrevista realizada",
  "No asistió",
  "Reagendar",
  "DDO y bienvenida",
  "En capacitación",
  "Contratado",
  "Rechazado"
];

export const MOCK_CANDIDATES: any[] = [
  {
    id: "cand-1",
    name: "Sofía Delgado",
    email: "sofia.delgado@example.com",
    phone: "+34 601 234 567",
    role: "Sr Frontend Developer",
    stage: "Cita agendada",
    source: "LinkedIn",
    rating: 5,
    location: "Madrid, ES",
    pool: "Frontend",
    experience: "5 años",
    salaryDemand: "$45k - $50k / año",
    cvUrl: "https://drive.google.com/open?id=1CV_SofiaDelgado_FrontEnd2026",
    notes: "Excelente portafolio en React y Tailwind. Demostró excelente comunicación en el screening inicial."
  },
  {
    id: "cand-2",
    name: "Mateo Silva",
    email: "mateo.silva@example.com",
    phone: "+54 9 11 9876 5432",
    role: "Backend Engineer (Node.js)",
    stage: "Nuevo",
    source: "Facebook Messenger",
    rating: 4,
    location: "Buenos Aires, AR",
    pool: "Backend",
    experience: "3 años",
    salaryDemand: "$30k - $40k / año",
    cvUrl: "https://drive.google.com/open?id=1CV_MateoSilva_Backend2026",
    notes: "Contacto inicial a través de chatbot de reclutamiento. Fuerte base en bases de datos relacionales NoSQL."
  },
  {
    id: "cand-3",
    name: "Valeria Mendoza",
    email: "valeria.mendoza@example.com",
    phone: "+52 55 1234 5678",
    role: "Product Designer UI/UX",
    stage: "Contactado",
    source: "Instagram",
    rating: 5,
    location: "CDMX, MX",
    pool: "Design",
    experience: "6 años",
    salaryDemand: "$60k - $70k / año",
    cvUrl: "https://drive.google.com/open?id=1CV_ValeriaMendoza_UIUX",
    notes: "Envió portafolio destacado vía DM. Domina Figma, sistemas de diseño y prototipado de alta fidelidad."
  }
];

export const FUNNEL_DATA: any[] = [
  { stage: "Nuevo", count: 48, conversion: 100 },
  { stage: "Contactado", count: 36, conversion: 75 },
  { stage: "Cita agendada", count: 24, conversion: 50 },
  { stage: "Confirmó asistencia", count: 18, conversion: 38 },
  { stage: "Entrevista realizada", count: 12, conversion: 25 },
  { stage: "Contratado", count: 5, conversion: 10 }
];

export const PERFORMANCE_DATA: any[] = [
  { name: "Mar 26", hires: 4, timeToHire: 26 },
  { name: "Abr 26", hires: 8, timeToHire: 22 },
  { name: "May 26", hires: 14, timeToHire: 18 }
];

export const CANDIDATES_PER_JOB_DATA: any[] = [
  { name: "Sr Frontend Developer", count: 18 },
  { name: "Backend Engineer (Node.js)", count: 14 },
  { name: "Product Designer UI/UX", count: 8 }
];

export const HISTORICAL_CANDIDATES = [
  { id: "h-1", name: "Gabriel Torres", stage: "Contratado", createdAt: Date.now() - 12 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-2", name: "Lucía Fernández", stage: "Contratado", createdAt: Date.now() - 25 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-3", name: "Andrés Muñoz", stage: "Contratado", createdAt: Date.now() - 42 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-4", name: "Isabella Ortiz", stage: "Contratado", createdAt: Date.now() - 5 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-5", name: "Nicolás Prada", stage: "En capacitación", createdAt: Date.now() - 18 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-6", name: "Camila Vargas", stage: "En capacitación", createdAt: Date.now() - 29 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-7", name: "Alejandro Gómez", stage: "DDO y bienvenida", createdAt: Date.now() - 8 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-8", name: "Mariana Rojas", stage: "Entrevista realizada", createdAt: Date.now() - 3 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-9", name: "Tomás Herrera", stage: "Entrevista realizada", createdAt: Date.now() - 15 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-10", name: "Santiago Castro", stage: "Entrevista realizada", createdAt: Date.now() - 22 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-11", name: "Valentina Peña", stage: "Confirmó asistencia", createdAt: Date.now() - 2 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-12", name: "Matías Medina", stage: "Confirmó asistencia", createdAt: Date.now() - 11 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-13", name: "Elena Mora", stage: "Cita agendada", createdAt: Date.now() - 1 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-14", name: "Daniel Ruiz", stage: "Cita agendada", createdAt: Date.now() - 4 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-15", name: "Sofía Ibáñez", stage: "Cita agendada", createdAt: Date.now() - 10 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-16", name: "Lucas Gil", stage: "Espera de respuesta", createdAt: Date.now() - 6 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-17", name: "Martina Soler", stage: "Espera de respuesta", createdAt: Date.now() - 14 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-18", name: "Paula Vidal", stage: "Contactado", createdAt: Date.now() - 7 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-19", name: "Javier Sanz", stage: "Contactado", createdAt: Date.now() - 19 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-20", name: "Daniela Alarcón", stage: "Contactado", createdAt: Date.now() - 31 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-21", name: "Leo Franco", stage: "Nuevo", createdAt: Date.now() - 1 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-22", name: "Emma Romero", stage: "Nuevo", createdAt: Date.now() - 2 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-23", name: "Bautista Flores", stage: "Nuevo", createdAt: Date.now() - 5 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-24", name: "Sara Navarro", stage: "Nuevo", createdAt: Date.now() - 12 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-25", name: "Thiago Molina", stage: "Rechazado", createdAt: Date.now() - 16 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-26", name: "Alma Benítez", stage: "Rechazado", createdAt: Date.now() - 35 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-27", name: "Guillermo Lozano", stage: "No asistió", createdAt: Date.now() - 20 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" },
  { id: "h-28", name: "Felipe Domínguez", stage: "Reagendar", createdAt: Date.now() - 9 * 86400000, jobId: "job-2", role: "Backend Engineer (Node.js)" },
  { id: "h-29", name: "Constanza Ferrer", stage: "Contratado", createdAt: Date.now() - 55 * 86400000, jobId: "job-3", role: "Product Designer UI/UX" },
  { id: "h-30", name: "Renata Méndez", stage: "Contratado", createdAt: Date.now() - 75 * 86400000, jobId: "job-1", role: "Sr Frontend Developer" }
];

export const MOCK_AGENTS: any[] = [
  {
    id: "ag-ad-creator-jobs",
    name: "Creador de Anuncios de Empleo",
    role: "Creador de Vacantes a base de Prompt",
    status: "Active",
    description: "Diseña descripciones de ofertas laborales atractivas y persuasivas optimizadas para portales de empleo, indicando responsabilidades, requisitos y beneficios, a partir de breves instrucciones o un rol.",
    channels: ["LinkedIn", "Email", "ATS"],
    memory: "1.2 GB",
    conversations: 42,
    successRate: "96%",
    avatarColor: "bg-cyan-500",
    systemPrompt: "Eres un agente AI redactor de ofertas de empleo. Escribes textos atractivos, profesionales y optimizados. A partir del prompt o rol que te proporcione el usuario, genera una descripción detallada en español que incluya: Introducción cautivadora, Responsabilidades clave, Requisitos indispensables (e ideales), Oferta/Beneficios y una clara Llamada a la Acción (CTA) para postularse. Usa formato Markdown con emojis opcionales."
  },
  {
    id: "ag-fb-rules",
    name: "Especialista en Políticas Facebook Ads",
    role: "Auditor y Consultor sobre regulaciones de Facebook",
    status: "Active",
    description: "Analiza textos de anuncios para validar que cumplan las políticas de publicidad de Meta para Categorías Especiales de Anuncio (Empleo), asegurando que no contengan discriminación edad/género, promesas engañosas o lenguaje prohibido.",
    channels: ["Facebook", "Instagram"],
    memory: "0.8 GB",
    conversations: 29,
    successRate: "98%",
    avatarColor: "bg-blue-600",
    systemPrompt: "Eres un Especialista y Auditor de Políticas de Facebook Ads (Meta) enfocado en categorías de anuncio especial de Empleo (Housing, Employment, Credit - HEC). Analiza el texto u oferta proporcionada por el usuario en busca de infracciones como: discriminación por edad, género, raza, estatus familiar, menciones de atributos personales, promesas fraudulentas o falta de descargo de responsabilidad. Devuelve un reporte claro en español que indique: 1) Estado (APROBADO o CON DETALLES DE CORRECCIÓN), 2) Lista de puntos que violan o rozan el límite de las reglas, y 3) Sugerencias redactadas paso a paso para corregirlo cumpliendo las normas al 100%."
  },
  {
    id: "ag-ad-creator-gen",
    name: "Creador Creativo de Anuncios",
    role: "Generador de Cuentas, Copys y Ganchos Publicitarios",
    status: "Active",
    description: "Redacta múltiples variaciones creativas de copies publicitarios para redes sociales enfocados en rendimiento (Performance), utilizando marcos persuasivos como AIDA (Atención, Interés, Deseo, Acción) y PAS (Problema, Agitación, Solución).",
    channels: ["WhatsApp", "Instagram", "Facebook", "TikTok"],
    memory: "1.5 GB",
    conversations: 55,
    successRate: "94%",
    avatarColor: "bg-purple-600",
    systemPrompt: "Eres un redactor creativo experto en anuncios publicitarios y copywriting de alto rendimiento (Social Media Ads). Tu objetivo es transformar ideas breves o vacantes en copies memorables. Para cualquier solicitud, genera: 1) Gancho de alto impacto (Hook), 2) Copy principal estructurado bajo una fórmula publicitaria (por ejemplo, AIDA o PAS) y 3) Varias opciones cortas ideales para historias de Instagram o TikTok. El tono es motivador, persuasivo y dinámico."
  }
];

export const MOCK_PREBUILT_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Reclutador Tech Sr',
    description: 'Especializado en perfiles de desarrollo (React, Node, DevOps). Evalúa prueba técnica inicial.',
    icon: 'Code'
  },
  {
    id: 'tpl-2',
    name: 'Cazatalentos Ejecutivos',
    description: 'Tono formal y persuasivo. Busca perfiles C-level y VP en la industria.',
    icon: 'Briefcase'
  },
  {
    id: 'tpl-3',
    name: 'Asistente de Inclusión',
    description: 'Revisa descripciones de trabajo y CVs para asegurar sesgo cero y promover diversidad.',
    icon: 'Users'
  }
];

export const AGENT_LOGS: any[] = [
  { date: "2026-05-30", time: "10:15:32", agent: "Creador de Anuncios de Empleo", action: "Generó borrador de vacante para 'Sr Frontend Developer' optimizado bajo SEO.", type: "outreach" },
  { date: "2026-05-30", time: "09:42:11", agent: "Especialista en Políticas Facebook Ads", action: "Auditó anuncio de reclutamiento de pilotos y alertó sobre posible sesgo de edad.", type: "learning" },
  { date: "2026-05-30", time: "08:11:04", agent: "Creador Creativo de Anuncios", action: "Generó 3 variaciones de copy usando el marco de persuasión AIDA.", type: "outreach" },
  { date: "2026-05-29", time: "18:24:50", agent: "Especialista en Políticas Facebook Ads", action: "Completó validación de campaña masiva de operadores de telemercadeo. Estado: Aprobada.", type: "match" },
  { date: "2026-05-29", time: "14:15:22", agent: "Creador de Anuncios de Empleo", action: "Sincronizó requisitos de vacante de 'Analista DevOps' desde solicitud de Jira.", type: "screening" }
];

