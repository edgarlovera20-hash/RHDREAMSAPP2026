import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  stage: string;
  source: string;
  rating: number;
  location: string;
  pool: string;
  experience: string;
  salaryDemand: string;
  cvUrl: string;
  notes: string;
  jobId?: string;
  companyId?: string;
  createdAt: number;
  updatedAt: number;
  assignedAgentId?: string;
  
  // Extension fields for mock/advanced views compatibility
  experienceTime?: string;
  linkedin?: string;
  age?: string;
  lastJob?: string;
  whatsapp?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Draft" | "Active" | "Closed" | "Pausada";
  description: string;
  requirements: string[];
  salaryRange?: string;
  sourceChannels?: string[];
  companyId?: string;
  applicants: number;
  platforms: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Appointment {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  companyId?: string;
  date: string;
  time: string;
  status: "scheduled" | "confirmed" | "attended" | "no_show" | "rescheduled";
  calendarEventId?: string;
  meetingLink?: string;
  notes?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  candidateId: string;
  channel: "whatsapp" | "email" | "messenger" | "instagram" | "manual";
  direction: "inbound" | "outbound";
  body: string;
  sender: string;
  status: "sent" | "delivered" | "read" | "failed" | "pending_approval";
  createdAt: number;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  actions: string[];
  conditions?: any[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  candidateId?: string;
  createdAt: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "Active" | "Draft";
  description: string;
  channels: string[];
  memory: string;
  conversations: number;
  successRate: string;
  avatarColor: string;
  userId: string;
  createdAt: number;
  basePrompt: string;
}

// Initial bootstrap datasets matching mock values roughly
const INITIAL_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Sr Frontend Developer",
    department: "Desarrollo",
    location: "Madrid, ES (Híbrido)",
    status: "Active",
    description: "Buscamos un Ingeniero Frontend Senior con pasión por React, TypeScript y TailwindCSS.",
    requirements: ["5+ años de experiencia profesional", "React", "TypeScript", "TailwindCSS"],
    salaryRange: "$45k - $50k / año",
    applicants: 1,
    platforms: ["LinkedIn", "WhatsApp"],
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now() - 30 * 86400000
  },
  {
    id: "job-2",
    title: "Backend Engineer (Node.js)",
    department: "Tecnología",
    location: "Buenos Aires, AR (Remoto)",
    status: "Active",
    description: "Únete a nuestro equipo de backend de alto rendimiento construyendo microservicios robustos.",
    requirements: ["3+ años de experiencia", "Node.js", "Express", "PostgreSQL", "NoSQL"],
    salaryRange: "$30k - $40k / año",
    applicants: 1,
    platforms: ["Facebook", "LinkedIn"],
    createdAt: Date.now() - 15 * 86400000,
    updatedAt: Date.now() - 15 * 86400000
  },
  {
    id: "job-3",
    title: "Product Designer UI/UX",
    department: "Diseño de Producto",
    location: "CDMX, MX (Onsite)",
    status: "Active",
    description: "Buscamos un Diseñador UI/UX autónomo para diseñar el futuro de nuestro ecosistema empresarial.",
    requirements: ["4+ años de experiencia", "Figma", "Sistemas de Diseño", "Prototipado"],
    salaryRange: "$60k - $70k / año",
    applicants: 1,
    platforms: ["Instagram", "TikTok"],
    createdAt: Date.now() - 5 * 86400000,
    updatedAt: Date.now() - 5 * 86400000
  }
];

const INITIAL_CANDIDATES: Candidate[] = [
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
    notes: "Excelente portafolio en React y Tailwind. Demostró excelente comunicación en el screening inicial.",
    createdAt: Date.now() - 10 * 86400000,
    updatedAt: Date.now() - 2 * 86400000,
    jobId: "job-1"
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
    notes: "Contacto inicial a través de chatbot de reclutamiento. Fuerte base en bases de datos relacionales NoSQL.",
    createdAt: Date.now() - 4 * 86400000,
    updatedAt: Date.now() - 4 * 86400000,
    jobId: "job-2"
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
    notes: "Envió portafolio destacado vía DM. Domina Figma, sistemas de diseño y prototipado de alta fidelidad.",
    createdAt: Date.now() - 8 * 86400000,
    updatedAt: Date.now() - 3 * 86400000,
    jobId: "job-3"
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "appt-1",
    candidateId: "cand-1",
    candidateName: "Sofía Delgado",
    jobId: "job-1",
    date: "2026-06-05", // 5 days from local time 2026-05-30
    time: "10:00 AM",
    status: "scheduled",
    notes: "Entrevista técnica inicial con el equipo de Frontend.",
    createdAt: Date.now() - 2 * 86400000
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "msg-1",
    candidateId: "cand-1",
    channel: "whatsapp",
    direction: "inbound",
    body: "Hola, buenos días",
    sender: "them",
    status: "read",
    createdAt: Date.now() - 1000 * 3600
  },
  {
    id: "msg-2",
    candidateId: "cand-1",
    channel: "whatsapp",
    direction: "inbound",
    body: "Hola, quería saber si hay novedades de mi postulación.",
    sender: "them",
    status: "read",
    createdAt: Date.now() - 950 * 3600
  },
  {
    id: "msg-3",
    candidateId: "cand-2",
    channel: "messenger",
    direction: "outbound",
    body: "Te enviamos por correo el detalle de la oferta, por favor confírmanos si la recibiste.",
    sender: "me",
    status: "delivered",
    createdAt: Date.now() - 1000 * 7200
  },
  {
    id: "msg-4",
    candidateId: "cand-2",
    channel: "messenger",
    direction: "inbound",
    body: "Perfecto, me queda claro. ¡Gracias!",
    sender: "them",
    status: "read",
    createdAt: Date.now() - 990 * 7200
  },
  {
    id: "msg-5",
    candidateId: "cand-3",
    channel: "instagram",
    direction: "inbound",
    body: "Ok, adjunto mi portafolio.",
    sender: "them",
    status: "read",
    createdAt: Date.now() - 1000 * 18000
  }
];

