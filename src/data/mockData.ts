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

export const FUNNEL_DATA: any[] = [];

export const PERFORMANCE_DATA: any[] = [];

export const CANDIDATES_PER_JOB_DATA: any[] = [];

export const MOCK_AGENTS: any[] = [];

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

export const AGENT_LOGS: any[] = [];

