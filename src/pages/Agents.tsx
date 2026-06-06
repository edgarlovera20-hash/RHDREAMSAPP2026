import { useState, useRef, useEffect } from 'react';
import { Bot, Plus, Search, BrainCircuit, Activity, Zap, MessageSquare, Briefcase, FileText, CheckCircle2, XCircle, Settings2, Code, Users, Download, Upload, Filter, Send, Copy, Loader2, Sparkles, Video, Image as ImageIcon, ExternalLink, Mic, Volume2, CalendarClock, Trash2, PlayCircle, ShieldCheck } from 'lucide-react';
import { EMPTY_AGENTS, EMPTY_AGENT_LOGS, EMPTY_AGENT_TEMPLATES } from '@/data/appDefaults';
import { CANVA_TEMPLATE_CATEGORIES, CANVA_TEMPLATE_PACKS, type CanvaTemplatePack } from '@/data/canvaTemplateLibrary';
import { AgentConfigModal } from '@/components/AgentConfigModal';
import { apiFetch, readApiJson } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  buildRecruiterAgentPrompt,
  DEFAULT_ACCOUNT_CHANNEL,
  DEFAULT_ACCOUNT_NAME,
  DEFAULT_COMPANY_NAME,
  DEFAULT_INTERVIEW_SLOTS,
  INTERVIEW_SCHEDULE_STORAGE_KEY,
  formatInterviewSlotsForPrompt,
  type InterviewSlot,
} from '@/lib/recruiterAgentPrompt';

const CANVA_FORMATS = [
  { id: 'instagram_post', label: 'Post Instagram', size: '1080 x 1080', icon: ImageIcon },
  { id: 'instagram_story', label: 'Story / Reel', size: '1080 x 1920', icon: Video },
  { id: 'facebook_post', label: 'Post Facebook', size: '1200 x 630', icon: ImageIcon },
  { id: 'linkedin_post', label: 'Post LinkedIn', size: '1200 x 627', icon: Briefcase },
  { id: 'tiktok_video', label: 'Video TikTok', size: '1080 x 1920', icon: Video }
];

const DEFAULT_AGENT_PERSONALITY = buildRecruiterAgentPrompt({
  agentName: 'Asistente RH',
  companyName: DEFAULT_COMPANY_NAME,
  accountName: DEFAULT_ACCOUNT_NAME,
  accountChannel: DEFAULT_ACCOUNT_CHANNEL,
});

const loadInterviewSlots = (): InterviewSlot[] => {
  try {
    const stored = localStorage.getItem(INTERVIEW_SCHEDULE_STORAGE_KEY);
    if (!stored) return DEFAULT_INTERVIEW_SLOTS;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_INTERVIEW_SLOTS;
  } catch (_error) {
    return DEFAULT_INTERVIEW_SLOTS;
  }
};

const buildAgentSystemPrompt = (agent: any, interviewSlots: InterviewSlot[] = loadInterviewSlots()) => {
  const companyName = agent.companyName || DEFAULT_COMPANY_NAME;
  const accountName = agent.accountName || DEFAULT_ACCOUNT_NAME;
  const accountChannel = agent.accountChannel || DEFAULT_ACCOUNT_CHANNEL;
  const personality = buildRecruiterAgentPrompt({
    agentName: agent.name,
    companyName,
    accountName,
    accountChannel,
    customPrompt: agent.personalityPrompt || agent.basePrompt || agent.systemPrompt,
  });
  const knowledgeItems = Array.isArray(agent.knowledgeBase) ? agent.knowledgeBase : [];
  const knowledgeSection = knowledgeItems.length
    ? `Base de consulta del agente:
${knowledgeItems.map((item: any, index: number) => `${index + 1}. [${item.type || 'text'}] ${item.title || 'Sin titulo'}\n${item.content || ''}`).join('\n\n')}`
    : 'Base de consulta del agente: sin documentos cargados. Si falta informacion, pregunta o escala antes de inventar.';
  const learningItems = Array.isArray(agent.learningMemory) ? agent.learningMemory.slice(0, 12) : [];
  const learningSection = learningItems.length
    ? `Autoconocimiento aprendido de conversaciones previas:
${learningItems.map((item: any, index: number) => `${index + 1}. ${item.lesson || item.summary || 'Interaccion registrada'}\nContexto: ${item.intent || 'Sin intencion'} / ${item.channel || accountChannel}\nEntrada: ${item.userText || ''}\nRespuesta usada: ${item.reply || ''}`).join('\n\n')}

Usa este autoconocimiento como referencia, pero no repitas respuestas palabra por palabra si el contexto cambia.`
    : 'Autoconocimiento aprendido: aun no hay experiencias registradas. Aprende de cada respuesta y evita inventar.';

  return `
Nombre del agente: ${agent.name}
Rol principal: ${agent.role}
Empresa/cuenta: ${companyName} / ${accountName}
Canal asignado: ${accountChannel}
Personalidad:
${personality}

Tono: ${agent.tone || 'Cercano, profesional y directo.'}
Estilo de respuesta: ${agent.responseStyle || 'Respuestas breves, útiles, con pasos claros y sin inventar información.'}
Reglas de escalamiento: ${agent.escalationRules || 'Escala si el candidato pregunta por temas legales, pagos, quejas, datos que no estén confirmados o situaciones delicadas.'}

${knowledgeSection}

${learningSection}

${formatInterviewSlotsForPrompt(interviewSlots)}

Audio:
- Si el candidato manda un audio y hay transcripción, responde usando la transcripción como mensaje original.
- No digas que escuchaste el audio directamente; di que revisaste el mensaje/transcripción.
- Si la transcripción no es clara, pide una confirmación breve.
  `.trim();
};

const AGENTS_STORAGE_KEY = 'rhdreams_agents';

const mergeDefaultAgents = (storedAgents: any[]) => {
  const storedIds = new Set(storedAgents.map(agent => agent.id));
  const missingDefaults = EMPTY_AGENTS.filter(agent => !storedIds.has(agent.id));
  return [...missingDefaults, ...storedAgents];
};

const loadStoredAgents = () => {
  try {
    const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!stored) return EMPTY_AGENTS;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? mergeDefaultAgents(parsed) : EMPTY_AGENTS;
  } catch (_error) {
    return EMPTY_AGENTS;
  }
};