const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "Autoservicio de Bienvenida Nuevo Candidato",
    trigger: "candidate.created",
    active: true,
    actions: ["send_whatsapp", "assign_agent"]
  },
  {
    id: "auto-2",
    name: "Seguimiento Automático 24h",
    trigger: "candidate.stage_changed",
    active: true,
    actions: ["wait", "send_email"]
  }
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "not-1",
    title: "Nueva aplicación recibida",
    message: "Valeria Mendoza postuló a Product Designer UI/UX",
    type: "success",
    read: false,
    candidateId: "cand-3",
    createdAt: Date.now() - 1000 * 3600
  },
  {
    id: "not-2",
    title: "Cita agendada",
    message: "Sofía Delgado eligió el horario 2026-06-05 a las 10:00 AM",
    type: "info",
    read: false,
    candidateId: "cand-1",
    createdAt: Date.now() - 2 * 3600 * 1000
  }
];

const INITIAL_AGENTS: Agent[] = [
  {
    id: "agent-1",
    name: "Atenea",
    role: "Agente de bienvenida e información",
    status: "Active",
    description: "Saluda cordialmente, explica los detalles de la vacante de Heavenly Dreams y precalifica candidatos mediante WhatsApp.",
    channels: ["whatsapp", "messenger", "instagram"],
    memory: "Fuerte memoria de contexto de reclutamiento",
    conversations: 124,
    successRate: "94.2%",
    avatarColor: "from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
    userId: "shared",
    createdAt: Date.now() - 15 * 86400000,
    basePrompt: "Eres Atenea, el asistente virtual de bienvenida e información de Heavenly Dreams. Tu objetivo es explicar la vacante de forma honesta, responder preguntas sobre condiciones de trabajo e infraestructura, y pasar el interés al reclutador humano."
  },
  {
    id: "agent-2",
    name: "Hermes",
    role: "Coordinador de entrevistas autónomo",
    status: "Active",
    description: "Ayuda a coordinar citas de forma automatizada e inteligente una vez que un candidato califica en el pipeline.",
    channels: ["whatsapp", "email"],
    memory: "Calendario integrado",
    conversations: 82,
    successRate: "89.5%",
    avatarColor: "from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    userId: "shared",
    createdAt: Date.now() - 10 * 86400000,
    basePrompt: "Eres Hermes, coordinador de reclutamiento de Heavenly Dreams. Tu labor es facilitar horarios disponibles, confirmar la asistencia a entrevistas y enviar recordatorios proactivos 24h/2h antes."
  }
];

// Seed databases if empty
export async function seedDatabaseIfEmpty() {
  try {
    let candSnapshot;
    try {
      candSnapshot = await getDocs(collection(db, "candidates"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "candidates");
      return;
    }

    if (candSnapshot.empty) {
      console.log("Seeding candidates...");
      for (const cand of INITIAL_CANDIDATES) {
        try {
          await setDoc(doc(db, "candidates", cand.id), cand);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "candidates");
        }
      }
    }

    let jobSnapshot;
    try {
      jobSnapshot = await getDocs(collection(db, "jobs"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "jobs");
      return;
    }

    if (jobSnapshot.empty) {
      console.log("Seeding jobs...");
      for (const j of INITIAL_JOBS) {
        try {
          await setDoc(doc(db, "jobs", j.id), j);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "jobs");
        }
      }
    }

    let apptSnapshot;
    try {
      apptSnapshot = await getDocs(collection(db, "appointments"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "appointments");
      return;
    }

    if (apptSnapshot.empty) {
      console.log("Seeding appointments...");
      for (const a of INITIAL_APPOINTMENTS) {
        try {
          await setDoc(doc(db, "appointments", a.id), a);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "appointments");
        }
      }
    }

    let msgSnapshot;
    try {
      msgSnapshot = await getDocs(collection(db, "messages"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "messages");
      return;
    }

    if (msgSnapshot.empty) {
      console.log("Seeding messages...");
      for (const m of INITIAL_MESSAGES) {
        try {
          await setDoc(doc(db, "messages", m.id), m);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "messages");
        }
      }
    }

    let autoSnapshot;
    try {
      autoSnapshot = await getDocs(collection(db, "automations"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "automations");
      return;
    }

    if (autoSnapshot.empty) {
      console.log("Seeding automations...");
      for (const a of INITIAL_AUTOMATIONS) {
        try {
          await setDoc(doc(db, "automations", a.id), a);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "automations");
        }
      }
    }

    let notSnapshot;
    try {
      notSnapshot = await getDocs(collection(db, "notifications"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "notifications");
      return;
    }

    if (notSnapshot.empty) {
      console.log("Seeding notifications...");
      for (const n of INITIAL_NOTIFICATIONS) {
        try {
          await setDoc(doc(db, "notifications", n.id), n);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "notifications");
        }
      }
    }

    let agentSnapshot;
    try {
      agentSnapshot = await getDocs(collection(db, "agents"));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "agents");
      return;
    }

    if (agentSnapshot.empty) {
      console.log("Seeding agents...");
      for (const ag of INITIAL_AGENTS) {
        const docRef = ag.id === "agent-1" || ag.id === "agent-2" ? ag.id : doc(collection(db, "agents")).id;
        const currentUserId = auth.currentUser?.uid || "shared";
        try {
          await setDoc(doc(db, "agents", docRef), {
            ...ag,
            id: docRef,
            userId: currentUserId
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "agents");
        }
      }
    }
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database: ", error);
    throw error;
  }
}
