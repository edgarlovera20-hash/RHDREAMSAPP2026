import { useEffect, useRef, useState } from "react";
import { Plus, Search, Smartphone, Shield, Zap, QrCode, Trash2, CheckCircle2, RotateCcw, X, SmartphoneNfc, MessageSquare, Clock, Facebook, Instagram, Video, Loader2, Settings2, Sparkles, AlertCircle, DollarSign, TrendingUp, Target, BarChart3, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, apiUrl, readApiJson } from "@/lib/api";
import { EMPTY_AGENTS } from "@/data/appDefaults";
import { WHATSAPP_RECRUITMENT_TEMPLATES } from "@/data/recruitmentKnowledge";
import { DEFAULT_COMPANY_NAME } from "@/lib/recruiterAgentPrompt";

type ChannelType =
  | 'whatsapp_personal'
  | 'indeed'
  | 'computrabajo'
  | 'facebook'
  | 'messenger'
  | 'instagram'
  | 'tiktok';

type ChannelAccount = {
  id: string;
  name: string;
  phone: string;
  status: string;
  agentId: string;
  lastSync: string;
  type: ChannelType;
  mode?: string;
  webhookUrl?: string;
  isolationKey?: string;
  companyName?: string;
  agentPersonalName?: string;
};

type FacebookAdsAnalysis = {
  summary: {
    totalSpend: number;
    totalLeads: number;
    totalClicks: number;
    totalImpressions: number;
    cpl: number;
    cpc: number;
    ctr: number;
    estimatedInterviews: number;
    estimatedHires: number;
    costPerEstimatedHire: number;
    recommendedBudget: number;
    dailyBudget: number;
    budgetPacing: number;
  };
  bestHours: Array<{ hour: string; spend: number; leads: number; cpl: number | null; ctr: number }>;
  campaigns: Array<{ campaign: string; spend: number; leads: number; cpl: number | null; ctr: number }>;
  recommendation: {
    bestTime: string;
    budget: string;
    agentAction: string;
  };
};

type BaileysStatus = {
  id: string;
  state: "idle" | "connecting" | "qr" | "connected" | "closed" | "logged_out" | "error";
  qrDataUrl?: string | null;
  phone?: string | null;
  lastError?: string | null;
  updatedAt?: number;
};

const CHANNEL_AGENT_RULES: Record<ChannelType, {
  defaultAgentId: string;
  label: string;
  matches: string[];
  helper: string;
}> = {
  whatsapp_personal: {
    defaultAgentId: "ag-whatsapp-recruiter-elite",
    label: "WhatsApp y CRM",
    matches: ["whatsapp", "crm", "calendar"],
    helper: "Solo agentes WhatsApp/CRM pueden responder por este numero.",
  },
  indeed: {
    defaultAgentId: "ag-indeed-recruiting",
    label: "Indeed",
    matches: ["indeed", "ats", "bolsa de trabajo"],
    helper: "Usa agentes de Indeed o bolsas para clasificar postulantes de este portal.",
  },
  computrabajo: {
    defaultAgentId: "ag-computrabajo-recruiting",
    label: "Computrabajo",
    matches: ["computrabajo", "bolsa de trabajo", "ats"],
    helper: "Usa agentes de Computrabajo o bolsas para candidatos de este portal.",
  },
  facebook: {
    defaultAgentId: "ag-facebook-recruiting",
    label: "Facebook / Meta",
    matches: ["facebook", "meta", "messenger", "marketplace"],
    helper: "Activa agentes de Facebook, Meta y Messenger para leads de Facebook.",
  },
  messenger: {
    defaultAgentId: "ag-facebook-recruiting",
    label: "Messenger",
    matches: ["messenger", "facebook", "meta"],
    helper: "Messenger usa agentes conversacionales de Meta/Facebook.",
  },
  instagram: {
    defaultAgentId: "ag-instagram-recruiting",
    label: "Instagram DM",
    matches: ["instagram", "dm", "reels", "stories"],
    helper: "Instagram solo muestra agentes preparados para DM, Reels y Stories.",
  },
  tiktok: {
    defaultAgentId: "ag-tiktok-recruiting",
    label: "TikTok",
    matches: ["tiktok", "video", "lead"],
    helper: "TikTok usa agentes de videos, hooks y formularios lead.",
  },
};

const CHANNEL_ICON_IMAGES: Partial<Record<ChannelType, string>> = {
  indeed: "/assets/integrations/indeed.svg",
  computrabajo: "/assets/integrations/computrabajo.svg",
  whatsapp_personal: "/assets/integrations/whatsapp.svg",
  facebook: "/assets/integrations/facebook.svg",
  messenger: "/assets/integrations/messenger.svg",
  instagram: "/assets/integrations/instagram.svg",
  tiktok: "/assets/integrations/tiktok.svg",
};