export function Agents() {
  const [agents, setAgents] = useState<any[]>(loadStoredAgents);
  const [activeTab, setActiveTab] = useState<'agents' | 'templates' | 'tester' | 'schedule' | 'canva' | 'memory'>('agents');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const agentsImportRef = useRef<HTMLInputElement>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Sourcing');
  const [newAgentPersonality, setNewAgentPersonality] = useState(DEFAULT_AGENT_PERSONALITY);
  const [newAgentCompanyName, setNewAgentCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [newAgentAccountName, setNewAgentAccountName] = useState(DEFAULT_ACCOUNT_NAME);
  const [newAgentAccountChannel, setNewAgentAccountChannel] = useState(DEFAULT_ACCOUNT_CHANNEL);
  const [newAgentTone, setNewAgentTone] = useState('Cercano, profesional y directo');
  const [newAgentTranscribeAudio, setNewAgentTranscribeAudio] = useState(true);
  const [newAgentAudioAutoReply, setNewAgentAudioAutoReply] = useState(true);

  const [agentToConfig, setAgentToConfig] = useState<typeof EMPTY_AGENTS[0] | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dirtyFields, setDirtyFields] = useState<{name?: boolean, role?: boolean}>({});

  // Chat state
  const [activeChatAgent, setActiveChatAgent] = useState<typeof EMPTY_AGENTS[0] | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'agent', text: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [canvaFormat, setCanvaFormat] = useState('instagram_post');
  const [canvaCampaign, setCanvaCampaign] = useState('');
  const [canvaAudience, setCanvaAudience] = useState('');
  const [canvaOffer, setCanvaOffer] = useState('');
  const [canvaBrandTemplateId, setCanvaBrandTemplateId] = useState('');
  const [canvaTemplateCategory, setCanvaTemplateCategory] = useState('Todas');
  const [selectedCanvaTemplateId, setSelectedCanvaTemplateId] = useState(CANVA_TEMPLATE_PACKS[0].id);
  const [canvaResult, setCanvaResult] = useState<any>(null);
  const [isCreatingCanva, setIsCreatingCanva] = useState(false);
  const [aiImageResult, setAiImageResult] = useState<any>(null);
  const [isCreatingAiImage, setIsCreatingAiImage] = useState(false);
  const [metaPrimaryText, setMetaPrimaryText] = useState('');
  const [metaDailyBudget, setMetaDailyBudget] = useState(40);
  const [metaDurationDays, setMetaDurationDays] = useState(4);
  const [metaDestination, setMetaDestination] = useState<'whatsapp' | 'whatsapp_business' | 'messenger' | 'instagram'>('whatsapp_business');
  const [metaWhatsappNumber, setMetaWhatsappNumber] = useState('+52 1 56 2026 7412');
  const [metaPackageCopied, setMetaPackageCopied] = useState(false);
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>(loadInterviewSlots);
  const [slotDraft, setSlotDraft] = useState<InterviewSlot>({
    id: '',
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '12:00',
    capacity: 8,
    location: 'Oficina RH Heavenly Dreams',
    notes: '',
  });
  const [testerAgentId, setTesterAgentId] = useState('agent-principal-1');
  const [testerMessage, setTesterMessage] = useState('Hola inf');
  const [testerConversation, setTesterConversation] = useState<{ role: 'candidate' | 'agent'; text: string }[]>([]);
  const [testerResult, setTesterResult] = useState<{ expected: string; reply: string } | null>(null);
  const [isTestingConversation, setIsTestingConversation] = useState(false);
  const [persistentAgentMemories, setPersistentAgentMemories] = useState<any[]>([]);

  const selectedCanvaFormat = CANVA_FORMATS.find(format => format.id === canvaFormat) || CANVA_FORMATS[0];
  const selectedCanvaTemplate = CANVA_TEMPLATE_PACKS.find(template => template.id === selectedCanvaTemplateId) || CANVA_TEMPLATE_PACKS[0];
  const filteredCanvaTemplates = CANVA_TEMPLATE_PACKS.filter(template => canvaTemplateCategory === 'Todas' || template.category === canvaTemplateCategory);
  const localLearningMemories = agents.flatMap(agent =>
    (Array.isArray(agent.learningMemory) ? agent.learningMemory : []).map((memory: any) => ({
      ...memory,
      agentId: agent.id,
      agentName: agent.name,
      source: memory.source || 'Memoria local',
    }))
  );
  const allLearningMemories = [
    ...persistentAgentMemories.map((memory: any) => ({
      ...memory,
      source: memory.source || 'Memoria persistente',
      createdAt: typeof memory.createdAt === 'number' ? new Date(memory.createdAt).toISOString() : memory.createdAt,
    })),
    ...localLearningMemories,
  ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const canvaBrief = `Campaña: ${canvaCampaign}
Audiencia: ${canvaAudience}
Oferta principal: ${canvaOffer}
Formato: ${selectedCanvaFormat.label} (${selectedCanvaFormat.size})
Plantilla sugerida: ${selectedCanvaTemplate.title}
Buscar en Canva Templates: ${selectedCanvaTemplate.canvaSearchUrl}
Objetivo creativo: atraer candidatos calificados y llevarlos a postularse.
Dirección visual: ${selectedCanvaTemplate.visualDirection}
Copy sugerido:
- Hook: ${selectedCanvaTemplate.hook}
- Beneficio: ${canvaOffer || selectedCanvaTemplate.defaultOffer}
- CTA: ${selectedCanvaTemplate.cta}`;

  const defaultMetaPrimaryText = `${selectedCanvaTemplate.hook || 'Nueva oportunidad laboral'}

${canvaOffer || selectedCanvaTemplate.defaultOffer}

Escribenos por mensaje para recibir requisitos, horarios y siguientes pasos.

#TrabajoSiHay #EmpleosMexico #Reclutamiento #ContratacionInmediata`;

  const metaAdText = metaPrimaryText.trim() || defaultMetaPrimaryText;
  const metaAdPackage = {
    platform: 'Meta Ads',
    objective: 'Recibir mas mensajes',
    specialAdCategory: 'Empleo',
    campaign: canvaCampaign || 'Campana de reclutamiento',
    format: selectedCanvaFormat.label,
    creative: {
      primaryText: metaAdText,
      headline: 'Mas informacion',
      callToAction: 'Enviar mensaje',
      imageSource: aiImageResult?.image?.dataUrl ? 'Imagen IA generada en RHDreams' : 'Subir imagen o diseno descargado de Canva',
    },
    destination: {
      app: metaDestination,
      whatsappNumber: metaDestination === 'whatsapp' || metaDestination === 'whatsapp_business' ? metaWhatsappNumber : undefined,
      whatsappType: metaDestination === 'whatsapp_business' ? 'WhatsApp Business' : metaDestination === 'whatsapp' ? 'WhatsApp normal' : undefined,
    },
    budget: {
      dailyBudgetMxn: metaDailyBudget,
      durationDays: metaDurationDays,
      totalBudgetMxn: metaDailyBudget * metaDurationDays,
    },
    checklist: [
      'Seleccionar objetivo Mensajes.',
      'Activar categoria especial de anuncio: Empleo.',
      'Subir imagen o video generado desde RHDreams/Canva.',
      'Pegar el texto principal y revisar vista previa.',
      'Seleccionar WhatsApp, Messenger o Instagram como destino.',
      'Confirmar presupuesto y publicar.',
    ],
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  }, [agents]);

  const loadPersistentAgentMemories = async () => {
    try {
      const response = await apiFetch('/api/gemini/agent/memory');
      const payload = await readApiJson(response);
      setPersistentAgentMemories(Array.isArray(payload?.data) ? payload.data : []);
    } catch (error) {
      console.warn('No se pudo leer la memoria persistente de agentes:', error);
    }
  };

  useEffect(() => {
    loadPersistentAgentMemories();
  }, []);

  useEffect(() => {
    localStorage.setItem(INTERVIEW_SCHEDULE_STORAGE_KEY, JSON.stringify(interviewSlots));
  }, [interviewSlots]);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Code': return <Code className="w-6 h-6 text-zinc-400" />;
      case 'Briefcase': return <Briefcase className="w-6 h-6 text-zinc-400" />;
      case 'Users': return <Users className="w-6 h-6 text-zinc-400" />;
      default: return <Bot className="w-6 h-6 text-zinc-400" />;
    }
  };

  const getFilteredLogs = () => {
    return EMPTY_AGENT_LOGS.filter(log => {
      if (startDate && log.date < startDate) return false;
      if (endDate && log.date > endDate) return false;
      return true;
    });
  };

  const handleExportCSV = () => {
    const filteredLogs = getFilteredLogs();
    const headers = ['Date', 'Time', 'Agent', 'Action', 'Type'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log =>
        `"${log.date}","${log.time}","${log.agent}","${log.action.replace(/"/g, '""')}","${log.type}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agent_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddAgent = () => {
    if (!newAgentName) return;

    // add it to state
    const added = {
      id: `ag-${Date.now()}`,
      name: newAgentName,
      role: newAgentRole,
      status: 'Active',
      description: 'Agente recién creado. Configuración pendiente.',
      companyName: newAgentCompanyName.trim() || DEFAULT_COMPANY_NAME,
      accountName: newAgentAccountName.trim() || DEFAULT_ACCOUNT_NAME,
      accountChannel: newAgentAccountChannel.trim() || DEFAULT_ACCOUNT_CHANNEL,
      channels: [newAgentAccountChannel.trim() || DEFAULT_ACCOUNT_CHANNEL],
      memory: '0 GB',
      conversations: 0,
      successRate: '-',
      avatarColor: 'bg-zinc-500',
      basePrompt: newAgentPersonality,
      systemPrompt: newAgentPersonality,
      personalityPrompt: newAgentPersonality,
      tone: newAgentTone,
      responseStyle: 'Respuestas breves, humanas y accionables.',
      escalationRules: 'Escalar a RH cuando falte información, haya quejas, salario no confirmado, datos sensibles o dudas legales.',
      transcribeAudio: newAgentTranscribeAudio,
      audioAutoReply: newAgentAudioAutoReply,
      audioLanguage: 'es-MX',
    };

    setAgents([...agents, added]);
    setIsCreateModalOpen(false);
    setNewAgentName('');
    setNewAgentPersonality(DEFAULT_AGENT_PERSONALITY);
    setNewAgentCompanyName(DEFAULT_COMPANY_NAME);
    setNewAgentAccountName(DEFAULT_ACCOUNT_NAME);
    setNewAgentAccountChannel(DEFAULT_ACCOUNT_CHANNEL);
    setNewAgentTone('Cercano, profesional y directo');
    setNewAgentTranscribeAudio(true);
    setNewAgentAudioAutoReply(true);
    setActiveTab('agents');
  };

  const handleUpdateAgent = (agentId: string, patch: Record<string, any>) => {
    setAgents(current => current.map(agent => agent.id === agentId ? { ...agent, ...patch } : agent));
    setAgentToConfig(current => current?.id === agentId ? { ...current, ...patch } : current);
    setActiveChatAgent(current => current?.id === agentId ? { ...current, ...patch } : current);
  };

  const buildLearningLesson = (analysis: any, reply: string, source: string) => {
    const missingText = analysis.missing.length ? `faltaban ${analysis.missing.join(', ')}` : 'la informacion venia completa';
    const nextStep =
      analysis.intent === 'Agendar entrevista' ? 'validar datos y ofrecer solo horarios disponibles' :
      analysis.intent === 'Reagendar entrevista' ? 'reagendar con empatia sin inventar espacios' :
      analysis.intent === 'Primer contacto' ? 'abrir flujo desde cero y pedir un dato a la vez' :
      analysis.intent.includes('información') ? 'resolver la duda y llevar al siguiente paso del embudo' :
      'mantener respuesta breve, confirmar datos y avanzar el flujo';

    return `${source}: cuando detectes "${analysis.intent}" (${analysis.vacancy}), recuerda que ${missingText}; conviene ${nextStep}. Respuesta previa ${reply ? 'sirvio como referencia' : 'no genero respuesta valida'}.`;
  };

  const recordAgentLearning = (agentId: string, event: {
    source: string;
    userText: string;
    reply: string;
    expected?: string;
    conversationSize?: number;
  }) => {
    const analysis = analyzeTestMessage(event.userText);
    const now = new Date().toISOString();
    const learningEntry = {
      id: `learn-${Date.now()}`,
      createdAt: now,
      source: event.source,
      channel: analysis.source === 'No detectada' ? undefined : analysis.source,
      intent: analysis.intent,
      vacancy: analysis.vacancy,
      missing: analysis.missing,
      userText: event.userText.slice(0, 500),
      reply: event.reply.slice(0, 700),
      expected: event.expected,
      lesson: buildLearningLesson(analysis, event.reply, event.source),
      conversationSize: event.conversationSize || 1,
    };

    setAgents(current => current.map(agent => {
      if (agent.id !== agentId) return agent;
      const previousMemory = Array.isArray(agent.learningMemory) ? agent.learningMemory : [];
      const nextMemory = [learningEntry, ...previousMemory].slice(0, 50);
      const nextAgent = {
        ...agent,
        learningMemory: nextMemory,
        memory: `${(Array.isArray(agent.knowledgeBase) ? agent.knowledgeBase.length : 0) + nextMemory.length} memorias`,
        lastLearningAt: now,
      };
      setAgentToConfig(currentConfig => currentConfig?.id === agentId ? nextAgent : currentConfig);
      setActiveChatAgent(currentChat => currentChat?.id === agentId ? nextAgent : currentChat);
      return nextAgent;
    }));
  };

  const handleAddInterviewSlot = () => {
    if (!slotDraft.date || !slotDraft.startTime || !slotDraft.endTime) return;
    const nextSlot = {
      ...slotDraft,
      id: `slot-${Date.now()}`,
      capacity: Math.max(1, Number(slotDraft.capacity) || 1),
    };
    setInterviewSlots(current => [...current, nextSlot].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)));
    setSlotDraft(current => ({ ...current, notes: '' }));
  };

  const updateInterviewSlot = (slotId: string, patch: Partial<InterviewSlot>) => {
    setInterviewSlots(current => current.map(slot => slot.id === slotId ? { ...slot, ...patch } : slot));
  };

  const removeInterviewSlot = (slotId: string) => {
    setInterviewSlots(current => current.filter(slot => slot.id !== slotId));
  };

  const analyzeTestMessage = (message: string) => {
    const normalized = message.toLowerCase();
    const ageMatch = normalized.match(/\b(1[0-9]|[2-9][0-9])\b/);
    const age = ageMatch ? Number(ageMatch[1]) : null;
    const vacancy =
      containsAny(normalized, ['ayudante', 'operativo']) ? 'Ayudante general' :
      containsAny(normalized, ['asesor', 'comercial', 'ventas']) ? 'Asesor comercial' :
      containsAny(normalized, ['supervisor', 'lider', 'líder']) ? 'Supervisor' :
      containsAny(normalized, ['atencion', 'atención', 'cliente']) ? 'Atención a clientes' :
      containsAny(normalized, ['promotor']) ? 'Promotor de ventas' :
      'No detectada';
    const intent =
      containsAny(normalized, ['reagendar', 'cambiar', 'no puedo asistir', 'otro horario']) ? 'Reagendar entrevista' :
      containsAny(normalized, ['entrevista', 'agendar', 'cita']) ? 'Agendar entrevista' :
      containsAny(normalized, ['requisitos', 'documentos', 'qué necesito', 'que necesito']) ? 'Pedir información/documentos' :
      containsAny(normalized, ['sueldo', 'pago', 'comision', 'comisión', 'horario', 'ubicacion', 'ubicación']) ? 'Pedir información de vacante' :
      containsAny(normalized, ['quiero trabajar', 'busco trabajo', 'trabajar']) ? 'Interés en trabajar' :
      containsAny(normalized, ['hola', 'informes', 'informacion', 'información', 'info', 'inf', 'vacante', 'trabajo']) ? 'Primer contacto' :
      'Conversación general';
    const availability =
      containsAny(normalized, ['mañana', 'manana']) ? 'Mañana' :
      containsAny(normalized, ['hoy']) ? 'Hoy' :
      containsAny(normalized, ['tarde']) ? 'Tarde' :
      containsAny(normalized, ['mañana temprano', 'manana temprano']) ? 'Mañana temprano' :
      containsAny(normalized, ['semana']) ? 'Esta semana' :
      'No detectada';
    const source =
      containsAny(normalized, ['facebook']) ? 'Facebook' :
      containsAny(normalized, ['instagram']) ? 'Instagram' :
      containsAny(normalized, ['whatsapp']) ? 'WhatsApp' :
      containsAny(normalized, ['tiktok']) ? 'TikTok' :
      containsAny(normalized, ['computrabajo']) ? 'Computrabajo' :
      containsAny(normalized, ['indeed']) ? 'Indeed' :
      'No detectada';
    const missing = [
      age === null ? 'edad' : '',
      vacancy === 'No detectada' ? 'vacante' : '',
      availability === 'No detectada' && intent.includes('entrevista') ? 'disponibilidad' : '',
      !containsAny(normalized, ['me llamo', 'soy ', 'nombre']) ? 'nombre' : '',
      !containsAny(normalized, ['vivo', 'zona', 'alcaldia', 'alcaldía', 'municipio', 'colonia']) ? 'ubicación' : '',
    ].filter(Boolean);

    return { age, vacancy, intent, availability, source, missing };
  };

  const containsAny = (text: string, words: string[]) => words.some(word => text.includes(word));

  const testerConversationText = [...testerConversation.map(item => item.text), testerMessage].join('\n');
  const detectedTestVariables = analyzeTestMessage(testerConversationText);

  const inferExpectedTestFlow = (message: string) => {
    const analysis = analyzeTestMessage(message);
    const age = analysis.age;

    if (age !== null && age < 16) {
      return 'Debe rechazar con respeto: menor de 16 años, sin pedir documentos adicionales.';
    }
    if (age === 16 || age === 17) {
      return 'Debe pedir permiso firmado del tutor, carta responsiva, identificación del tutor, acta de nacimiento y comprobante.';
    }
    if (analysis.intent === 'Reagendar entrevista') {
      return 'Debe reagendar con empatía y ofrecer solo horarios disponibles configurados.';
    }
    if (analysis.intent === 'Agendar entrevista') {
      return 'Debe validar datos básicos y ofrecer únicamente horarios de la agenda configurada.';
    }
    if (analysis.intent.includes('información') || analysis.intent === 'Primer contacto' || analysis.intent === 'Interés en trabajar') {
      return 'Debe iniciar desde cero: saludar humano, explicar que hay vacantes, preguntar qué puesto le interesa y pedir un dato a la vez.';
    }
    return 'Debe seguir el flujo normal: resolver duda, pedir un dato a la vez y guiar al siguiente paso.';
  };

  const handleRunConversationTest = async () => {
    const agent = agents.find(item => item.id === testerAgentId) || agents[0];
    if (!agent || !testerMessage.trim() || isTestingConversation) return;

    setIsTestingConversation(true);
    setTesterResult(null);
    const userText = testerMessage.trim();
    const expected = inferExpectedTestFlow(testerConversationText);
    const historyForApi = testerConversation.map(message => ({
      sender: message.role === 'candidate' ? 'user' : 'me',
      text: message.text
    }));
    setTesterConversation(current => [...current, { role: 'candidate', text: userText }]);

    try {
      const res = await apiFetch('/api/gemini/agent/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          systemPrompt: buildAgentSystemPrompt(agent, interviewSlots),
          conversationHistory: historyForApi,
          userPrompt: userText
        })
      });
      const data = await readApiJson(res);
      const reply = data?.data?.reply || data?.reply || 'Sin respuesta del agente.';
      setTesterConversation(current => [...current, { role: 'agent', text: reply }]);
      setTesterResult({ expected, reply });
      recordAgentLearning(agent.id, {
        source: 'Probador de agente',
        userText,
        reply,
        expected,
        conversationSize: testerConversation.length + 1,
      });
      loadPersistentAgentMemories();
      setTesterMessage('');
    } catch (error) {
      const reply = error instanceof Error ? error.message : 'No se pudo ejecutar la prueba.';
      setTesterConversation(current => [...current, { role: 'agent', text: reply }]);
      setTesterResult({ expected, reply });
      recordAgentLearning(agent.id, {
        source: 'Error en probador',
        userText,
        reply,
        expected,
        conversationSize: testerConversation.length + 1,
      });
      loadPersistentAgentMemories();
    } finally {
      setIsTestingConversation(false);
    }
  };

  const resetTesterConversation = () => {
    setTesterConversation([]);
    setTesterResult(null);
    setTesterMessage('Hola inf');
  };

  const toggleAgentStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAgents(agents.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Draft' : 'Active' } : a));
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !activeChatAgent || isGenerating) return;

    const userText = currentMessage.trim();
    const newMsg = { role: 'user' as const, text: userText };
    setChatMessages(prev => [...prev, newMsg]);
    setCurrentMessage('');
    setIsGenerating(true);

    try {
      const res = await apiFetch('/api/gemini/agent/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: activeChatAgent.id,
          agentName: activeChatAgent.name,
          systemPrompt: buildAgentSystemPrompt(activeChatAgent, interviewSlots),
          conversationHistory: chatMessages.map(message => ({
            sender: message.role === 'user' ? 'user' : 'me',
            text: message.text
          })),
          userPrompt: userText
        })
      });
      const data = await readApiJson(res);
      const reply = data?.data?.reply || data?.reply;
      if (reply) {
        setChatMessages(prev => [...prev, { role: 'agent', text: reply }]);
        recordAgentLearning(activeChatAgent.id, {
          source: 'Chat de prueba',
          userText,
          reply,
          conversationSize: chatMessages.length + 1,
        });
        loadPersistentAgentMemories();
      } else {
        const fallbackReply = "Lo siento, ha ocurrido un problema al procesar la respuesta del agente virtual.";
        setChatMessages(prev => [...prev, { role: 'agent', text: fallbackReply }]);
        recordAgentLearning(activeChatAgent.id, {
          source: 'Chat de prueba sin respuesta',
          userText,
          reply: fallbackReply,
          conversationSize: chatMessages.length + 1,
        });
        loadPersistentAgentMemories();
      }
    } catch (err) {
      console.error("Error communicating with agent:", err);
      const errorReply = "Ocurrió un error al intentar comunicar con el agente virtual.";
      setChatMessages(prev => [...prev, { role: 'agent', text: errorReply }]);
      recordAgentLearning(activeChatAgent.id, {
        source: 'Error en chat de prueba',
        userText,
        reply: errorReply,
        conversationSize: chatMessages.length + 1,
      });
      loadPersistentAgentMemories();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateCanvaDesign = async () => {
    setIsCreatingCanva(true);
    setCanvaResult(null);
    try {
      const res = await apiFetch('/api/integrations/canva/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${canvaCampaign} - ${selectedCanvaFormat.label}`,
          format: canvaFormat,
          brief: canvaBrief,
          brandTemplateId: canvaBrandTemplateId.trim() || undefined,
          templatePackId: selectedCanvaTemplate.id,
          templateSearchUrl: selectedCanvaTemplate.canvaSearchUrl,
          autofillData: canvaBrandTemplateId.trim() ? selectedCanvaTemplate.autofillData : undefined
        })
      });
      const data = await readApiJson(res);
      setCanvaResult(data.data || data);
    } catch (err: any) {
      setCanvaResult({ error: err.message || 'No se pudo conectar con Canva.' });
    } finally {
      setIsCreatingCanva(false);
    }
  };

  const handleCreateAiImage = async () => {
    if (!canvaCampaign.trim() || isCreatingAiImage) return;

    setIsCreatingAiImage(true);
    setAiImageResult(null);

    try {
      const res = await apiFetch('/api/integrations/images/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: canvaFormat,
          brief: canvaBrief,
          prompt: `${canvaCampaign}. ${canvaAudience}. ${canvaOffer}. ${selectedCanvaTemplate.visualDirection}`,
        })
      });
      const data = await readApiJson(res);
      setAiImageResult(data.data || data);
    } catch (err: any) {
      setAiImageResult({ error: err.message || 'No se pudo generar la imagen IA.' });
    } finally {
      setIsCreatingAiImage(false);
    }
  };

  const downloadJson = (fileName: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMetaAdPackage = async () => {
    const text = [
      `Campana: ${metaAdPackage.campaign}`,
      `Objetivo: ${metaAdPackage.objective}`,
      `Categoria especial: ${metaAdPackage.specialAdCategory}`,
      `Destino: ${metaDestination === 'whatsapp_business' ? 'WhatsApp Business' : metaDestination === 'whatsapp' ? 'WhatsApp normal' : metaDestination}${metaDestination === 'whatsapp' || metaDestination === 'whatsapp_business' ? ` (${metaWhatsappNumber})` : ''}`,
      `Presupuesto: MX$${metaDailyBudget} por dia durante ${metaDurationDays} dias. Total: MX$${metaDailyBudget * metaDurationDays}`,
      '',
      'Texto del anuncio:',
      metaAdText,
      '',
      'Checklist:',
      ...metaAdPackage.checklist.map((item) => `- ${item}`),
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setMetaPackageCopied(true);
    window.setTimeout(() => setMetaPackageCopied(false), 1800);
  };

  const handleDownloadMetaAdPackage = () => {
    downloadJson(`meta_ads_${(canvaCampaign || 'campana').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`, metaAdPackage);
  };

  const handleExportAgents = () => {
    downloadJson(`rhdreams_agentes_${new Date().toISOString().split('T')[0]}.json`, {
      app: 'RHDreams',
      type: 'agents_export',
      version: 1,
      exportedAt: new Date().toISOString(),
      agents,
      interviewSlots,
    });
  };

  const handleImportAgentsFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const importedAgents = Array.isArray(payload) ? payload : payload.agents;
      const importedSlots = Array.isArray(payload?.interviewSlots) ? payload.interviewSlots : null;
      if (!Array.isArray(importedAgents)) {
        throw new Error('El archivo no contiene una lista de agentes.');
      }

      const normalizedAgents = importedAgents.map((agent: any) => ({
        ...agent,
        id: agent.id || `ag-import-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        channels: Array.isArray(agent.channels) ? agent.channels : [agent.accountChannel || DEFAULT_ACCOUNT_CHANNEL],
      }));

      const byId = new Map(agents.map(agent => [agent.id, agent]));
      normalizedAgents.forEach((agent: any) => byId.set(agent.id, { ...(byId.get(agent.id) || {}), ...agent }));
      setAgents(mergeDefaultAgents(Array.from(byId.values())));
      if (importedSlots) setInterviewSlots(importedSlots);
      setActiveTab('agents');
      window.alert(`Importados ${normalizedAgents.length} agentes.`);
    } catch (error: any) {
      window.alert(error.message || 'No se pudo importar el archivo de agentes.');
    }
  };

  const handleConnectCanva = async () => {
    try {
      const response = await apiFetch('/api/integrations/canva/connect');
      const payload = await readApiJson(response);
      const url = payload?.data?.url || payload?.url;
      if (!url) throw new Error('Canva no devolvio URL de autorizacion.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setCanvaResult({ error: err.message || 'No se pudo iniciar la conexion con Canva.' });
    }
  };

  const handleUseCanvaTemplate = (template: CanvaTemplatePack) => {
    setSelectedCanvaTemplateId(template.id);
    setCanvaFormat(template.format);
    setCanvaCampaign(template.defaultCampaign);
    setCanvaAudience(template.defaultAudience);
    setCanvaOffer(template.defaultOffer);
  };

  const openChat = (agent: typeof EMPTY_AGENTS[0]) => {
    setActiveChatAgent(agent);
    setChatMessages([{ role: 'agent', text: `Hola, soy ${agent.name}. Estoy configurado como ${agent.role} y responderé con este estilo: ${agent.tone || 'profesional y cercano'}. ${agent.transcribeAudio ? 'También puedo trabajar con audios transcritos.' : ''} ¿Qué necesitas que revise o responda?` }]);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 icon-violet" />
            Flota de Agentes AI
          </h1>
          <p className="text-slate-400 mt-1">Crea, entrena y monitorea los agentes de reclutamiento autónomo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={agentsImportRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportAgentsFile}
          />
          <button
            onClick={() => agentsImportRef.current?.click()}
            className="btn-secondary px-4 py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar datos
          </button>
          <button
            onClick={handleExportAgents}
            className="btn-secondary px-4 py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar datos
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Nuevo Agente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a]/95 p-1 rounded-xl glass-panel w-fit border border-slate-700/50">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'agents'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Mis Agentes
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Plantillas
        </button>
        <button
          onClick={() => setActiveTab('tester')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'tester'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          Probador
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'schedule'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Agenda
        </button>
        <button
          onClick={() => setActiveTab('canva')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'canva'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Canva Studio
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'memory'
              ? 'bg-slate-200/10 text-white border border-slate-200/35 shadow-[0_0_14px_rgba(245,245,245,0.12)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          Actividad Reciente
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">

        {/* Mis Agentes Tab */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => openChat(agent)}
                className={`glass-panel bg-[#0a0a0a]/95 p-6 rounded-2xl flex flex-col border transition-all hover:-translate-y-1 group cursor-pointer ${activeChatAgent?.id === agent.id ? 'neon-selected border-slate-200/60 shadow-[0_0_24px_rgba(245,245,245,0.16)]' : 'border-slate-700/50 hover:border-slate-200/35 hover:shadow-[0_8px_30px_rgba(245,245,245,0.08)]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${agent.avatarColor} shadow-lg`}>
                      <Bot className="w-6 h-6 icon-violet" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white tracking-tight">{agent.name}</h3>
                        {agent.isPrincipal && (
                          <span className="rounded-full border border-zinc-400/30 bg-zinc-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-200">
                            Principal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{agent.role}</span>
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                        {agent.companyName || DEFAULT_COMPANY_NAME} · {agent.accountName || DEFAULT_ACCOUNT_NAME}
                      </span>
                    </div>
                  </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${agent.status === 'Active' ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25' : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}`}>
                        {agent.status === 'Active' ? 'Activo' : 'Borrador'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleAgentStatus(agent.id, e as any)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${agent.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        role="switch"
                        aria-checked={agent.status === 'Active'}
                      >
                        <span className="sr-only">Toggle agent status</span>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${agent.status === 'Active' ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                </div>

                <p className="text-sm text-slate-300 mb-6 leading-relaxed flex-1">
                  {agent.description}
                </p>

                <div className="mb-5 rounded-xl border border-slate-700/60 bg-black/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Personalidad</p>
                    <span className="text-[10px] text-slate-500">{agent.tone || 'Sin configurar'}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {agent.personalityPrompt || agent.basePrompt || 'Configura tono, límites y forma de responder de este agente.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                      agent.transcribeAudio === false ? "border-slate-700 bg-slate-800/60 text-slate-500" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-300"
                    )}>
                      <Mic className="h-3 w-3" />
                      {agent.transcribeAudio === false ? 'Audio off' : 'Transcribe audio'}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                      agent.audioAutoReply === false ? "border-zinc-500/20 bg-zinc-500/10 text-zinc-300" : "border-zinc-500/20 bg-zinc-500/10 text-zinc-300"
                    )}>
                      <Volume2 className="h-3 w-3" />
                      {agent.audioAutoReply === false ? 'Revisión humana' : 'Responde audio'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 uppercase font-medium tracking-wider">Canales</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.channels.map(ch => (
                        <span key={ch} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-white/5">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-700/50 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">Memoria</p>
                      <p className="text-sm font-semibold text-slate-200">{agent.memory}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Chats</p>
                      <p className="text-sm font-semibold text-slate-200">{agent.conversations}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Éxito</p>
                      <p className="text-sm font-semibold text-zinc-400">{agent.successRate}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-500/10 bg-zinc-500/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Datos para consultar</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {Array.isArray(agent.knowledgeBase) ? agent.knowledgeBase.length : 0} fuentes · {Array.isArray(agent.learningMemory) ? agent.learningMemory.length : 0} aprendizajes
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-2 border-t border-slate-700/50 pt-4">
                  <button onClick={(e) => { e.stopPropagation(); openChat(agent); }} className="flex-1 py-1.5 text-sm font-medium text-zinc-400 bg-zinc-400/10 hover:bg-zinc-400/20 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Chatear
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setAgentToConfig(agent); }} className="flex-1 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:bg-white/5 rounded-lg">
                    <Settings2 className="w-4 h-4" /> Config
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plantillas Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EMPTY_AGENT_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="relative glass-panel p-6 rounded-2xl border border-slate-700/50 flex flex-col group overflow-hidden cursor-pointer hover:border-slate-200/40 hover:shadow-[0_0_22px_rgba(245,245,245,0.10)] transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   {getIcon(tpl.icon)}
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-4">
                  {getIcon(tpl.icon)}
                </div>
                <h3 className="font-semibold text-white mb-2">{tpl.name}</h3>
                <p className="text-sm text-slate-400 mb-6 flex-1">{tpl.description}</p>
                <button className="w-full py-2 bg-slate-800 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-200/35 hover:shadow-[0_0_14px_rgba(245,245,245,0.10)]">
                  <Plus className="w-4 h-4" /> Usar Plantilla
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tester' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-700/50 bg-slate-900/70">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-zinc-400" />
                  Conversación de prueba desde cero
                </h3>
                <p className="text-sm text-slate-400 mt-1">Escribe como llegan los candidatos reales: "hola", "inf", "información", "quiero trabajar". El agente debe abrir el flujo sin que le digas el caso.</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Agente a probar</label>
                    <select
                      value={testerAgentId}
                      onChange={(e) => setTesterAgentId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500"
                    >
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name} - {agent.role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-200 font-bold">Lectura automática del mensaje</p>
                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {[
                        ['Intención', detectedTestVariables.intent],
                        ['Edad', detectedTestVariables.age === null ? 'No detectada' : `${detectedTestVariables.age} años`],
                        ['Vacante', detectedTestVariables.vacancy],
                        ['Disponibilidad', detectedTestVariables.availability],
                        ['Fuente', detectedTestVariables.source],
                        ['Falta', detectedTestVariables.missing.length ? detectedTestVariables.missing.join(', ') : 'Completo'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
                          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
                          <p className="mt-1 text-xs text-slate-100 leading-4">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {testerConversation.length > 0 && (
                  <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 space-y-3 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Conversación simulada</p>
                      <button type="button" onClick={resetTesterConversation} className="text-xs text-slate-400 hover:text-zinc-300 transition-colors">
                        Reiniciar
                      </button>
                    </div>
                    {testerConversation.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`flex ${message.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          message.role === 'candidate'
                            ? 'bg-zinc-500 text-slate-950 rounded-br-sm'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
                        }`}>
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Mensaje entrante del candidato</label>
                  <textarea
                    value={testerMessage}
                    onChange={(e) => setTesterMessage(e.target.value)}
                    placeholder="Ej: hola inf / información / quiero trabajar / me interesa una vacante"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500 resize-none min-h-28"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-5">
                    Empieza con mensajes casuales y cortos. Después responde como candidato con datos sueltos: edad, zona, vacante, horario, documentos o cambio de cita.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRunConversationTest}
                    disabled={isTestingConversation || !testerMessage.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    {isTestingConversation ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    Enviar mensaje
                  </button>
                  {testerConversation.length > 0 && (
                    <button
                      type="button"
                      onClick={resetTesterConversation}
                      className="btn-secondary px-5 py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reiniciar conversación
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const agent = agents.find(item => item.id === testerAgentId) || agents[0];
                      if (agent) openChat(agent);
                    }}
                    className="border border-slate-700 hover:border-zinc-500/50 text-slate-300 hover:text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Abrir chat manual
                  </button>
                </div>

                {testerResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/10 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-200 font-bold">Resultado esperado</p>
                      <p className="mt-2 text-sm text-zinc-50 leading-relaxed">{testerResult.expected}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-500/20 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-200 font-bold">Respuesta del agente</p>
                        <button type="button" onClick={() => navigator.clipboard.writeText(testerResult.reply)} className="text-xs text-zinc-300 hover:text-zinc-200 flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100 leading-relaxed">{testerResult.reply}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel border border-slate-700/50 rounded-2xl p-5 h-fit">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                Checklist de flujo
              </h3>
              <div className="mt-5 space-y-3">
                {[
                  'Menor de 16: rechazar con respeto y cerrar proceso.',
                  '16 o 17: pedir permiso firmado del tutor y documentos.',
                  '18 o más: continuar filtro normal.',
                  'Agenda: ofrecer solo horarios configurados.',
                  'Reagenda: confirmar nuevo horario antes de cambiar cita.',
                ].map(item => (
                  <div key={item} className="flex gap-3 rounded-xl border border-slate-700/50 bg-slate-950/40 p-3">
                    <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-700/50 bg-slate-900/70">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-zinc-400" />
                  Horarios disponibles para entrevistas
                </h3>
                <p className="text-sm text-slate-400 mt-1">Estos horarios entran al prompt del agente para citar y reagendar sin inventar disponibilidad.</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input type="date" value={slotDraft.date} onChange={(e) => setSlotDraft(current => ({ ...current, date: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm [color-scheme:dark] focus:outline-none focus:border-zinc-500" />
                  <input type="time" value={slotDraft.startTime} onChange={(e) => setSlotDraft(current => ({ ...current, startTime: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm [color-scheme:dark] focus:outline-none focus:border-zinc-500" />
                  <input type="time" value={slotDraft.endTime} onChange={(e) => setSlotDraft(current => ({ ...current, endTime: e.target.value }))} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm [color-scheme:dark] focus:outline-none focus:border-zinc-500" />
                  <input type="number" min={1} value={slotDraft.capacity} onChange={(e) => setSlotDraft(current => ({ ...current, capacity: Number(e.target.value) }))} className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                  <button type="button" onClick={handleAddInterviewSlot} className="btn-primary px-4 py-3 rounded-xl flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={slotDraft.location} onChange={(e) => setSlotDraft(current => ({ ...current, location: e.target.value }))} placeholder="Lugar o enlace de entrevista" className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                  <input value={slotDraft.notes} onChange={(e) => setSlotDraft(current => ({ ...current, notes: e.target.value }))} placeholder="Notas internas para el agente" className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                </div>

                <div className="space-y-3">
                  {interviewSlots.map(slot => (
                    <div key={slot.id} className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_.8fr_.8fr_.6fr_auto] gap-3 items-center">
                        <input type="date" value={slot.date} onChange={(e) => updateInterviewSlot(slot.id, { date: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
                        <input type="time" value={slot.startTime} onChange={(e) => updateInterviewSlot(slot.id, { startTime: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
                        <input type="time" value={slot.endTime} onChange={(e) => updateInterviewSlot(slot.id, { endTime: e.target.value })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]" />
                        <input type="number" min={1} value={slot.capacity} onChange={(e) => updateInterviewSlot(slot.id, { capacity: Number(e.target.value) })} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                        <button type="button" onClick={() => removeInterviewSlot(slot.id)} className="text-slate-500 hover:text-zinc-300 p-2 rounded-lg hover:bg-zinc-500/10 transition-colors" title="Eliminar horario">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={slot.location} onChange={(e) => updateInterviewSlot(slot.id, { location: e.target.value })} placeholder="Lugar" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                        <input value={slot.notes} onChange={(e) => updateInterviewSlot(slot.id, { notes: e.target.value })} placeholder="Notas" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel border border-slate-700/50 rounded-2xl p-5 h-fit">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-zinc-400" />
                Memoria que verá el agente
              </h3>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-700/60 bg-black/20 p-4 text-xs leading-relaxed text-slate-300">{formatInterviewSlotsForPrompt(interviewSlots)}</pre>
              <button
                type="button"
                onClick={() => setInterviewSlots(DEFAULT_INTERVIEW_SLOTS)}
                className="mt-4 w-full border border-slate-700 hover:border-zinc-500/50 text-slate-300 hover:text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                <CalendarClock className="w-4 h-4" />
                Restaurar ejemplo
              </button>
            </div>
          </div>
        )}

        {/* Canva Studio Tab */}
        {activeTab === 'canva' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-700/50 bg-slate-900/70 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 icon-fuchsia" />
                    Canva Content Studio
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Genera briefs para publicaciones, stories, reels y videos de reclutamiento.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleConnectCanva}
                    className="border border-zinc-500/30 bg-zinc-500/10 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-200 hover:bg-zinc-500/15 transition-all"
                  >
                    Conectar Canva
                  </button>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-1 rounded-md font-bold">
                    Integrado
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-widest font-bold block">Canva Templates</label>
                      <p className="text-sm text-slate-400 mt-1">Elige una base creativa y abre busquedas directas en Canva.</p>
                    </div>
                    <button type="button" onClick={() => window.open('https://www.canva.com/templates', '_blank')} className="border border-slate-700 hover:border-zinc-500/50 text-slate-300 hover:text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
                      <ExternalLink className="w-4 h-4" />
                      Ver templates
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {CANVA_TEMPLATE_CATEGORIES.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setCanvaTemplateCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          canvaTemplateCategory === category
                            ? 'bg-zinc-500/15 border-zinc-500/40 text-zinc-300'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredCanvaTemplates.map(template => {
                      const isSelected = selectedCanvaTemplate.id === template.id;
                      return (
                        <div
                          key={template.id}
                          className={`rounded-xl border p-4 bg-slate-950/40 transition-all ${
                            isSelected
                              ? 'border-slate-200/55 bg-white/[0.045] shadow-[0_0_18px_rgba(245,245,245,0.12)]'
                              : 'border-slate-700/70 hover:border-slate-200/35 hover:shadow-[0_0_14px_rgba(245,245,245,0.08)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold">{template.category}</span>
                              <h4 className="text-sm font-semibold text-white mt-1">{template.title}</h4>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed mt-2">{template.bestFor}</p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <button type="button" onClick={() => handleUseCanvaTemplate(template)} className="text-xs bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 px-3 py-2 rounded-lg hover:bg-zinc-500/15 transition-colors">
                              Usar plantilla
                            </button>
                            <button type="button" onClick={() => window.open(template.canvaSearchUrl, '_blank')} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 hover:border-slate-500 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir en Canva
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-3 block">Formato creativo</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {CANVA_FORMATS.map(format => {
                      const FormatIcon = format.icon;
                      const isSelected = canvaFormat === format.id;
                      return (
                        <button
                          key={format.id}
                          type="button"
                          onClick={() => setCanvaFormat(format.id)}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-slate-200/60 bg-slate-200/10 text-white shadow-[0_0_14px_rgba(245,245,245,0.12)]'
                              : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-200/35 hover:shadow-[0_0_12px_rgba(245,245,245,0.08)]'
                          }`}
                        >
                          <FormatIcon className={`w-5 h-5 mb-2 ${isSelected ? 'text-zinc-400' : 'text-slate-500'}`} />
                          <div className="text-sm font-semibold">{format.label}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{format.size}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Campaña</label>
                    <input value={canvaCampaign} onChange={(e) => setCanvaCampaign(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Audiencia</label>
                    <input value={canvaAudience} onChange={(e) => setCanvaAudience(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-300 mb-2 block">Oferta / mensaje principal</label>
                    <textarea value={canvaOffer} onChange={(e) => setCanvaOffer(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500 resize-none min-h-24" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-300 mb-2 block">Brand Template ID de Canva</label>
                    <input value={canvaBrandTemplateId} onChange={(e) => setCanvaBrandTemplateId(e.target.value)} placeholder="Opcional: usa Autofill si tu cuenta Canva Enterprise tiene una plantilla publicada" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-700/60 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-white">Brief listo para Canva</h4>
                    <button type="button" onClick={() => navigator.clipboard.writeText(canvaBrief)} className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </button>
                  </div>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">{canvaBrief}</pre>
                </div>

                <div className="rounded-xl border border-zinc-500/25 bg-zinc-500/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Send className="h-4 w-4 text-zinc-300" />
                        Paquete para publicar en Meta
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Prepara el anuncio para Facebook/Instagram con objetivo de mensajes. Copia el texto, descarga el paquete y abre Ads Manager para publicarlo.
                      </p>
                    </div>
                    <span className="rounded-lg border border-zinc-500/25 bg-zinc-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
                      Categoria: Empleo
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <label className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Destino</span>
                      <select
                        value={metaDestination}
                        onChange={(event) => setMetaDestination(event.target.value as typeof metaDestination)}
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-400"
                      >
                        <option value="whatsapp_business">WhatsApp Business</option>
                        <option value="whatsapp">WhatsApp normal</option>
                        <option value="messenger">Messenger</option>
                        <option value="instagram">Instagram DM</option>
                      </select>
                    </label>

                    <label className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Presupuesto diario</span>
                      <input
                        type="number"
                        min={1}
                        value={metaDailyBudget}
                        onChange={(event) => setMetaDailyBudget(Number(event.target.value))}
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-400"
                      />
                    </label>

                    <label className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Duracion</span>
                      <input
                        type="number"
                        min={1}
                        value={metaDurationDays}
                        onChange={(event) => setMetaDurationDays(Number(event.target.value))}
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-400"
                      />
                    </label>
                  </div>

                  {(metaDestination === 'whatsapp' || metaDestination === 'whatsapp_business') && (
                    <label className="mt-4 block rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Numero WhatsApp del anuncio</span>
                      <input
                        value={metaWhatsappNumber}
                        onChange={(event) => setMetaWhatsappNumber(event.target.value)}
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-400"
                      />
                    </label>
                  )}

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-300">Texto del anuncio</label>
                    <textarea
                      value={metaAdText}
                      onChange={(event) => setMetaPrimaryText(event.target.value)}
                      className="min-h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Objetivo</p>
                      <p className="mt-1 text-sm font-semibold text-white">Recibir mas mensajes</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CTA</p>
                      <p className="mt-1 text-sm font-semibold text-white">Enviar mensaje</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</p>
                      <p className="mt-1 text-sm font-semibold text-white">MX${metaDailyBudget * metaDurationDays}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleCopyMetaAdPackage}
                      className="btn-primary flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      {metaPackageCopied ? 'Copiado' : 'Copiar para publicar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMetaAdPackage}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-zinc-400/60 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                      Descargar paquete
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open('https://www.facebook.com/adsmanager/creation', '_blank', 'noopener,noreferrer')}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-zinc-400/60 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir Ads Manager
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={handleCreateAiImage} disabled={isCreatingAiImage || !canvaCampaign.trim()} className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl flex items-center justify-center gap-2">
                    {isCreatingAiImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Crear imagen IA
                  </button>
                  <button type="button" onClick={handleCreateCanvaDesign} disabled={isCreatingCanva || !canvaCampaign.trim()} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl flex items-center justify-center gap-2">
                    {isCreatingCanva ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Crear en Canva
                  </button>
                  <button type="button" onClick={() => window.open(selectedCanvaTemplate.canvaSearchUrl, '_blank')} className="border border-slate-700 hover:border-zinc-500/50 text-slate-300 hover:text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <ExternalLink className="w-4 h-4" />
                    Abrir plantilla
                  </button>
                </div>

                {aiImageResult && (
                  <div className="border border-zinc-500/25 rounded-xl p-4 bg-zinc-500/5">
                    {'error' in aiImageResult || aiImageResult.ok === false ? (
                      <p className="text-sm text-zinc-300">{String(aiImageResult.error || 'No se pudo generar la imagen IA.')}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                          <span className="text-slate-200">Imagen IA generada con {aiImageResult.provider === 'replicate' ? 'Replicate / FLUX' : 'Gemini'}.</span>
                        </div>
                        {aiImageResult.image?.dataUrl && (
                          <div className="space-y-3">
                            <img
                              src={aiImageResult.image.dataUrl}
                              alt="Imagen IA de reclutamiento"
                              className="max-h-[520px] w-full rounded-xl border border-white/10 object-contain bg-slate-950"
                            />
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={aiImageResult.image.dataUrl}
                                download={`rhdreams-ai-${Date.now()}.png`}
                                className="text-xs bg-zinc-500/10 text-zinc-200 border border-zinc-500/20 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-zinc-500/15 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descargar imagen
                              </a>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(aiImageResult.prompt || canvaBrief)}
                                className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 hover:border-slate-500 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar prompt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {canvaResult && (
                  <div className="border border-slate-700/60 rounded-xl p-4 bg-slate-900/70">
                    {'error' in canvaResult ? (
                      <p className="text-sm text-zinc-300">{String(canvaResult.error)}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={cn("w-4 h-4", canvaResult.ok === false ? "text-zinc-400" : "text-zinc-400")} />
                          <span className="text-slate-200">{canvaResult.ok === false ? canvaResult.message : 'Diseño enviado a Canva.'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canvaResult.response?.design?.urls?.edit_url && (
                            <button type="button" onClick={() => window.open(canvaResult.response.design.urls.edit_url, '_blank')} className="text-xs bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 px-3 py-2 rounded-lg flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Editar diseño
                            </button>
                          )}
                          {canvaResult.response?.job?.url && (
                            <button type="button" onClick={() => window.open(canvaResult.response.job.url, '_blank')} className="text-xs bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 px-3 py-2 rounded-lg flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ver autofill
                            </button>
                          )}
                          {canvaResult.canvaUrl && (
                            <button type="button" onClick={() => window.open(canvaResult.canvaUrl, '_blank')} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ir a Canva
                            </button>
                          )}
                        </div>
                        <pre className="text-[11px] text-slate-400 bg-black/20 border border-white/5 rounded-lg p-3 overflow-auto max-h-44">{JSON.stringify(canvaResult, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel border border-slate-700/50 rounded-2xl p-5 h-fit">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 icon-amber" />
                Flujo conectado
              </h3>
              <div className="mt-5 space-y-4">
                {['El agente genera copy y direccion visual', 'La app crea un lienzo Canva con medidas correctas', 'Canva devuelve enlace de edicion', 'El equipo publica en Instagram, TikTok, Facebook o LinkedIn'].map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-700/50">
                <p className="text-xs text-slate-400 leading-relaxed">Para creacion real configura <span className="text-slate-200 font-mono">CANVA_ACCESS_TOKEN</span>. Para Autofill con plantillas de marca, Canva requiere permisos de Brand Template y acceso Enterprise.</p>
              </div>
            </div>
          </div>
        )}

        {/* Console / Memory Logs Tab */}
        {activeTab === 'memory' && (
          <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Activity className="w-4 h-4 text-zinc-400" /> Autoconocimiento y Monitor
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                 <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs mr-2">
                   <Filter className="w-3 h-3 text-zinc-400 mr-1" />
                   <span className="text-slate-400 mr-1">Desde:</span>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                   <span className="text-slate-500 mx-1">-</span>
                   <span className="text-slate-400 mr-1">Hasta:</span>
                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                   {(startDate || endDate) && (
                     <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-2 text-slate-400 hover:text-zinc-400 transition-colors" title="Limpiar filtro">
                       <XCircle className="w-4 h-4" />
                     </button>
                   )}
                 </div>
                 <button
                  onClick={handleExportCSV}
                  className="mr-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-2"
                 >
                   <Download className="w-4 h-4" /> Exportar CSV
                 </button>
                  <button
                  onClick={loadPersistentAgentMemories}
                  className="mr-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-2"
                 >
                   <BrainCircuit className="w-4 h-4" /> Sincronizar memoria
                 </button>
                 <button
                  onClick={() => downloadJson(`rhdreams_autoconocimiento_${new Date().toISOString().split('T')[0]}.json`, {
                    app: 'RHDreams',
                    type: 'agent_learning_memory_export',
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    memories: allLearningMemories,
                  })}
                  className="mr-3 px-3 py-1.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-zinc-500/30 flex items-center gap-2"
                 >
                   <BrainCircuit className="w-4 h-4" /> Exportar aprendizajes
                 </button>
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
                  </span>
                 <span className="text-xs text-slate-400">Sistema Conectado</span>
              </div>
            </div>
            <div className="border-b border-slate-700/50 bg-slate-950/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-zinc-300" />
                    Memoria persistente aprendida por los agentes
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">Cada respuesta genera una lección breve guardada en el servidor y consultada en futuras conversaciones.</p>
                </div>
                <span className="rounded-lg border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 text-xs font-bold text-zinc-200">
                  {allLearningMemories.length} aprendizajes
                </span>
              </div>

              {allLearningMemories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-center text-sm text-slate-500">
                  Aún no hay autoconocimiento. Usa el chat o el probador de agentes y aquí aparecerá lo aprendido.
                </div>
              ) : (
                <div className="grid gap-3">
                  {allLearningMemories.slice(0, 20).map((memory: any) => (
                    <div key={memory.id} className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">{memory.agentName} · {memory.intent || 'Sin intención'}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-200">{memory.lesson}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-400">
                          {memory.source}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg bg-black/20 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Mensaje recibido</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-300">{memory.userText}</p>
                        </div>
                        <div className="rounded-lg bg-black/20 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Respuesta aprendida</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-300">{memory.reply}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 space-y-4 bg-black/20 font-mono">
              {getFilteredLogs().map((log, i) => (
                <div key={i} className="flex gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                  <div className="flex flex-col text-slate-500 text-xs mt-0.5 shrink-0 whitespace-nowrap min-w-[80px]">
                    <span className="font-semibold text-slate-400">{log.date}</span>
                    <span>{log.time}</span>
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="text-zinc-400 font-semibold">{log.agent}</span>
                      <span className="text-slate-300 ml-2">{log.action}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                       {log.type === 'outreach' && <MessageSquare className="w-3 h-3 text-zinc-400" />}
                       {log.type === 'screening' && <FileText className="w-3 h-3 text-zinc-400" />}
                       {log.type === 'match' && <CheckCircle2 className="w-3 h-3 text-zinc-400" />}
                       {log.type === 'learning' && <BrainCircuit className="w-3 h-3 text-zinc-400" />}
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest">{log.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Agente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-xl relative flex flex-col glass-panel shadow-2xl">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-400 to-zinc-500 mb-6">Crear Agente Personalizado</h2>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Nombre del Agente <span className="text-zinc-500">*</span></label>
                <input
                  type="text"
                  className={`w-full bg-slate-800 border ${dirtyFields.name && !newAgentName.trim() ? 'border-zinc-500/50 focus:border-zinc-500 focus:ring-zinc-500/50' : 'border-slate-700 focus:border-zinc-500 focus:ring-zinc-500/50'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all font-medium`}
                  placeholder="Ej: Reclutador de React"
                  value={newAgentName}
                  onChange={e => {
                    setNewAgentName(e.target.value);
                    setDirtyFields(prev => ({...prev, name: true}));
                  }}
                  onBlur={() => setDirtyFields(prev => ({...prev, name: true}))}
                />
                {dirtyFields.name && !newAgentName.trim() && (
                   <p className="text-zinc-400 text-xs mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> El nombre del agente es obligatorio.</p>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Función Principal <span className="text-zinc-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    list="agent-roles"
                    className={`w-full bg-slate-800 border ${dirtyFields.role && !newAgentRole.trim() ? 'border-zinc-500/50 focus:border-zinc-500 focus:ring-zinc-500/50' : 'border-slate-700 focus:border-zinc-500 focus:ring-zinc-500/50'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all`}
                    value={newAgentRole}
                    onChange={e => {
                      setNewAgentRole(e.target.value);
                      setDirtyFields(prev => ({...prev, role: true}));
                    }}
                    onBlur={() => setDirtyFields(prev => ({...prev, role: true}))}
                    placeholder="Escribe o selecciona un rol..."
                  />
                  {dirtyFields.role && !newAgentRole.trim() && (
                    <p className="text-zinc-400 text-xs mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> La función principal es obligatoria.</p>
                  )}
                  <datalist id="agent-roles">
                    <option value="Sourcing (Búsqueda Activa)" />
                    <option value="Screening (Filtro de CVs)" />
                    <option value="Scheduling (Gestión de Entrevistas)" />
                    <option value="Onboarding (Asistente de Ingreso)" />
                    <option value="Frontend Developer" />
                    <option value="Backend Developer" />
                    <option value="Full Stack Developer" />
                    <option value="Data Scientist" />
                    <option value="Product Manager" />
                    <option value="UX/UI Designer" />
                    <option value="DevOps Engineer" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Empresa</label>
                  <input
                    type="text"
                    value={newAgentCompanyName}
                    onChange={e => setNewAgentCompanyName(e.target.value)}
                    placeholder="Ej: Heavenly Dreams"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Cuenta / línea</label>
                  <input
                    type="text"
                    value={newAgentAccountName}
                    onChange={e => setNewAgentAccountName(e.target.value)}
                    placeholder="Ej: WhatsApp RH 1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Canal</label>
                  <input
                    type="text"
                    value={newAgentAccountChannel}
                    onChange={e => setNewAgentAccountChannel(e.target.value)}
                    placeholder="WhatsApp"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300 block mb-1">Prompt / Personalidad base</label>
                <p className="text-xs text-slate-500 mb-2">Puedes dejar la plantilla maestra o agregar instrucciones específicas de esa cuenta.</p>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none font-mono text-sm leading-relaxed h-28"
                  placeholder="Actúa como un reclutador tech amigable pero directo. Tu objetivo es encontrar desarrolladores frontend con React."
                  value={newAgentPersonality}
                  onChange={(e) => setNewAgentPersonality(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Tono del agente</label>
                <input
                  type="text"
                  value={newAgentTone}
                  onChange={(e) => setNewAgentTone(e.target.value)}
                  placeholder="Ej: cálido, ejecutivo, directo, empático"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 cursor-pointer hover:border-zinc-500/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Mic className="w-4 h-4 text-zinc-400" />
                      Transcribir audios
                    </span>
                    <input
                      type="checkbox"
                      checked={newAgentTranscribeAudio}
                      onChange={(e) => setNewAgentTranscribeAudio(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-600 text-zinc-500 focus:ring-zinc-500"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Convierte notas de voz entrantes en texto antes de responder.</p>
                </label>

                <label className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 cursor-pointer hover:border-zinc-500/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Volume2 className="w-4 h-4 text-zinc-400" />
                      Responder audios
                    </span>
                    <input
                      type="checkbox"
                      checked={newAgentAudioAutoReply}
                      onChange={(e) => setNewAgentAudioAutoReply(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-600 text-zinc-500 focus:ring-zinc-500"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Después de transcribir, el agente responde solo si está activado.</p>
                </label>
              </div>

               <div>
                  <label className="text-sm text-slate-300 mb-2 block">Memoria Asignada</label>
                  <div className="border border-slate-700/50 bg-slate-800/50 p-3 rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5 text-zinc-500" />
                        <span className="text-sm text-slate-300">Conectar Base de Conocimiento Global</span>
                     </div>
                     <input type="checkbox" className="toggle-checkbox" defaultChecked />
                  </div>
               </div>

               <div>
                 <label className="text-sm text-slate-300 mb-2 block">Canales de Acción</label>
                 <div className="flex gap-2 flex-wrap">
                    {['Email', 'LinkedIn', 'WhatsApp', 'Plataforma ATS'].map(ch => (
                      <label key={ch} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                        <input type="checkbox" className="rounded bg-slate-900 border-slate-600 text-zinc-500 focus:ring-zinc-500" />
                        <span className="text-sm text-slate-300">{ch}</span>
                      </label>
                    ))}
                 </div>
               </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors"
               >
                Cancelar
              </button>
              <button
                onClick={handleAddAgent}
                disabled={!newAgentName.trim() || !newAgentRole.trim()}
                className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" fill="currentColor" />
                Desplegar Agente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chat Agente */}
      {activeChatAgent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl h-[600px] max-h-[90vh] relative flex flex-col glass-panel shadow-2xl overflow-hidden">
            {/* Chat header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${activeChatAgent.avatarColor} shadow-lg`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-tight">{activeChatAgent.name}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1">{activeChatAgent.role} • Chat de prueba</span>
                </div>
              </div>
              <button
                onClick={() => setActiveChatAgent(null)}
                className="text-slate-400 hover:text-white p-2 transition-colors"
                title="Cerrar chat"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 styled-scrollbar bg-slate-950/20">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group/msg`}>
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed font-sans ${msg.role === 'user' ? 'bg-zinc-600 text-white rounded-br-none shadow-[0_4px_12px_rgba(163,163,163,0.15)]' : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-lg'}`}>
                      {msg.text}
                    </div>
                    {msg.role === 'agent' && (
                      <button
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="mt-1 p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-zinc-400 transition-all opacity-0 group-hover/msg:opacity-100 self-start shrink-0"
                        title="Copiar texto al portapapeles"
                      >
                        {copiedIndex === idx ? (
                          <span className="text-[10px] text-zinc-400 font-bold px-1 uppercase tracking-wider">¡Listo!</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-400 shadow-md">
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    <span className="animate-pulse">El agente virtual de Heavenly Dreams está pensando y redactando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  disabled={isGenerating}
                  placeholder={isGenerating ? "Espera a que el agente termine..." : "Escribe un prompt laboral o propuesta de anuncio para evaluar..."}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentMessage.trim() || isGenerating}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed p-2.5 rounded-xl flex items-center justify-center shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 icon-cyan" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {agentToConfig && (
        <AgentConfigModal
          agent={agentToConfig}
          onClose={() => setAgentToConfig(null)}
          onSave={handleUpdateAgent}
        />
      )}
    </div>
  );
}