const normalizeAgentText = (agent: any) =>
  [agent?.id, agent?.name, agent?.role, agent?.description, ...(Array.isArray(agent?.channels) ? agent.channels : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function WhatsAppAccounts() {
  const [activeTab, setActiveTab] = useState<ChannelType>('whatsapp_personal');
  
  const [accounts, setAccounts] = useState<ChannelAccount[]>(() => {
    try {
      const stored = localStorage.getItem("rhdreams_channel_accounts");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  });
  const [availableAgents, setAvailableAgents] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("rhdreams_agents");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPTY_AGENTS;
    } catch (_error) {
      return EMPTY_AGENTS;
    }
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'info' | 'qr' | 'oauth_connecting' | 'success'>('info');
  
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCompanyName, setNewAccountCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [newAgentPersonalName, setNewAgentPersonalName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const [accountToUnlink, setAccountToUnlink] = useState<any>(null);
  const [accountToAutomate, setAccountToAutomate] = useState<any>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [connectionTest, setConnectionTest] = useState<any>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [facebookDailyBudget, setFacebookDailyBudget] = useState(150);
  const [facebookTargetLeads, setFacebookTargetLeads] = useState(30);
  const [facebookTargetHires, setFacebookTargetHires] = useState(5);
  const [facebookAdsAnalysis, setFacebookAdsAnalysis] = useState<FacebookAdsAnalysis | null>(null);
  const [isAnalyzingFacebookAds, setIsAnalyzingFacebookAds] = useState(false);
  const [baileysSessionId, setBaileysSessionId] = useState("default");
  const [baileysStatus, setBaileysStatus] = useState<BaileysStatus | null>(null);
  const [baileysError, setBaileysError] = useState("");
  const [isStartingBaileys, setIsStartingBaileys] = useState(false);
  const baileysCompletedRef = useRef(false);
  const baileysLoggedOutResetRef = useRef(false);
  const restoredBaileysSessionsRef = useRef<Set<string>>(new Set());

  const getCompatibleAgents = (type: ChannelType) => {
    const rule = CHANNEL_AGENT_RULES[type];
    const activeAgents = availableAgents.filter((agent) => agent.status !== "Draft");
    const compatible = activeAgents.filter((agent) => {
      const text = normalizeAgentText(agent);
      return rule.matches.some((match) => text.includes(match));
    });

    if (compatible.some((agent) => agent.id === "agent-principal-1")) {
      return compatible;
    }

    const principal = activeAgents.find((agent) => agent.id === "agent-principal-1");
    return principal && ["whatsapp_personal", "messenger"].includes(type)
      ? [principal, ...compatible]
      : compatible;
  };

  const getDefaultAgentId = (type: ChannelType) => {
    const compatible = getCompatibleAgents(type);
    const preferred = CHANNEL_AGENT_RULES[type].defaultAgentId;
    return compatible.find((agent) => agent.id === preferred)?.id || compatible[0]?.id || "";
  };

  const getChannelAgentGroupLabel = (type: ChannelType) => CHANNEL_AGENT_RULES[type].label;

  const isAgentCompatibleWithChannel = (agentId: string, type: ChannelType) =>
    !agentId || getCompatibleAgents(type).some((agent) => agent.id === agentId);

  useEffect(() => {
    localStorage.setItem("rhdreams_channel_accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    setConnectionTest(null);
  }, [activeTab]);

  useEffect(() => {
    const compatibleDefault = getDefaultAgentId(activeTab);
    if (!selectedAgent || !isAgentCompatibleWithChannel(selectedAgent, activeTab)) {
      setSelectedAgent(compatibleDefault);
    }
  }, [activeTab, availableAgents]);

  useEffect(() => {
    let changed = false;
    const normalizedAccounts = accounts.map((account) => {
      if (isAgentCompatibleWithChannel(account.agentId, account.type)) return account;
      const nextAgentId = getDefaultAgentId(account.type);
      if (!nextAgentId) return account;
      changed = true;
      return { ...account, agentId: nextAgentId, lastSync: "Agente ajustado por canal" };
    });

    if (changed) {
      setAccounts(normalizedAccounts);
    }
  }, [availableAgents]);

  useEffect(() => {
    const syncAgents = () => {
      try {
        const stored = localStorage.getItem("rhdreams_agents");
        const parsed = stored ? JSON.parse(stored) : [];
        setAvailableAgents(Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPTY_AGENTS);
      } catch (_error) {
        setAvailableAgents(EMPTY_AGENTS);
      }
    };

    syncAgents();
    window.addEventListener("storage", syncAgents);
    window.addEventListener("focus", syncAgents);
    return () => {
      window.removeEventListener("storage", syncAgents);
      window.removeEventListener("focus", syncAgents);
    };
  }, []);

  const getAssignedAgent = (agentId: string) => availableAgents.find(agent => agent.id === agentId) || EMPTY_AGENTS.find(agent => agent.id === agentId);

  const whatsappAccounts = accounts.filter(account => account.type === "whatsapp_personal");

  const getNextWhatsAppSessionId = () => {
    const nextNumber = whatsappAccounts.length + 1;
    return nextNumber === 1 ? "whatsapp-rh-1" : `whatsapp-rh-${nextNumber}`;
  };

  const getAccountIsolationKey = (account: ChannelAccount) => {
    if (account.isolationKey) return account.isolationKey;
    if (account.type === "whatsapp_personal") {
      return account.phone.replace(/^Sesion Baileys:\s*/i, "").trim() || account.id;
    }
    return account.id;
  };

  const hasDuplicateWhatsAppSession = (sessionId: string) => {
    const normalized = sessionId.trim().toLowerCase();
    return whatsappAccounts.some(account => getAccountIsolationKey(account).toLowerCase() === normalized);
  };

  useEffect(() => {
    accounts
      .filter((account) => account.type === "whatsapp_personal" && account.status === "connected")
      .forEach((account) => {
        const sessionId = getAccountIsolationKey(account);
        if (!sessionId || restoredBaileysSessionsRef.current.has(sessionId)) return;

        restoredBaileysSessionsRef.current.add(sessionId);
        const assignedAgent = getAssignedAgent(account.agentId);
        apiFetch("/api/integrations/baileys/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            agentName: account.agentPersonalName || assignedAgent?.name || "Agente de Heavenly Dreams",
            companyName: account.companyName || DEFAULT_COMPANY_NAME,
            agentPrompt: assignedAgent?.basePrompt || assignedAgent?.description || "",
            autoReplyEnabled: true,
          }),
        }).catch(() => {
          restoredBaileysSessionsRef.current.delete(sessionId);
        });
      });
  }, [accounts, availableAgents]);
  
  // Advanced Rules State
  const [automationRules, setAutomationRules] = useState<any[]>([]);

  const addRule = () => {
    setAutomationRules([...automationRules, {
      id: `rule-${Date.now()}`,
      trigger: 'keyword',
      keywords: '',
      condition: 'contains',
      action: 'send_message',
      actionData: ''
    }]);
  };

  const removeRule = (id: string) => {
    setAutomationRules(automationRules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, field: string, value: any) => {
    setAutomationRules(automationRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.type === activeTab &&
    (acc.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
     acc.phone.includes(searchFilter))
  );

  const providerForActiveTab = () => {
    if (activeTab === 'whatsapp_personal') return 'whatsapp_personal';
    return null;
  };

  const testCurrentIntegration = async () => {
    if (activeTab === 'indeed' || activeTab === 'computrabajo') {
      setConnectionTest({
        ok: true,
        message: `${getPlatformLabel(activeTab)} no requiere API directa aqui. Queda listo para recibir candidatos por CSV, correo parser, feed autorizado o webhook intermedio.`,
      });
      return;
    }

    if (activeTab === 'facebook' || activeTab === 'messenger' || activeTab === 'instagram' || activeTab === 'tiktok') {
      setConnectionTest({
        ok: false,
        message: `${getPlatformLabel(activeTab)} requiere credenciales oficiales del proveedor y permisos aprobados antes de activar la conexion real.`,
      });
      return;
    }

    const provider = providerForActiveTab();
    if (!provider) {
      setConnectionTest({
        ok: false,
        message: "Selecciona un canal compatible para probar la conexion.",
      });
      return;
    }

    setTestingProvider(provider);
    try {
      const response = await apiFetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const payload = await readApiJson(response);
      setConnectionTest(payload.data || payload);
    } catch (error: any) {
      setConnectionTest({
        ok: false,
        message: error.message || "No se pudo probar la integracion.",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const analyzeFacebookRecruitmentAds = async () => {
    setIsAnalyzingFacebookAds(true);
    try {
      const response = await apiFetch("/api/integrations/facebook-ads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datePreset: "last_30d",
          dailyBudget: Number(facebookDailyBudget),
          targetLeads: Number(facebookTargetLeads),
          targetHires: Number(facebookTargetHires),
          leadToInterviewRate: 0.35,
          interviewToHireRate: 0.25,
        }),
      });
      const payload = await readApiJson(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No se pudo analizar Meta Ads.");
      }
      setFacebookAdsAnalysis(payload.data);
    } catch (error: any) {
      setFacebookAdsAnalysis(null);
      setConnectionTest({
        ok: false,
        message: error.message || "Revisa credenciales de Meta Ads.",
      });
    } finally {
      setIsAnalyzingFacebookAds(false);
    }
  };

  const startLinking = async () => {
    if (!newAccountName || !selectedAgent) return;
    if (!isAgentCompatibleWithChannel(selectedAgent, activeTab)) {
      setSelectedAgent(getDefaultAgentId(activeTab));
      setBaileysError(`Ese agente no pertenece a ${getPlatformLabel(activeTab)}. Seleccione un agente del grupo ${getChannelAgentGroupLabel(activeTab)}.`);
      return;
    }
    
    if (activeTab === 'whatsapp_personal') {
      const sessionId = baileysSessionId.trim() || "default";
      if (hasDuplicateWhatsAppSession(sessionId)) {
        setBaileysError("Ya existe una cuenta de WhatsApp usando esta sesión. Usa otra sesión para que sus agentes y conversaciones queden separados.");
        return;
      }

      baileysCompletedRef.current = false;
      baileysLoggedOutResetRef.current = false;
      setBaileysError("");
      setBaileysStatus(null);
      setIsStartingBaileys(true);
      setModalStep('qr');

      try {
        const assignedAgent = getAssignedAgent(selectedAgent);
        const agentName = newAgentPersonalName.trim() || assignedAgent?.name || "Agente de Heavenly Dreams";
        const response = await apiFetch("/api/integrations/baileys/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            agentName,
            companyName: newAccountCompanyName.trim() || DEFAULT_COMPANY_NAME,
            agentPrompt: assignedAgent?.basePrompt || assignedAgent?.description || "",
            autoReplyEnabled: true,
            resetSession: true,
          }),
        });
        const payload = await readApiJson(response);
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "No se pudo iniciar Baileys.");
        }
        setBaileysStatus(payload.data);

        if (payload.data?.state === "connected") {
          baileysCompletedRef.current = true;
          setModalStep('success');
          setTimeout(() => {
            handleCreateAccount();
          }, 1200);
        }
      } catch (error: any) {
        setBaileysError(
          error.message === "API endpoint no encontrado"
            ? "Baileys necesita el backend Express activo en un servidor persistente. En DigitalOcean podra generar QR si la API esta desplegada junto con la app."
            : error.message || "No se pudo generar el QR de Baileys."
        );
      } finally {
        setIsStartingBaileys(false);
      }
    } else if (activeTab === 'indeed' || activeTab === 'computrabajo') {
      setModalStep('success');
      setTimeout(() => {
        handleCreateAccount();
      }, 900);
    } else {
      setModalStep('oauth_connecting');
      setTimeout(() => {
        setModalStep('success');
        setTimeout(() => {
          handleCreateAccount();
        }, 1500);
      }, 2500);
    }
  };

  const handleCreateAccount = () => {
    let phoneIdText = "";
    if (activeTab === 'whatsapp_personal') {
      phoneIdText = baileysStatus?.phone || `Sesion Baileys: ${baileysSessionId.trim() || "default"}`;
    } else if (activeTab === 'indeed') {
      phoneIdText = `Entrada: CSV/correo/webhook Indeed`;
    } else if (activeTab === 'computrabajo') {
      phoneIdText = "Entrada: CSV/correo/webhook Computrabajo";
    } else if (activeTab === 'facebook') {
      phoneIdText = `ID: pg_${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else if (activeTab === 'messenger') {
      phoneIdText = `ID: msg_${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else if (activeTab === 'instagram') {
      phoneIdText = `ID: ig_${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else {
      phoneIdText = `ID: tt_${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    const added = {
      id: `${activeTab}-${Date.now()}`,
      name: newAccountName,
      phone: phoneIdText,
      status: "connected",
      agentId: selectedAgent,
      lastSync: "Justo ahora",
      type: activeTab,
      mode: getPlatformMode(activeTab),
      webhookUrl: getWebhookUrl(activeTab),
      isolationKey: activeTab === 'whatsapp_personal' ? baileysSessionId.trim() || "default" : undefined,
      companyName: newAccountCompanyName.trim() || DEFAULT_COMPANY_NAME,
      agentPersonalName: newAgentPersonalName.trim() || undefined,
    };
    
    setAccounts([...accounts, added]);
    setIsModalOpen(false);
    setModalStep('info');
    setNewAccountName('');
    setNewAccountCompanyName(DEFAULT_COMPANY_NAME);
    setNewAgentPersonalName('');
    setSelectedAgent('');
    setBaileysStatus(null);
    setBaileysError('');
  };

  useEffect(() => {
    if (!isModalOpen || modalStep !== 'qr' || activeTab !== 'whatsapp_personal') return;

    const sessionId = baileysSessionId.trim() || "default";
    const interval = window.setInterval(async () => {
      try {
        const response = await apiFetch(`/api/integrations/baileys/status/${encodeURIComponent(sessionId)}`);
        const payload = await readApiJson(response);
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "No se pudo leer el estado de Baileys.");
        }

        setBaileysStatus(payload.data);
        if (!payload.data?.lastError) {
          setBaileysError("");
        }
        if (payload.data?.lastError) {
          const friendlyError =
            payload.data.state === "logged_out" || /connection failure/i.test(payload.data.lastError)
              ? "La sesion anterior expiro. Estamos generando un QR nuevo para volver a vincular WhatsApp."
              : payload.data.lastError;
          setBaileysError(friendlyError);
        }

        if (payload.data?.state === "logged_out" && !baileysLoggedOutResetRef.current) {
          baileysLoggedOutResetRef.current = true;
          setBaileysError("La sesion anterior expiro o fue desvinculada. Generando un QR nuevo...");
          const assignedAgent = getAssignedAgent(selectedAgent);
          const agentName = newAgentPersonalName.trim() || assignedAgent?.name || "Agente de Heavenly Dreams";
          const restartResponse = await apiFetch("/api/integrations/baileys/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              agentName,
              companyName: newAccountCompanyName.trim() || DEFAULT_COMPANY_NAME,
              agentPrompt: assignedAgent?.basePrompt || assignedAgent?.description || "",
              autoReplyEnabled: true,
              resetSession: true,
            }),
          });
          const restartPayload = await readApiJson(restartResponse);
          if (restartPayload?.data) {
            setBaileysStatus(restartPayload.data);
          }
        }

        if (payload.data?.state === "connected" && !baileysCompletedRef.current) {
          baileysCompletedRef.current = true;
          setModalStep('success');
          window.setTimeout(() => {
            handleCreateAccount();
          }, 1200);
        }
      } catch (error: any) {
        setBaileysError(
          error.message === "API endpoint no encontrado"
            ? "Baileys no esta disponible porque el backend Express no respondio. Revisa que el servicio de DigitalOcean este corriendo."
            : error.message || "No se pudo actualizar el estado de Baileys."
        );
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeTab, baileysSessionId, isModalOpen, modalStep, baileysStatus?.phone]);

  const confirmRemoveAccount = (account: any) => {
    setAccountToUnlink(account);
  };

  const removeAccount = () => {
    if (accountToUnlink) {
      setAccounts(accounts.filter(a => a.id !== accountToUnlink.id));
      setAccountToUnlink(null);
    }
  };

  const getDefaultWelcomeMessage = (account: ChannelAccount) => {
    const agent = getAssignedAgent(account.agentId);
    const agentName = agent?.name || "tu asistente de reclutamiento";
    const companyName = account.companyName || agent?.companyName || DEFAULT_COMPANY_NAME;

    switch (account.type) {
      case 'whatsapp_personal':
        return WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-saludo-precalificacion")?.body || "";
      case 'facebook':
        return `Hola, soy ${agentName} de ${companyName}. Gracias por tu interés en nuestras vacantes. ¿Qué puesto te interesa y en qué ciudad estás para darte la información correcta?`;
      case 'messenger':
        return `Hola, soy ${agentName}. Con gusto te ayudo por Messenger. Para orientarte mejor dime tu nombre, ciudad y la vacante que te interesa.`;
      case 'instagram':
        return `¡Hola! Soy ${agentName} de ${companyName}. Si buscas empleo, dime la palabra VACANTE y tu ciudad para enviarte opciones disponibles.`;
      case 'tiktok':
        return `Hola, soy ${agentName}. Recibimos tu registro desde TikTok. ¿Confirmas que sigues interesado y que podemos contactarte para una entrevista?`;
      default:
        return `¡Hola! Gracias por comunicarte con nuestro equipo a través de ${getPlatformLabel(account.type)}. ¿En qué posición o vacante estás interesado para enviarte toda la información pertinente?`;
    }
  };

  const getDefaultFollowUpMessage = (type: ChannelType) => {
    switch (type) {
      case 'whatsapp_personal':
        return WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-agendar-entrevista")?.body || "";
      case 'facebook':
        return "Hola de nuevo, ¿sigues interesado en la vacante? Puedo enviarte requisitos, horarios y el siguiente paso para aplicar.";
      case 'messenger':
        return "Solo paso a confirmar si deseas continuar con tu postulación. Si me compartes tu disponibilidad, puedo ayudarte a agendar.";
      case 'instagram':
        return "¿Te comparto los requisitos y beneficios de la vacante? Responde EMPLEO y te ayudo con el registro.";
      case 'tiktok':
        return "Vimos tu registro de TikTok. Para avanzar necesitamos confirmar tu teléfono, ciudad y disponibilidad.";
      default:
        return "Hola de nuevo, detectamos que no hemos recibido respuesta. ¿Pudiste revisar el formulario? Si tienes dudas házmelo saber.";
    }
  };

  const getDefaultAutomationRules = (type: ChannelType, agentId: string) => {
    if (type === 'whatsapp_personal') {
      return [
        { id: 'rule-wa-info', trigger: 'keyword', keywords: 'hola, informes, empleo, vacante, trabajo', condition: 'contains', action: 'send_message', actionData: WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-saludo-precalificacion")?.body || "" },
        { id: 'rule-wa-ayudante', trigger: 'keyword', keywords: 'ayudante, operativo, sin experiencia', condition: 'contains', action: 'send_message', actionData: WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-ayudante-general")?.body || "" },
        { id: 'rule-wa-asesor', trigger: 'keyword', keywords: 'asesor, comercial, ventas', condition: 'contains', action: 'send_message', actionData: WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-asesor-comercial")?.body || "" },
        { id: 'rule-wa-supervisor', trigger: 'keyword', keywords: 'supervisor, liderazgo, lider', condition: 'contains', action: 'send_message', actionData: WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-supervisor-area")?.body || "" },
        { id: 'rule-wa-ubicacion', trigger: 'keyword', keywords: 'ubicacion, dirección, direccion, donde, metro', condition: 'contains', action: 'send_message', actionData: WHATSAPP_RECRUITMENT_TEMPLATES.find((template) => template.id === "wa-ubicacion")?.body || "" }
      ];
    }

    if (type === 'facebook') {
      return [
        { id: 'rule-facebook-info', trigger: 'keyword', keywords: 'info, información, empleo, vacante, requisitos', condition: 'contains', action: 'assign_agent', actionData: agentId },
        { id: 'rule-facebook-comment', trigger: 'keyword', keywords: 'me interesa, quiero aplicar, informes', condition: 'contains', action: 'send_message', actionData: '¡Gracias por tu interés! Te escribo por mensaje para compartirte requisitos, horarios y próximos pasos.' }
      ];
    }

    if (type === 'messenger') {
      return [
        { id: 'rule-messenger-any', trigger: 'keyword', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
        { id: 'rule-messenger-agenda', trigger: 'keyword', keywords: 'entrevista, cita, agendar, horario', condition: 'contains', action: 'send_message', actionData: 'Claro, te ayudo a revisar disponibilidad para entrevista. ¿Qué día y horario te funciona mejor?' }
      ];
    }

    if (type === 'instagram') {
      return [
        { id: 'rule-instagram-empleo', trigger: 'keyword', keywords: 'empleo, vacante, trabajo, aplicar', condition: 'contains', action: 'assign_agent', actionData: agentId },
        { id: 'rule-instagram-cv', trigger: 'keyword', keywords: 'cv, curriculum, portafolio', condition: 'contains', action: 'send_message', actionData: 'Puedes compartir tu CV o portafolio por el canal autorizado y te guiamos con el siguiente paso.' }
      ];
    }

    if (type === 'tiktok') {
      return [
        { id: 'rule-tiktok-form', trigger: 'form', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
        { id: 'rule-tiktok-confirm', trigger: 'keyword', keywords: 'si, sí, interesado, aplicar', condition: 'contains', action: 'send_message', actionData: 'Perfecto. Confirmemos ciudad, teléfono y disponibilidad para avanzar con reclutamiento.' }
      ];
    }

    return [
      { id: 'rule-default', trigger: 'keyword', keywords: 'información, empleo, vacante', condition: 'contains', action: 'send_message', actionData: '¡Hola! Claro, te comparto la información de nuestras vacantes actuales.' }
    ];
  };

  const openAutomationConfig = (account: ChannelAccount) => {
    setAccountToAutomate(account);
    setWelcomeMessage(getDefaultWelcomeMessage(account));
    setFollowUpMessage(getDefaultFollowUpMessage(account.type));
    setAutomationRules(getDefaultAutomationRules(account.type, account.agentId));
  };

  const saveAutomationConfig = () => {
    setAccountToAutomate(null);
  };

  const applyRecruitmentTemplateToWelcome = (body: string) => {
    setWelcomeMessage(body);
  };

  const applyRecruitmentTemplateToFollowUp = (body: string) => {
    setFollowUpMessage(body);
  };

  const addRecruitmentTemplateRule = (templateId: string) => {
    const template = WHATSAPP_RECRUITMENT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setAutomationRules((rules) => [
      ...rules,
      {
        id: `rule-template-${Date.now()}`,
        trigger: 'keyword',
        keywords: template.stage === "entrevista" ? "entrevista, agendar, cita" : template.title.toLowerCase(),
        condition: 'contains',
        action: 'send_message',
        actionData: template.body
      }
    ]);
  };

  const assignAgent = (accountId: string, agentId: string) => {
    setAccounts(accounts.map((account) => {
      if (account.id !== accountId) return account;
      if (!isAgentCompatibleWithChannel(agentId, account.type)) return account;
      return { ...account, agentId, lastSync: "Justo ahora" };
    }));
  };

  const getPlatformLabel = (type: string) => {
    switch(type) {
      case 'whatsapp_personal': return 'WhatsApp Normal';
      case 'indeed': return 'Indeed';
      case 'computrabajo': return 'Computrabajo';
      case 'facebook': return 'Facebook Lead Ads';
      case 'messenger': return 'Messenger';
      case 'instagram': return 'Instagram DM';
      case 'tiktok': return 'TikTok Leads';
      default: return 'Canal';
    }
  };

  const getPlatformColor = (type: string) => {
    switch(type) {
      case 'whatsapp_personal': return 'text-emerald-300 border-emerald-500/30';
      case 'indeed': return 'text-blue-300 border-blue-500/30';
      case 'computrabajo': return 'text-sky-300 border-sky-500/30';
      case 'facebook': return 'text-blue-400 border-blue-500/30';
      case 'messenger': return 'text-sky-400 border-sky-500/30';
      case 'instagram': return 'text-pink-400 border-pink-500/30';
      case 'tiktok': return 'text-cyan-400 border-cyan-500/30';
      default: return 'text-slate-400 border-slate-700';
    }
  };

  const getPlatformIcon = (type: string) => {
    const image = CHANNEL_ICON_IMAGES[type as ChannelType];
    if (image) {
      return (
        <img
          src={image}
          alt={`${getPlatformLabel(type)} icono`}
          className="h-5 w-5 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.35)]"
          loading="lazy"
        />
      );
    }

    switch(type) {
      case 'whatsapp_personal': return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'indeed': return <MessageSquare className="w-5 h-5 text-blue-300" />;
      case 'computrabajo': return <SmartphoneNfc className="w-5 h-5 text-sky-300" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-400" />;
      case 'messenger': return <MessageSquare className="w-5 h-5 text-sky-400" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-400" />;
      case 'tiktok': return <Video className="w-5 h-5 text-cyan-400" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  const getPlatformMode = (type: string) => {
    switch(type) {
      case 'whatsapp_personal': return 'Baileys WhatsApp Web';
      case 'indeed': return 'CSV / Email parser / Feed autorizado / Webhook';
      case 'computrabajo': return 'Feed autorizado / CSV / Webhook';
      case 'facebook': return 'Meta Graph API / Lead Ads';
      case 'messenger': return 'Meta Messenger API';
      case 'instagram': return 'Instagram Messaging API';
      case 'tiktok': return 'TikTok Lead Generation';
      default: return 'Canal externo';
    }
  };

  const getWebhookUrl = (type: string) => {
    switch(type) {
      case 'indeed': return apiUrl('/api/integrations/webhooks/job-board/indeed');
      case 'computrabajo': return apiUrl('/api/integrations/webhooks/job-board/computrabajo');
      default: return undefined;
    }
  };

  const getCaptureDescription = (type: string) => {
    switch(type) {
      case 'whatsapp_personal':
        return "Conector local Baileys: genera QR real, vincula WhatsApp Web, recibe mensajes y permite al agente responder desde el dispositivo enlazado.";
      case 'indeed':
        return "Entrada sin API directa obligatoria: importa postulantes desde CSV, correo parser, feed autorizado, Indeed Apply empresarial o webhook intermedio.";
      case 'computrabajo':
        return "Entrada sin API directa obligatoria: captura candidatos por CSV, correo parser, exportacion del portal, feed empresarial o webhook intermedio.";
      case 'facebook':
        return "Captura leads y comentarios desde Facebook; Aurora responde dudas, precalifica y envía candidatos al CRM.";
      case 'messenger':
        return "Inbox conversacional de Messenger: Mía responde preguntas, solicita datos mínimos y agenda entrevistas.";
      case 'instagram':
        return "Respuestas instantáneas en DMs para candidatos que envíen 'EMPLEO', 'VACANTE' o 'APLICAR'.";
      case 'tiktok':
        return "Lectura automática de formularios de TikTok Lead Gen y confirmación con agente de IA.";
      default:
        return "Canal externo de reclutamiento conectado al CRM.";
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            Canales de Mensajería y Redes Sociales
          </h1>
          <p className="text-slate-400 text-sm">Gestiona tus conexiones de reclutamiento desde un único lugar asignando Agentes de IA conversacionales.</p>
        </div>
        
        <button 
          onClick={() => {
            setModalStep('info');
            setSelectedAgent(getDefaultAgentId(activeTab));
            setNewAccountName(
              activeTab === 'whatsapp_personal'
                ? 'WhatsApp Baileys Reclutamiento'
                : ''
            );
            setBaileysSessionId(activeTab === 'whatsapp_personal' ? getNextWhatsAppSessionId() : "default");
            setBaileysStatus(null);
            setBaileysError("");
            baileysCompletedRef.current = false;
            setIsModalOpen(true);
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] uppercase tracking-wide border",
            activeTab === 'whatsapp_personal' ? "bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-250" :
            activeTab === 'indeed' ? "bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/40 text-blue-250" :
            activeTab === 'computrabajo' ? "bg-sky-600/20 border-sky-500/50 hover:bg-sky-600/40 text-sky-250" :
            activeTab === 'facebook' ? "bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/40 text-blue-250" :
            activeTab === 'messenger' ? "bg-sky-600/20 border-sky-500/50 hover:bg-sky-600/40 text-sky-250" :
            activeTab === 'instagram' ? "bg-pink-600/20 border-pink-500/50 hover:bg-pink-600/40 text-pink-250" :
            "bg-cyan-600/20 border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-250"
          )}
        >
          {activeTab === 'whatsapp_personal' ? <QrCode className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Enlazar nuevo {getPlatformLabel(activeTab)}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 border border-white/5 rounded-xl self-start">
        {[
          { id: 'indeed', name: 'Indeed', icon: MessageSquare, color: 'text-blue-300' },
          { id: 'computrabajo', name: 'Computrabajo', icon: SmartphoneNfc, color: 'text-sky-300' },
          { id: 'whatsapp_personal', name: 'WhatsApp Normal', icon: Smartphone, color: 'text-emerald-400' },
          { id: 'facebook', name: 'Facebook Leads', icon: Facebook, color: 'text-blue-400' },
          { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: 'text-sky-400' },
          { id: 'instagram', name: 'Instagram DM', icon: Instagram, color: 'text-pink-400' },
          { id: 'tiktok', name: 'TikTok Leads', icon: Video, color: 'text-cyan-400' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
              activeTab === tab.id
                ? "bg-slate-800 text-white shadow-md border border-white/10"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {CHANNEL_ICON_IMAGES[tab.id as ChannelType] ? (
              <img
                src={CHANNEL_ICON_IMAGES[tab.id as ChannelType]}
                alt={`${tab.name} icono`}
                className="h-4 w-4 object-contain"
                loading="lazy"
              />
            ) : (
              <tab.icon className={cn("w-4 h-4", tab.color)} />
            )}
            {tab.name}
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="glass-panel p-2 rounded-xl flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 ml-2 text-slate-500" />
        <input 
          type="text" 
          placeholder={`Buscar cuenta de ${getPlatformLabel(activeTab)}...`}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-transparent border-none outline-none focus:ring-0 text-white text-sm placeholder:text-slate-500"
        />
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 p-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-xl border bg-slate-950/50", getPlatformColor(activeTab))}>
            {getPlatformIcon(activeTab)}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{getPlatformLabel(activeTab)}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">{getCaptureDescription(activeTab)}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
              <Zap className="h-3 w-3" />
              Agentes activos: {getChannelAgentGroupLabel(activeTab)}
            </div>
            {getWebhookUrl(activeTab) && (
              <div className="mt-2 text-[10px] text-cyan-300 font-mono bg-slate-950 border border-cyan-500/10 rounded-lg px-2 py-1 inline-block">
                Webhook: {getWebhookUrl(activeTab)}
              </div>
            )}
            {(activeTab === 'indeed' || activeTab === 'computrabajo') && (
              <div className="mt-2 flex flex-wrap gap-2">
                {["CSV", "Correo parser", "Feed autorizado", "Webhook"].map((method) => (
                  <span key={method} className="rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                    {method}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {connectionTest && (
            <span className={cn(
              "text-[11px] px-3 py-2 rounded-lg border",
              connectionTest.ok ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-amber-300 border-amber-500/30 bg-amber-500/10"
            )}>
              {connectionTest.ok ? "Lista" : "Pendiente"}: {connectionTest.message}
            </span>
          )}
          <button
            onClick={testCurrentIntegration}
            disabled={!!testingProvider}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {testingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {activeTab === 'indeed' || activeTab === 'computrabajo' ? "Ver forma correcta" : "Probar conexión"}
          </button>
        </div>
      </div>

      {activeTab === 'whatsapp_personal' && (
        <div className="glass-panel rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-[0.18em]">
                <Shield className="w-4 h-4" />
                Modulo extra: aislamiento por cuenta
              </div>
              <h3 className="mt-2 text-xl font-bold text-white">Cada WhatsApp trabaja con su propio agente</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Cuando enlaces otro numero, usa una sesion diferente. La app separa cuenta, agente y reglas para que las respuestas no se mezclen entre lineas de WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 min-w-full xl:min-w-[420px]">
              <div className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cuentas</p>
                <p className="mt-1 text-2xl font-bold text-white">{whatsappAccounts.length}</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agentes</p>
                <p className="mt-1 text-2xl font-bold text-white">{new Set(whatsappAccounts.map(account => account.agentId)).size}</p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sesiones</p>
                <p className="mt-1 text-2xl font-bold text-white">{new Set(whatsappAccounts.map(getAccountIsolationKey)).size}</p>
              </div>
            </div>
          </div>

          {whatsappAccounts.length > 0 && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {whatsappAccounts.map(account => {
                const agent = getAssignedAgent(account.agentId);
                return (
                  <div key={`isolation-${account.id}`} className="rounded-xl border border-white/5 bg-slate-950/45 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{account.name}</p>
                        <p className="mt-1 text-[11px] font-mono text-emerald-300">Sesion aislada: {getAccountIsolationKey(account)}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                        No mezcla
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Agente asignado a esta cuenta</p>
                      <p className="mt-1 text-xs text-slate-200">{account.agentPersonalName || agent?.name || "Sin agente asignado"}</p>
                      {account.agentPersonalName && (
                        <p className="mt-1 text-[10px] text-slate-500">Base IA: {agent?.name || "Agente seleccionado"}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'facebook' && (
        <div className="glass-panel rounded-2xl border border-blue-500/20 p-5 overflow-hidden relative">
          <div className="absolute right-0 top-0 h-32 w-32 bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-[0.18em]">
                  <BarChart3 className="w-4 h-4" />
                  Facebook Recruitment Ads
                </div>
                <h3 className="mt-2 text-xl font-bold text-white">Agente optimizador de campañas pagadas</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Aurora analiza campañas de reclutamiento, calcula gasto, CPL, CTR, costo estimado por contratación y recomienda las mejores horas para invertir.
                </p>
              </div>
              <button
                onClick={analyzeFacebookRecruitmentAds}
                disabled={isAnalyzingFacebookAds}
                className="h-11 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {isAnalyzingFacebookAds ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Analizar gasto y horarios
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-300" />
                  Presupuesto diario
                </span>
                <input
                  type="number"
                  min={1}
                  value={facebookDailyBudget}
                  onChange={(event) => setFacebookDailyBudget(Number(event.target.value))}
                  className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
                />
              </label>
              <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
                  <Target className="w-3 h-3 text-cyan-300" />
                  Meta de leads
                </span>
                <input
                  type="number"
                  min={1}
                  value={facebookTargetLeads}
                  onChange={(event) => setFacebookTargetLeads(Number(event.target.value))}
                  className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
                />
              </label>
              <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-300" />
                  Meta de contrataciones
                </span>
                <input
                  type="number"
                  min={1}
                  value={facebookTargetHires}
                  onChange={(event) => setFacebookTargetHires(Number(event.target.value))}
                  className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
                />
              </label>
            </div>

            {facebookAdsAnalysis ? (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Gasto", value: `$${facebookAdsAnalysis.summary.totalSpend}`, icon: DollarSign, color: "text-emerald-300" },
                    { label: "Leads", value: facebookAdsAnalysis.summary.totalLeads, icon: Target, color: "text-cyan-300" },
                    { label: "CPL", value: `$${facebookAdsAnalysis.summary.cpl}`, icon: TrendingUp, color: "text-blue-300" },
                    { label: "CTR", value: `${facebookAdsAnalysis.summary.ctr}%`, icon: BarChart3, color: "text-purple-300" },
                    { label: "Entrevistas", value: facebookAdsAnalysis.summary.estimatedInterviews, icon: CalendarClock, color: "text-amber-300" },
                    { label: "Contrataciones", value: facebookAdsAnalysis.summary.estimatedHires, icon: CheckCircle2, color: "text-emerald-300" },
                    { label: "Costo/contr.", value: `$${facebookAdsAnalysis.summary.costPerEstimatedHire}`, icon: DollarSign, color: "text-rose-300" },
                    { label: "Presup. sugerido", value: `$${facebookAdsAnalysis.summary.recommendedBudget}`, icon: Target, color: "text-cyan-300" },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        <metric.icon className={cn("w-3.5 h-3.5", metric.color)} />
                        {metric.label}
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">{metric.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Sparkles className="w-4 h-4 text-blue-300" />
                    Recomendación del agente
                  </div>
                  <div className="mt-3 space-y-3 text-xs leading-5 text-slate-300">
                    <p>{facebookAdsAnalysis.recommendation.bestTime}</p>
                    <p>{facebookAdsAnalysis.recommendation.budget}</p>
                    <p>{facebookAdsAnalysis.recommendation.agentAction}</p>
                  </div>
                </div>

                <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-300" />
                      Mejores horas para invertir
                    </h4>
                    <div className="mt-3 space-y-2">
                      {facebookAdsAnalysis.bestHours.map((hour) => (
                        <div key={hour.hour} className="flex items-center justify-between rounded-lg bg-slate-900/80 border border-white/5 px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{hour.hour}</p>
                            <p className="text-[11px] text-slate-500">{hour.leads} leads • CTR {hour.ctr}%</p>
                          </div>
                          <span className="text-sm font-bold text-cyan-300">CPL ${hour.cpl ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-blue-300" />
                      Campañas activas
                    </h4>
                    <div className="mt-3 space-y-2">
                      {facebookAdsAnalysis.campaigns.map((campaign) => (
                        <div key={campaign.campaign} className="rounded-lg bg-slate-900/80 border border-white/5 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white truncate">{campaign.campaign}</p>
                            <span className="text-xs font-bold text-emerald-300">${campaign.spend}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{campaign.leads} leads • CPL ${campaign.cpl ?? 0} • CTR {campaign.ctr}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-blue-500/25 bg-slate-950/30 p-4 text-sm text-slate-400">
                Ejecuta el análisis para que el agente calcule gasto, CPL, mejor hora y presupuesto recomendado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Accounts */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 xl:gap-6">
        {filteredAccounts.map(account => (
          <div 
            key={account.id} 
            className={cn(
              "glass-panel rounded-2xl flex min-w-0 flex-col p-5 lg:p-6 border transition-all duration-300 group hover:shadow-xl",
              account.status === 'connected' ? "hover:border-cyan-500/30 border-white/5" : "border-rose-500/20"
            )}
          >
            <div className="mb-4 flex flex-col gap-4">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                  account.status === 'connected' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                )}>
                  {getPlatformIcon(account.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold leading-tight tracking-tight text-white transition-colors group-hover:text-cyan-300">{account.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">{account.companyName || DEFAULT_COMPANY_NAME}</p>
                  {account.agentPersonalName && (
                    <p className="mt-0.5 text-xs font-semibold text-emerald-300">Atiende: {account.agentPersonalName}</p>
                  )}
                  <p className="break-words text-xs font-mono text-slate-400">{account.phone}</p>
                </div>
                </div>
                <div className={cn(
                  "shrink-0 px-2.5 py-1 flex items-center gap-1 rounded-full text-[9px] uppercase tracking-wider font-bold border",
                  account.status === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  {account.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                  {account.status === "connected" ? "Conectado" : "Desvinculado"}
                </div>
              </div>

              {getAssignedAgent(account.agentId) && (
                <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Sabe responder sobre</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {getAssignedAgent(account.agentId)?.description}
                  </p>
                </div>
              )}
            </div>

            {/* Campaign info section dynamically shown per platform */}
            <div className="mb-4 bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Modo de Captura</div>
              <p className="text-xs text-slate-300 font-light">
                {getCaptureDescription(account.type)}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="text-[10px] text-slate-400 border border-white/5 bg-slate-950 px-2 py-1 rounded-lg">
                  {account.mode || getPlatformMode(account.type)}
                </span>
                {account.webhookUrl && (
                  <span className="text-[10px] text-cyan-300 border border-cyan-500/10 bg-slate-950 px-2 py-1 rounded-lg font-mono">
                    {account.webhookUrl}
                  </span>
                )}
              </div>
            </div>

            {account.type === "whatsapp_personal" && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  <Shield className="w-3.5 h-3.5" />
                  Aislamiento activo
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  Esta cuenta usa su propia sesion, agente y reglas. Los mensajes entrantes se enrutan solo al agente seleccionado aqui.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-emerald-500/20 bg-slate-950/70 px-2 py-1 text-[10px] font-mono text-emerald-300">
                    {getAccountIsolationKey(account)}
                  </span>
                  <span className="rounded-lg border border-cyan-500/20 bg-slate-950/70 px-2 py-1 text-[10px] text-cyan-300">
                    Agente: {account.agentPersonalName || getAssignedAgent(account.agentId)?.name || "Sin asignar"}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-slate-700/50 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" /> Agente AI Asignado
                </label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
                    value={account.agentId}
                    onChange={(e) => assignAgent(account.id, e.target.value)}
                  >
                    <option value="">-- Sin asignar --</option>
                    {getCompatibleAgents(account.type).map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {CHANNEL_AGENT_RULES[account.type].helper}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-550 font-mono">Actualizado: {account.lastSync}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openAutomationConfig(account)}
                    className="text-slate-500 hover:text-cyan-450 p-1.5 rounded-md hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20"
                    title="Configurar Mensajes Automáticos"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => confirmRemoveAccount(account)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                    title="Desvincular cuenta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredAccounts.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/5 rounded-3xl bg-slate-900/10">
            {getPlatformIcon(activeTab)}
            <p className="mt-4 text-sm font-medium">No se encontraron cuentas o campañas de {getPlatformLabel(activeTab)} vinculadas.</p>
            <p className="text-xs text-slate-600 mt-1">Haz clic arriba para vincular e integrar tu primera conexión.</p>
          </div>
        )}
      </div>

      {/* Link Account Tab Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-start justify-center overflow-y-auto px-4 py-6 md:py-10">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl relative flex max-h-[calc(100vh-3rem)] flex-col glass-panel shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {modalStep === 'info' && (
              <>
                <div className="shrink-0 border-b border-white/5 px-5 py-5 pr-14 md:px-7">
                  <h2 className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-bold text-transparent">
                   {getPlatformIcon(activeTab)}
                   Vincular {getPlatformLabel(activeTab)}
                  </h2>
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-7 styled-scrollbar">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre Identificador</label>
                    <input 
                      type="text" 
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-505 transition-all"
                      placeholder={
                        activeTab === 'whatsapp_personal' ? "Ej: WhatsApp personal de reclutamiento" :
                        activeTab === 'indeed' ? "Ej: Indeed Apply Operaciones MX" :
                        activeTab === 'computrabajo' ? "Ej: Computrabajo CDMX Ventas" :
                        activeTab === 'facebook' ? "Ej: Facebook Lead Ads México" :
                        activeTab === 'messenger' ? "Ej: Messenger FanPage RH" :
                        activeTab === 'instagram' ? "Ej: Cuenta IG @TalentDream" : "Ej: Campaña TikTok Lead Ads 2026"
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Empresa que atenderá esta cuenta</label>
                    <input
                      type="text"
                      value={newAccountCompanyName}
                      onChange={(e) => setNewAccountCompanyName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="Ej: Heavenly Dreams, Cliente A, Restaurante Norte"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Este nombre entra al prompt para que el agente no mezcle empresas ni cuentas.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre personal del agente</label>
                    <input
                      type="text"
                      value={newAgentPersonalName}
                      onChange={(e) => setNewAgentPersonalName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="Ej: Laura de RH, Edgar Reclutamiento, Asesor Heavenly"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Este alias se usará como nombre visible y personalidad del agente al responder por esta cuenta.
                    </p>
                  </div>

                  {activeTab === 'whatsapp_personal' && (
                    <div>
                      <label className="text-sm text-slate-300 mb-1.5 block">Sesión Baileys</label>
                      <input
                        type="text"
                        value={baileysSessionId}
                        onChange={(e) => setBaileysSessionId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="default"
                      />
                      <p className="text-xs text-slate-500 mt-2 font-light">
                        Usa una sesión por número. El QR se guarda localmente para reutilizar la conexión.
                      </p>
                      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Separación de agentes</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">
                          Si abres otra cuenta de WhatsApp, cambia este nombre de sesión. Así cada número queda aislado con su propio agente y no comparte conversaciones.
                        </p>
                      </div>
                      {baileysError && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          {baileysError}
                        </div>
                      )}
                    </div>
                  )}

                  {(activeTab === 'indeed' || activeTab === 'computrabajo') && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Conexion sin API directa</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">
                        Este canal se alimenta por exportacion CSV, correo parser, feed autorizado o webhook. La cuenta queda separada con su agente para clasificar candidatos y dar seguimiento sin mezclar portales.
                      </p>
                      {getWebhookUrl(activeTab) && (
                        <p className="mt-2 break-all rounded-lg bg-slate-950/70 px-2 py-2 font-mono text-[10px] text-cyan-200">
                          {getWebhookUrl(activeTab)}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> 
                      Vincular con Agente AI ({getChannelAgentGroupLabel(activeTab)})
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                      >
                        <option value="">Selecciona un Agente...</option>
                        {getCompatibleAgents(activeTab).map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.name} - {agent.role}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-light">
                      {CHANNEL_AGENT_RULES[activeTab].helper} Los agentes de otros canales quedan ocultos para evitar respuestas cruzadas.
                    </p>
                    {getCompatibleAgents(activeTab).length === 0 && (
                      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        No hay agentes compatibles activos para este canal. Activa o crea un agente con canal {getChannelAgentGroupLabel(activeTab)}.
                      </div>
                    )}
                    {getAssignedAgent(selectedAgent) && (
                      <div className="mt-3 rounded-xl border border-cyan-500/10 bg-slate-950/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Agente activo para este canal</p>
                        <p className="mt-1 text-xs font-semibold text-white">{getAssignedAgent(selectedAgent)?.name}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">{getAssignedAgent(selectedAgent)?.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex justify-end gap-3 border-t border-white/5 bg-slate-950/30 px-5 py-4 md:px-7">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={startLinking}
                    disabled={!newAccountName || !selectedAgent || isStartingBaileys}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingBaileys ? 'Iniciando...' : activeTab === 'whatsapp_personal' ? 'Generar Código QR' : activeTab === 'indeed' || activeTab === 'computrabajo' ? 'Crear entrada sin API' : 'Conectar con API oficial'}
                  </button>
                </div>
              </>
            )}

            {modalStep === 'qr' && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Escanea el código QR de Baileys</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-[300px]">Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este QR real para enlazar la sesión local.</p>
                
                <div className="bg-white p-4 rounded-2xl mb-6 relative min-h-[224px] min-w-[224px] flex items-center justify-center">
                  {baileysStatus?.qrDataUrl ? (
                    <img src={baileysStatus.qrDataUrl} alt="QR Baileys" className="w-56 h-56" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-900">
                      <QrCode className="w-24 h-24" />
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>

                <div className="flex items-center gap-2 text-sm text-cyan-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {baileysStatus?.state === "qr"
                    ? "Esperando escaneo desde tu dispositivo móvil..."
                    : baileysStatus?.state === "logged_out"
                      ? "QR anterior vencido. Preparando uno nuevo..."
                      : "Preparando sesión Baileys..."}
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">
                  Sesión: {baileysStatus?.id || baileysSessionId || "default"} · Estado: {baileysStatus?.state || "connecting"}
                </p>
                {baileysError && (
                  <div className={cn(
                    "mt-4 rounded-xl border px-4 py-3 text-xs",
                    baileysStatus?.state === "logged_out"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  )}>
                    {baileysError}
                  </div>
                )}
              </div>
            )}

            {modalStep === 'oauth_connecting' && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin absolute" />
                  <div className="p-4 bg-slate-800 rounded-full">
                    {getPlatformIcon(activeTab)}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Verificando credenciales oficiales</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Preparando permisos del proveedor para {getPlatformLabel(activeTab)}. Estos canales requieren credenciales aprobadas antes de recibir datos reales.</p>
                </div>
                <div className="bg-slate-950 px-4 py-2 rounded-lg border border-white/5 font-mono text-[10px] text-zinc-500 max-w-xs overflow-hidden text-ellipsis">
                  CONNECTING_METADATA_STREAM_ENDPOINT...
                </div>
              </div>
            )}

            {modalStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Canal Sincronizado!</h3>
                <p className="text-slate-400 text-sm">El canal {getPlatformLabel(activeTab)} quedo vinculado con su Agente AI y su metodo correcto de entrada.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlink Confirmation Modal */}
      {accountToUnlink && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              ¿Estás seguro?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Estás a punto de desvincular el canal <strong className="text-white">{accountToUnlink.name}</strong> ({accountToUnlink.phone}). 
              El Agente AI asignado ya no procesará ni responderá las interacciones entrantes de esta cuenta. 
              <br /><br />
              ¿Estás seguro de continuar con la desconexión?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setAccountToUnlink(null)}
                className="px-4 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={removeAccount}
                className="bg-rose-650 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                Sí, Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automations Config Modal */}
      {accountToAutomate && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-3xl relative glass-panel shadow-2xl flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setAccountToAutomate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              {getPlatformIcon(accountToAutomate.type)}
              Mensajería Automática para {getPlatformLabel(accountToAutomate.type)}
            </h3>
            <p className="text-slate-450 text-xs mb-6">
              Ajusta los detonadores de conversación e indica respuestas rápidas personalizadas para la conexión: <span className="font-semibold text-cyan-400">{accountToAutomate.name}</span>.
            </p>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8 style-3">
              {accountToAutomate.type === 'whatsapp_personal' && (
                <div className="space-y-4">
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Plantillas reales de reclutamiento WhatsApp
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {WHATSAPP_RECRUITMENT_TEMPLATES.map((template) => (
                      <div key={template.id} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-white">{template.title}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-widest text-emerald-300">{template.stage}</p>
                          </div>
                          <button
                            onClick={() => addRecruitmentTemplateRule(template.id)}
                            className="rounded-lg border border-emerald-400/30 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/10"
                          >
                            Regla
                          </button>
                        </div>
                        <p className="mt-2 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-slate-400">{template.body}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => applyRecruitmentTemplateToWelcome(template.body)}
                            className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            Usar saludo
                          </button>
                          <button
                            onClick={() => applyRecruitmentTemplateToFollowUp(template.body)}
                            className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            Usar seguimiento
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Automations Section */}
              <div className="space-y-6">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Mensajería de Respuesta Rápida de Entrada
                </h4>
                <div>
                  <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
                    Saludo de Conversación / Formulario
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">Este mensaje se envía de inmediato cuando un candidato interactúa o se suscribe.</p>
                  <textarea 
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none h-20 font-mono"
                    placeholder="Escribe el mensaje de bienvenida..."
                  />
                </div>

                <div>
                  <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Recordatorio de Reactivación de Candidato
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">Mensaje automático para reactivar conversaciones frías en las que el aplicante dejó de contestar.</p>
                  <textarea 
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none h-20 font-mono"
                    placeholder="Escribe el mensaje de seguimiento..."
                  />
                </div>
              </div>

              {/* Advanced Rules Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-500" />
                    Reglas Específicas de Desvío / Filtro
                  </h4>
                  <button 
                    onClick={addRule}
                    className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Añadir Regla
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-450">Intervenga el flujo por defecto aislando respuestas con base en triggers de palabras o acciones específicas.</p>

                <div className="space-y-4">
                  {automationRules.map((rule, idx) => (
                    <div key={rule.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
                      
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Regla de Filtrado #{idx + 1}</span>
                         <button onClick={() => removeRule(rule.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-1">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Trigger Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3 text-cyan-400" /> Trigger (Evento)</label>
                          <select 
                            value={rule.trigger}
                            onChange={(e) => updateRule(rule.id, 'trigger', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="keyword">Mensaje Entrante</option>
                            <option value="form">Envío de Formulario</option>
                            <option value="webhook">Evento de Webhook</option>
                          </select>
                        </div>
                        
                        {/* Condition Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Search className="w-3 h-3 text-cyan-400" /> Regla de Condición</label>
                          <select 
                            value={rule.condition}
                            onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="contains">Contiene palabra clave</option>
                            <option value="exact">Coincidencia exacta</option>
                            <option value="any">Cualquier mensaje</option>
                          </select>
                        </div>

                        {/* Action Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-cyan-400" /> Acción del Bot</label>
                          <select 
                            value={rule.action}
                            onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="send_message">Iniciar Conversación / Respuesta</option>
                            <option value="assign_agent">Asignar a un Agente</option>
                            <option value="send_email">Enviar Correo Electrónico</option>
                          </select>
                        </div>
                      </div>

                      {/* Dynamic Inputs based on Trigger/Action */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        {rule.trigger === 'keyword' && rule.condition !== 'any' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-450">Palabras clave (separadas por coma)</label>
                            <input 
                              type="text" 
                              value={rule.keywords}
                              onChange={(e) => updateRule(rule.id, 'keywords', e.target.value)}
                              placeholder="Ej: información, aplicar, ayuda"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-450">
                            {rule.action === 'send_message' ? 'Mensaje de respuesta automática' : 
                             rule.action === 'assign_agent' ? 'ID del Agente de Reclutamiento' : 'Destinatario o Plantilla'}
                          </label>
                          <input 
                            type="text" 
                            value={rule.actionData}
                            onChange={(e) => updateRule(rule.id, 'actionData', e.target.value)}
                            placeholder={
                              rule.action === 'send_message' ? "Introduce la respuesta automática..." : 
                              rule.action === 'assign_agent' ? "Ej: ag-1" : "Ej: rh@empresa.com"
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                          />
                        </div>
                      </div>

                    </div>
                  ))}

                  {automationRules.length === 0 && (
                    <div className="text-center p-8 bg-slate-800/10 border border-slate-700 rounded-xl border-dashed">
                      <p className="text-slate-500 text-xs">No hay reglas específicas configuradas para este canal.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50 shrink-0">
              <button 
                onClick={() => setAccountToAutomate(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveAutomationConfig}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global styles for animation */}
      <style>{`
        @keyframes scan {
          0% { top: 1rem; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% - 1rem); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
