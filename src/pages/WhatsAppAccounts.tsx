import { useEffect, useRef, useState } from "react";
import { Plus, Search, Smartphone, Shield, Zap, QrCode, Trash2, CheckCircle2, RotateCcw, X, SmartphoneNfc, MessageSquare, Clock, Facebook, Instagram, Video, Loader2, Settings2, Sparkles, AlertCircle, DollarSign, TrendingUp, Target, BarChart3, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_AUTH_EXPIRED_MESSAGE, API_TOKEN_STORAGE_KEY, apiFetch, apiUrl, isApiAuthExpiredErrorMessage, readApiJson } from "@/lib/api";
import { EMPTY_AGENTS } from "@/data/appDefaults";
import { WHATSAPP_RECRUITMENT_TEMPLATES } from "@/data/recruitmentKnowledge";
import { DEFAULT_COMPANY_NAME } from "@/lib/recruiterAgentPrompt";
import { BaileysQRModal } from "@/components/whatsapp/BaileysQRModal";
import { FacebookAdsPanel } from "@/components/whatsapp/FacebookAdsPanel";
import { AutomationRulesPanel } from "@/components/whatsapp/AutomationRulesPanel";
import { MetaCoveragePanel } from "@/components/whatsapp/MetaCoveragePanel";
import { ChannelAccountsList } from "@/components/whatsapp/ChannelAccountsList";

type ChannelType =
  | 'whatsapp_meta'
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
  qrCreatedAt?: number;
  qrExpiresAt?: number;
  qrSecondsLeft?: number | null;
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
  whatsapp_meta: {
    defaultAgentId: "ag-whatsapp-recruiter-elite",
    label: "WhatsApp Meta Cloud",
    matches: ["whatsapp", "crm", "calendar", "meta"],
    helper: "Este modulo usa la API oficial de Meta y no comparte sesiones ni QR con Baileys.",
  },
  whatsapp_personal: {
    defaultAgentId: "ag-whatsapp-recruiter-elite",
    label: "WhatsApp Baileys QR",
    matches: ["whatsapp", "crm", "calendar"],
    helper: "Este modulo usa QR Baileys y no comparte tokens ni webhooks con Meta Cloud API.",
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
  whatsapp_meta: "/assets/integrations/whatsapp.svg",
  whatsapp_personal: "/assets/integrations/whatsapp.svg",
  facebook: "/assets/integrations/facebook.svg",
  messenger: "/assets/integrations/messenger.svg",
  instagram: "/assets/integrations/instagram.svg",
  tiktok: "/assets/integrations/tiktok.svg",
};

const META_INTEGRATION_MODULES: Array<{
  id: ChannelType | "meta_webhook";
  label: string;
  requirement: string;
}> = [
  { id: "whatsapp_meta", label: "WhatsApp Cloud API", requirement: "WHATSAPP_PHONE_NUMBER_ID" },
  { id: "facebook", label: "Facebook Leads / Ads", requirement: "META_PAGE_ID / META_AD_ACCOUNT_ID" },
  { id: "messenger", label: "Messenger", requirement: "META_PAGE_ACCESS_TOKEN" },
  { id: "instagram", label: "Instagram DM", requirement: "INSTAGRAM_APP_ID" },
  { id: "meta_webhook", label: "Webhook Meta", requirement: "/api/integrations/meta/webhook" },
];

const normalizeAgentText = (agent: any) =>
  [agent?.id, agent?.name, agent?.role, agent?.description, ...(Array.isArray(agent?.channels) ? agent.channels : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function WhatsAppAccounts() {
  const [activeTab, setActiveTab] = useState<ChannelType>('whatsapp_meta');

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
  const [baileysAuthExpired, setBaileysAuthExpired] = useState(false);
  const [isStartingBaileys, setIsStartingBaileys] = useState(false);
  const baileysCompletedRef = useRef(false);
  const baileysLoggedOutResetRef = useRef(false);
  const restoredBaileysSessionsRef = useRef<Set<string>>(new Set());

  const [automationRules, setAutomationRules] = useState<any[]>([]);

  const getCompatibleAgents = (type: ChannelType) => {
    const rule = CHANNEL_AGENT_RULES[type];
    const activeAgents = availableAgents.filter((agent) => agent.status !== "Draft");
    const compatible = activeAgents.filter((agent) => {
      const text = normalizeAgentText(agent);
      return rule.matches.some((match) => text.includes(match));
    });
    if (compatible.some((agent) => agent.id === "agent-principal-1")) return compatible;
    const principal = activeAgents.find((agent) => agent.id === "agent-principal-1");
    return principal && ["whatsapp_meta", "whatsapp_personal", "messenger"].includes(type)
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
    if (changed) setAccounts(normalizedAccounts);
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

  const isBaileysAuthExpiredError = (error: any) => {
    const message = String(error?.message || "");
    return message === API_AUTH_EXPIRED_MESSAGE || isApiAuthExpiredErrorMessage(message);
  };

  const getBaileysFriendlyError = (error: any, fallback: string) => {
    const message = String(error?.message || "");
    if (message === "API endpoint no encontrado") {
      return "Baileys necesita el backend Express activo en un servidor persistente. En DigitalOcean podra generar QR si la API esta desplegada junto con la app.";
    }
    if (isBaileysAuthExpiredError(error)) {
      return "Tu sesion del panel expiro. Inicia sesion de nuevo y vuelve a generar el QR de Baileys.";
    }
    return message || fallback;
  };

  const goToLogin = () => {
    localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    window.location.assign("/login");
  };

  const baileysWhatsAppAccounts = accounts.filter(account => account.type === "whatsapp_personal");
  const metaWhatsAppAccounts = accounts.filter(account => account.type === "whatsapp_meta");

  const getNextWhatsAppSessionId = () => {
    const nextNumber = baileysWhatsAppAccounts.length + 1;
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
    return baileysWhatsAppAccounts.some(account => getAccountIsolationKey(account).toLowerCase() === normalized);
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

  const getWebhookUrl = (type: string) => {
    switch(type) {
      case 'whatsapp_meta': return apiUrl('/api/integrations/meta/webhook');
      case 'indeed': return apiUrl('/api/integrations/webhooks/job-board/indeed');
      case 'computrabajo': return apiUrl('/api/integrations/webhooks/job-board/computrabajo');
      default: return undefined;
    }
  };

  const connectedAccountTypes = new Set(accounts.filter((account) => account.status === "connected").map((account) => account.type));
  const metaIntegrationStatus = META_INTEGRATION_MODULES.map((module) => {
    const connected =
      module.id === "meta_webhook"
        ? Boolean(getWebhookUrl("whatsapp_meta"))
        : connectedAccountTypes.has(module.id);
    return { ...module, connected };
  });
  const metaConnectedCount = metaIntegrationStatus.filter((module) => module.connected).length;
  const metaCoveragePct = Math.round((metaConnectedCount / META_INTEGRATION_MODULES.length) * 100);

  const providerForActiveTab = () => {
    if (activeTab === 'whatsapp_meta') return 'whatsapp_meta';
    if (activeTab === 'whatsapp_personal') return 'whatsapp_personal';
    if (activeTab === 'facebook') return 'facebook';
    if (activeTab === 'messenger') return 'messenger';
    if (activeTab === 'instagram') return 'instagram';
    if (activeTab === 'tiktok') return 'tiktok';
    return null;
  };

  const requiresRealProviderValidation = (type: ChannelType) =>
    ["whatsapp_meta", "facebook", "messenger", "instagram", "tiktok"].includes(type);

  const ensureRealProviderConnection = async (type: ChannelType) => {
    const response = await apiFetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: type }),
    });
    const payload = await readApiJson(response);
    const result = payload.data || payload;
    if (!result?.ok) {
      const missing = Array.isArray(result?.missing) && result.missing.length > 0
        ? ` Faltan: ${result.missing.join(", ")}.`
        : "";
      throw new Error(`${result?.message || "La conexion real no esta configurada."}${missing}`);
    }
    return result;
  };

  const testCurrentIntegration = async () => {
    if (activeTab === 'indeed' || activeTab === 'computrabajo') {
      setConnectionTest({
        ok: true,
        message: `${getPlatformLabel(activeTab)} no requiere API directa aqui. Queda listo para recibir candidatos por CSV, correo parser, feed autorizado o webhook intermedio.`,
      });
      return;
    }
    const provider = providerForActiveTab();
    if (!provider) {
      setConnectionTest({
        ok: false,
        message: `${getPlatformLabel(activeTab)} requiere credenciales oficiales del proveedor y permisos aprobados antes de activar la conexion real.`,
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
      setConnectionTest({ ok: false, message: error.message || "No se pudo probar la integracion." });
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
      if (!response.ok || !payload.success) throw new Error(payload.error || "No se pudo analizar Meta Ads.");
      setFacebookAdsAnalysis(payload.data);
    } catch (error: any) {
      setFacebookAdsAnalysis(null);
      setConnectionTest({ ok: false, message: error.message || "Revisa credenciales de Meta Ads." });
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
      setBaileysAuthExpired(false);
      setBaileysStatus(null);
      setIsStartingBaileys(true);
      setModalStep('qr');
      try {
        if (!localStorage.getItem(API_TOKEN_STORAGE_KEY)) {
          setBaileysAuthExpired(true);
          throw new Error("Tu sesion del panel expiro. Inicia sesion de nuevo y vuelve a generar el QR de Baileys.");
        }
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
        if (!response.ok || !payload.success) throw new Error(payload.error || "No se pudo iniciar Baileys.");
        setBaileysStatus(payload.data);
        if (payload.data?.state === "connected") {
          baileysCompletedRef.current = true;
          setModalStep('success');
          handleCreateAccount();
        }
      } catch (error: any) {
        setBaileysAuthExpired(isBaileysAuthExpiredError(error));
        setBaileysError(getBaileysFriendlyError(error, "No se pudo generar el QR de Baileys."));
      } finally {
        setIsStartingBaileys(false);
      }
    } else if (requiresRealProviderValidation(activeTab)) {
      setBaileysError("");
      setConnectionTest(null);
      setIsStartingBaileys(true);
      setModalStep('oauth_connecting');
      try {
        const result = await ensureRealProviderConnection(activeTab);
        setConnectionTest(result);
        setModalStep('success');
        handleCreateAccount(result);
      } catch (error: any) {
        setModalStep('info');
        setConnectionTest({ ok: false, message: error.message || "No se pudo validar la conexion real del proveedor." });
      } finally {
        setIsStartingBaileys(false);
      }
    } else if (activeTab === 'indeed' || activeTab === 'computrabajo') {
      setModalStep('success');
      handleCreateAccount();
    }
  };

  const handleCreateAccount = (validatedConnection?: any) => {
    let phoneIdText = "";
    if (activeTab === 'whatsapp_meta') phoneIdText = "WhatsApp Cloud API: WHATSAPP_PHONE_NUMBER_ID validado";
    else if (activeTab === 'whatsapp_personal') phoneIdText = baileysStatus?.phone || `Sesion Baileys: ${baileysSessionId.trim() || "default"}`;
    else if (activeTab === 'indeed') phoneIdText = `Entrada: CSV/correo/webhook Indeed`;
    else if (activeTab === 'computrabajo') phoneIdText = "Entrada: CSV/correo/webhook Computrabajo";
    else if (activeTab === 'facebook') phoneIdText = "Meta Page ID validado";
    else if (activeTab === 'messenger') phoneIdText = "Meta Messenger Page ID validado";
    else if (activeTab === 'instagram') phoneIdText = "Instagram Messaging API validado";
    else phoneIdText = "TikTok Lead Generation validado";

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
      isolationKey:
        activeTab === 'whatsapp_personal'
          ? baileysSessionId.trim() || "default"
          : activeTab === 'whatsapp_meta'
            ? "meta-whatsapp-cloud"
            : requiresRealProviderValidation(activeTab)
              ? `${activeTab}-${validatedConnection?.mode || "validated"}`
              : undefined,
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
    setBaileysAuthExpired(false);
  };

  useEffect(() => {
    if (!isModalOpen || modalStep !== 'qr' || activeTab !== 'whatsapp_personal' || baileysAuthExpired) return;
    const sessionId = baileysSessionId.trim() || "default";
    let isMounted = true;
    const refreshBaileysStatus = async () => {
      try {
        const response = await apiFetch(`/api/integrations/baileys/status/${encodeURIComponent(sessionId)}`);
        const payload = await readApiJson(response);
        if (!response.ok || !payload.success) throw new Error(payload.error || "No se pudo leer el estado de Baileys.");
        if (!isMounted) return;
        setBaileysStatus(payload.data);
        if (!payload.data?.lastError) setBaileysError("");
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
          if (!isMounted) return;
          if (restartPayload?.data) setBaileysStatus(restartPayload.data);
        }
        if (payload.data?.state === "connected" && !baileysCompletedRef.current) {
          baileysCompletedRef.current = true;
          setModalStep('success');
          handleCreateAccount();
        }
      } catch (error: any) {
        setBaileysAuthExpired(isBaileysAuthExpiredError(error));
        setBaileysError(getBaileysFriendlyError(error, "No se pudo actualizar el estado de Baileys. Usa Regenerar QR para iniciar una nueva sesion."));
      }
    };
    refreshBaileysStatus();
    const interval = window.setInterval(refreshBaileysStatus, 2500);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [activeTab, baileysAuthExpired, baileysSessionId, isModalOpen, modalStep, baileysStatus?.phone]);

  const confirmRemoveAccount = (account: any) => setAccountToUnlink(account);

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
      case 'whatsapp_meta': return `Hola, soy ${account.agentPersonalName || agentName} de ${companyName}. Con gusto te ayudo por WhatsApp Business. Cuéntame qué vacante o información necesitas y te oriento.`;
      case 'whatsapp_personal': return `Hola, buen dia, soy ${account.agentPersonalName || agentName} de ${companyName}. Con gusto te atiendo por WhatsApp. Cuéntame qué información necesitas y seguimos la conversación paso a paso.`;
      case 'facebook': return `Hola, soy ${agentName} de ${companyName}. Gracias por tu interés en nuestras vacantes. ¿Qué puesto te interesa y en qué ciudad estás para darte la información correcta?`;
      case 'messenger': return `Hola, soy ${agentName}. Con gusto te ayudo por Messenger. Para orientarte mejor dime tu nombre, ciudad y la vacante que te interesa.`;
      case 'instagram': return `¡Hola! Soy ${agentName} de ${companyName}. Si buscas empleo, dime la palabra VACANTE y tu ciudad para enviarte opciones disponibles.`;
      case 'tiktok': return `Hola, soy ${agentName}. Recibimos tu registro desde TikTok. ¿Confirmas que sigues interesado y que podemos contactarte para una entrevista?`;
      default: return `¡Hola! Gracias por comunicarte con nuestro equipo a través de ${getPlatformLabel(account.type)}. ¿En qué posición o vacante estás interesado para enviarte toda la información pertinente?`;
    }
  };

  const getDefaultFollowUpMessage = (type: ChannelType) => {
    switch (type) {
      case 'whatsapp_meta': return "Hola de nuevo, sigo por aquí para ayudarte con requisitos, horarios o agendar tu entrevista por WhatsApp Business.";
      case 'whatsapp_personal': return "Hola de nuevo, sigo disponible para ayudarte con la información, requisitos o siguiente paso de tu conversación.";
      case 'facebook': return "Hola de nuevo, ¿sigues interesado en la vacante? Puedo enviarte requisitos, horarios y el siguiente paso para aplicar.";
      case 'messenger': return "Solo paso a confirmar si deseas continuar con tu postulación. Si me compartes tu disponibilidad, puedo ayudarte a agendar.";
      case 'instagram': return "¿Te comparto los requisitos y beneficios de la vacante? Responde EMPLEO y te ayudo con el registro.";
      case 'tiktok': return "Vimos tu registro de TikTok. Para avanzar necesitamos confirmar tu teléfono, ciudad y disponibilidad.";
      default: return "Hola de nuevo, detectamos que no hemos recibido respuesta. ¿Pudiste revisar el formulario? Si tienes dudas házmelo saber.";
    }
  };

  const getDefaultAutomationRules = (type: ChannelType, agentId: string) => {
    if (type === 'whatsapp_meta') return [
      { id: 'rule-wa-meta-inbound', trigger: 'message', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
      { id: 'rule-wa-meta-human', trigger: 'keyword', keywords: 'asesor, humano, llamada, entrevista', condition: 'contains', action: 'assign_agent', actionData: agentId }
    ];
    if (type === 'whatsapp_personal') return [
      { id: 'rule-wa-baileys-inbound', trigger: 'message', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
      { id: 'rule-wa-baileys-human', trigger: 'keyword', keywords: 'asesor, humano, llamada, entrevista', condition: 'contains', action: 'assign_agent', actionData: agentId }
    ];
    if (type === 'facebook') return [
      { id: 'rule-facebook-info', trigger: 'keyword', keywords: 'info, información, empleo, vacante, requisitos', condition: 'contains', action: 'assign_agent', actionData: agentId },
      { id: 'rule-facebook-comment', trigger: 'keyword', keywords: 'me interesa, quiero aplicar, informes', condition: 'contains', action: 'send_message', actionData: '¡Gracias por tu interés! Te escribo por mensaje para compartirte requisitos, horarios y próximos pasos.' }
    ];
    if (type === 'messenger') return [
      { id: 'rule-messenger-any', trigger: 'keyword', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
      { id: 'rule-messenger-agenda', trigger: 'keyword', keywords: 'entrevista, cita, agendar, horario', condition: 'contains', action: 'send_message', actionData: 'Claro, te ayudo a revisar disponibilidad para entrevista. ¿Qué día y horario te funciona mejor?' }
    ];
    if (type === 'instagram') return [
      { id: 'rule-instagram-empleo', trigger: 'keyword', keywords: 'empleo, vacante, trabajo, aplicar', condition: 'contains', action: 'assign_agent', actionData: agentId },
      { id: 'rule-instagram-cv', trigger: 'keyword', keywords: 'cv, curriculum, portafolio', condition: 'contains', action: 'send_message', actionData: 'Puedes compartir tu CV o portafolio por el canal autorizado y te guiamos con el siguiente paso.' }
    ];
    if (type === 'tiktok') return [
      { id: 'rule-tiktok-form', trigger: 'form', keywords: '', condition: 'any', action: 'assign_agent', actionData: agentId },
      { id: 'rule-tiktok-confirm', trigger: 'keyword', keywords: 'si, sí, interesado, aplicar', condition: 'contains', action: 'send_message', actionData: 'Perfecto. Confirmemos ciudad, teléfono y disponibilidad para avanzar con reclutamiento.' }
    ];
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

  const saveAutomationConfig = () => setAccountToAutomate(null);

  const applyRecruitmentTemplateToWelcome = (body: string) => setWelcomeMessage(body);
  const applyRecruitmentTemplateToFollowUp = (body: string) => setFollowUpMessage(body);

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
      case 'whatsapp_meta': return 'WhatsApp Meta API';
      case 'whatsapp_personal': return 'WhatsApp Baileys QR';
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
      case 'whatsapp_meta': return 'text-emerald-300 border-emerald-400/35';
      case 'whatsapp_personal': return 'text-cyan-300 border-cyan-400/35';
      case 'indeed': return 'text-blue-300 border-blue-400/35';
      case 'computrabajo': return 'text-teal-300 border-teal-400/35';
      case 'facebook': return 'text-blue-400 border-blue-500/35';
      case 'messenger': return 'text-sky-300 border-sky-400/35';
      case 'instagram': return 'text-pink-300 border-pink-400/35';
      case 'tiktok': return 'text-fuchsia-300 border-fuchsia-400/35';
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
          className="h-5 w-5 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]"
          loading="lazy"
        />
      );
    }
    switch(type) {
      case 'whatsapp_meta': return <Smartphone className="w-5 h-5 text-emerald-300" />;
      case 'whatsapp_personal': return <Smartphone className="w-5 h-5 text-cyan-300" />;
      case 'indeed': return <MessageSquare className="w-5 h-5 text-blue-300" />;
      case 'computrabajo': return <SmartphoneNfc className="w-5 h-5 text-teal-300" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-400" />;
      case 'messenger': return <MessageSquare className="w-5 h-5 text-sky-300" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-300" />;
      case 'tiktok': return <Video className="w-5 h-5 text-fuchsia-300" />;
      default: return <Smartphone className="w-5 h-5" />;
    }
  };

  const getPlatformMode = (type: string) => {
    switch(type) {
      case 'whatsapp_meta': return 'Meta WhatsApp Cloud API';
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

  const getCaptureDescription = (type: string) => {
    switch(type) {
      case 'whatsapp_meta': return "Modulo oficial de Meta Cloud API: recibe mensajes por webhook de WhatsApp Business y responde con IA usando token y Phone Number ID. No usa QR ni sesiones Baileys.";
      case 'whatsapp_personal': return "Modulo Baileys QR: genera QR real, vincula WhatsApp Web, recibe mensajes y permite al agente responder desde el dispositivo enlazado. No usa tokens de Meta.";
      case 'indeed': return "Entrada sin API directa obligatoria: importa postulantes desde CSV, correo parser, feed autorizado, Indeed Apply empresarial o webhook intermedio.";
      case 'computrabajo': return "Entrada sin API directa obligatoria: captura candidatos por CSV, correo parser, exportacion del portal, feed empresarial o webhook intermedio.";
      case 'facebook': return "Captura leads y comentarios desde Facebook; Aurora responde dudas, precalifica y envía candidatos al CRM.";
      case 'messenger': return "Inbox conversacional de Messenger: Mía responde preguntas, solicita datos mínimos y agenda entrevistas.";
      case 'instagram': return "Respuestas instantáneas en DMs para candidatos que envíen 'EMPLEO', 'VACANTE' o 'APLICAR'.";
      case 'tiktok': return "Lectura automática de formularios de TikTok Lead Gen y confirmación con agente de IA.";
      default: return "Canal externo de reclutamiento conectado al CRM.";
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.55)]" />
            Canales de Mensajería y Redes Sociales
          </h1>
          <p className="text-slate-400 text-sm">Gestiona tus conexiones de reclutamiento desde un único lugar asignando Agentes de IA conversacionales.</p>
        </div>
        <button
          onClick={() => {
            setModalStep('info');
            setSelectedAgent(getDefaultAgentId(activeTab));
            setNewAccountName(
              activeTab === 'whatsapp_meta' ? 'WhatsApp Meta Business Oficial' :
              activeTab === 'whatsapp_personal' ? 'WhatsApp Baileys Reclutamiento' : ''
            );
            setBaileysSessionId(activeTab === 'whatsapp_personal' ? getNextWhatsAppSessionId() : "default");
            setBaileysStatus(null);
            setBaileysError("");
            setBaileysAuthExpired(false);
            baileysCompletedRef.current = false;
            setIsModalOpen(true);
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all uppercase tracking-wide border shadow-[0_0_18px_rgba(34,211,238,0.16)]",
            activeTab === 'whatsapp_meta' ? "bg-emerald-500/15 border-emerald-400/50 hover:bg-emerald-500/25 text-emerald-100" :
            activeTab === 'whatsapp_personal' ? "bg-cyan-500/15 border-cyan-400/50 hover:bg-cyan-500/25 text-cyan-100" :
            activeTab === 'indeed' ? "bg-blue-500/15 border-blue-400/50 hover:bg-blue-500/25 text-blue-100" :
            activeTab === 'computrabajo' ? "bg-teal-500/15 border-teal-400/50 hover:bg-teal-500/25 text-teal-100" :
            activeTab === 'facebook' ? "bg-blue-600/15 border-blue-400/50 hover:bg-blue-600/25 text-blue-100" :
            activeTab === 'messenger' ? "bg-sky-500/15 border-sky-400/50 hover:bg-sky-500/25 text-sky-100" :
            activeTab === 'instagram' ? "bg-pink-500/15 border-pink-400/50 hover:bg-pink-500/25 text-pink-100" :
            "bg-fuchsia-500/15 border-fuchsia-400/50 hover:bg-fuchsia-500/25 text-fuchsia-100"
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
          { id: 'computrabajo', name: 'Computrabajo', icon: SmartphoneNfc, color: 'text-teal-300' },
          { id: 'whatsapp_meta', name: 'WhatsApp Meta API', icon: Smartphone, color: 'text-emerald-300' },
          { id: 'whatsapp_personal', name: 'WhatsApp Baileys QR', icon: QrCode, color: 'text-cyan-300' },
          { id: 'facebook', name: 'Facebook Leads', icon: Facebook, color: 'text-blue-400' },
          { id: 'messenger', name: 'Messenger', icon: MessageSquare, color: 'text-sky-300' },
          { id: 'instagram', name: 'Instagram DM', icon: Instagram, color: 'text-pink-300' },
          { id: 'tiktok', name: 'TikTok Leads', icon: Video, color: 'text-fuchsia-300' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
              activeTab === tab.id
                ? "bg-cyan-500/15 text-white shadow-[0_0_18px_rgba(34,211,238,0.16)] border border-cyan-300/35"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {CHANNEL_ICON_IMAGES[tab.id as ChannelType] ? (
              <img src={CHANNEL_ICON_IMAGES[tab.id as ChannelType]} alt={`${tab.name} icono`} className="h-4 w-4 object-contain" loading="lazy" />
            ) : (
              <tab.icon className={cn("w-4 h-4", tab.color)} />
            )}
            {tab.name}
          </button>
        ))}
      </div>

      <MetaCoveragePanel
        metaIntegrationStatus={metaIntegrationStatus}
        metaConnectedCount={metaConnectedCount}
        metaCoveragePct={metaCoveragePct}
        totalModules={META_INTEGRATION_MODULES.length}
      />

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
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-500/15 bg-zinc-500/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
              <Zap className="h-3 w-3" />
              Agentes activos: {getChannelAgentGroupLabel(activeTab)}
            </div>
            {getWebhookUrl(activeTab) && (
              <div className="mt-2 text-[10px] text-zinc-300 font-mono bg-slate-950 border border-zinc-500/10 rounded-lg px-2 py-1 inline-block">
                Webhook: {getWebhookUrl(activeTab)}
              </div>
            )}
            {(activeTab === 'indeed' || activeTab === 'computrabajo') && (
              <div className="mt-2 flex flex-wrap gap-2">
                {["CSV", "Correo parser", "Feed autorizado", "Webhook"].map((method) => (
                  <span key={method} className="rounded-lg border border-zinc-400/20 bg-zinc-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-200">
                    {method}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {connectionTest && (
            <span className="text-[11px] px-3 py-2 rounded-lg border text-zinc-300 border-zinc-500/30 bg-zinc-500/10">
              {connectionTest.ok ? "Lista" : "Pendiente"}: {connectionTest.message}
            </span>
          )}
          <button
            onClick={testCurrentIntegration}
            disabled={!!testingProvider}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-zinc-500/10 border border-zinc-500/30 text-zinc-300 hover:bg-zinc-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {testingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {activeTab === 'indeed' || activeTab === 'computrabajo' ? "Ver forma correcta" : "Probar conexión"}
          </button>
        </div>
      </div>

      {activeTab === 'whatsapp_meta' && (
        <div className="glass-panel rounded-2xl border border-zinc-500/20 bg-zinc-500/5 p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-[0.18em]">
                <Shield className="w-4 h-4" />
                Modulo oficial separado
              </div>
              <h3 className="mt-2 text-xl font-bold text-white">WhatsApp Meta Cloud API no usa QR</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Este modulo trabaja solo con el webhook oficial de Meta, el token Cloud API y el Phone Number ID. Sus mensajes entran por Meta y no comparten sesiones, QR ni reglas con Baileys.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-full xl:min-w-[360px]">
              <div className="rounded-xl border border-zinc-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cuentas Meta</p>
                <p className="mt-1 text-2xl font-bold text-white">{metaWhatsAppAccounts.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Entrada</p>
                <p className="mt-1 text-sm font-bold text-zinc-200">Webhook Meta</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-500/15 bg-slate-950/45 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">URL oficial del webhook</p>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-300">{getWebhookUrl('whatsapp_meta')}</p>
            </div>
            <div className="rounded-xl border border-zinc-500/15 bg-slate-950/45 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Variables separadas</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Usa <span className="font-mono text-zinc-200">WHATSAPP_CLOUD_ACCESS_TOKEN</span> y <span className="font-mono text-zinc-200">WHATSAPP_PHONE_NUMBER_ID</span>. Baileys no lee estas credenciales.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'whatsapp_personal' && (
        <div className="glass-panel rounded-2xl border border-zinc-500/20 bg-zinc-500/5 p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-[0.18em]">
                <Shield className="w-4 h-4" />
                Modulo Baileys separado
              </div>
              <h3 className="mt-2 text-xl font-bold text-white">Cada WhatsApp por QR trabaja con su propio agente</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Cuando enlaces otro numero por Baileys, usa una sesion diferente. La app separa cuenta, agente y reglas para que las respuestas no se mezclen con Meta Cloud API ni con otras lineas QR.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-full xl:min-w-[420px]">
              <div className="rounded-xl border border-zinc-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cuentas</p>
                <p className="mt-1 text-2xl font-bold text-white">{baileysWhatsAppAccounts.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agentes</p>
                <p className="mt-1 text-2xl font-bold text-white">{new Set(baileysWhatsAppAccounts.map(account => account.agentId)).size}</p>
              </div>
              <div className="rounded-xl border border-zinc-500/20 bg-slate-950/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sesiones</p>
                <p className="mt-1 text-2xl font-bold text-white">{new Set(baileysWhatsAppAccounts.map(getAccountIsolationKey)).size}</p>
              </div>
            </div>
          </div>
          {baileysWhatsAppAccounts.length > 0 && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {baileysWhatsAppAccounts.map(account => {
                const agent = getAssignedAgent(account.agentId);
                return (
                  <div key={`isolation-${account.id}`} className="rounded-xl border border-white/5 bg-slate-950/45 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{account.name}</p>
                        <p className="mt-1 text-[11px] font-mono text-zinc-300">Sesion aislada: {getAccountIsolationKey(account)}</p>
                      </div>
                      <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                        No mezcla
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg border border-zinc-500/10 bg-zinc-500/5 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Agente asignado a esta cuenta</p>
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
        <FacebookAdsPanel
          facebookDailyBudget={facebookDailyBudget}
          facebookTargetLeads={facebookTargetLeads}
          facebookTargetHires={facebookTargetHires}
          facebookAdsAnalysis={facebookAdsAnalysis}
          isAnalyzingFacebookAds={isAnalyzingFacebookAds}
          onSetDailyBudget={setFacebookDailyBudget}
          onSetTargetLeads={setFacebookTargetLeads}
          onSetTargetHires={setFacebookTargetHires}
          onAnalyze={analyzeFacebookRecruitmentAds}
        />
      )}

      <ChannelAccountsList
        filteredAccounts={filteredAccounts}
        activeTab={activeTab}
        getPlatformIcon={getPlatformIcon}
        getPlatformLabel={getPlatformLabel}
        getPlatformColor={getPlatformColor}
        getCaptureDescription={getCaptureDescription}
        getPlatformMode={getPlatformMode}
        getAssignedAgent={getAssignedAgent}
        getCompatibleAgents={getCompatibleAgents}
        getAccountIsolationKey={getAccountIsolationKey}
        onAssignAgent={assignAgent}
        onOpenAutomation={openAutomationConfig}
        onConfirmRemove={confirmRemoveAccount}
      />

      {/* Link Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-start justify-center overflow-y-auto px-4 py-6 md:py-10">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl relative flex max-h-[calc(100vh-3rem)] flex-col glass-panel shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>

            {modalStep === 'info' && (
              <>
                <div className="shrink-0 border-b border-white/5 px-5 py-5 pr-14 md:px-7">
                  <h2 className="flex items-center gap-2 bg-gradient-to-r from-zinc-400 to-zinc-500 bg-clip-text text-2xl font-bold text-transparent">
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
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                      placeholder={
                        activeTab === 'whatsapp_meta' ? "Ej: WhatsApp Business Meta Oficial" :
                        activeTab === 'whatsapp_personal' ? "Ej: WhatsApp Baileys reclutamiento QR" :
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
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                      placeholder="Ej: Heavenly Dreams, Cliente A, Restaurante Norte"
                    />
                    <p className="mt-2 text-xs text-slate-500">Este nombre entra al prompt para que el agente no mezcle empresas ni cuentas.</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre personal del agente</label>
                    <input
                      type="text"
                      value={newAgentPersonalName}
                      onChange={(e) => setNewAgentPersonalName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                      placeholder="Ej: Laura de RH, Edgar Reclutamiento, Asesor Heavenly"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">Este alias se usará como nombre visible y personalidad del agente al responder por esta cuenta.</p>
                  </div>
                  {activeTab === 'whatsapp_personal' && (
                    <div>
                      <label className="text-sm text-slate-300 mb-1.5 block">Sesión Baileys</label>
                      <input
                        type="text"
                        value={baileysSessionId}
                        onChange={(e) => setBaileysSessionId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                        placeholder="default"
                      />
                      <p className="text-xs text-slate-500 mt-2 font-light">Usa una sesión por número. El QR se guarda localmente para reutilizar la conexión.</p>
                      <div className="mt-3 rounded-xl border border-zinc-500/20 bg-zinc-500/5 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Separación de agentes</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">Si abres otra cuenta de WhatsApp, cambia este nombre de sesión. Así cada número queda aislado con su propio agente y no comparte conversaciones.</p>
                      </div>
                      {baileysError && (
                        <div className="mt-3 rounded-xl border border-zinc-500/30 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-200">{baileysError}</div>
                      )}
                    </div>
                  )}
                  {activeTab === 'whatsapp_meta' && (
                    <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Conexion oficial Meta Cloud API</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">Este modulo no genera QR. Para funcionar necesita que el servidor tenga token oficial y Phone Number ID, y que Meta envie los mensajes a este webhook.</p>
                      <p className="mt-2 break-all rounded-lg bg-slate-950/70 px-2 py-2 font-mono text-[10px] text-zinc-200">{getWebhookUrl('whatsapp_meta')}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] text-slate-300">
                        {["WHATSAPP_CLOUD_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"].map((key) => (
                          <span key={key} className="rounded-lg border border-zinc-500/15 bg-slate-950/60 px-2 py-1 font-mono text-zinc-200">{key}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(activeTab === 'indeed' || activeTab === 'computrabajo') && (
                    <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Conexion sin API directa</p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-400">Este canal se alimenta por exportacion CSV, correo parser, feed autorizado o webhook. La cuenta queda separada con su agente para clasificar candidatos y dar seguimiento sin mezclar portales.</p>
                      {getWebhookUrl(activeTab) && (
                        <p className="mt-2 break-all rounded-lg bg-slate-950/70 px-2 py-2 font-mono text-[10px] text-zinc-200">{getWebhookUrl(activeTab)}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-zinc-400 animate-pulse" />
                      Vincular con Agente AI ({getChannelAgentGroupLabel(activeTab)})
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all appearance-none"
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
                    <p className="text-xs text-slate-500 mt-2 font-light">{CHANNEL_AGENT_RULES[activeTab].helper} Los agentes de otros canales quedan ocultos para evitar respuestas cruzadas.</p>
                    {getCompatibleAgents(activeTab).length === 0 && (
                      <div className="mt-3 rounded-xl border border-zinc-500/30 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-200">
                        No hay agentes compatibles activos para este canal. Activa o crea un agente con canal {getChannelAgentGroupLabel(activeTab)}.
                      </div>
                    )}
                    {getAssignedAgent(selectedAgent) && (
                      <div className="mt-3 rounded-xl border border-zinc-500/10 bg-slate-950/50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Agente activo para este canal</p>
                        <p className="mt-1 text-xs font-semibold text-white">{getAssignedAgent(selectedAgent)?.name}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-400">{getAssignedAgent(selectedAgent)?.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex justify-end gap-3 border-t border-white/5 bg-slate-950/30 px-5 py-4 md:px-7">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">Cancelar</button>
                  <button
                    onClick={startLinking}
                    disabled={!newAccountName || !selectedAgent || isStartingBaileys}
                    className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 hover:from-cyan-200 hover:via-sky-300 hover:to-blue-400 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingBaileys ? 'Iniciando...' : activeTab === 'whatsapp_personal' ? 'Generar Código QR' : activeTab === 'whatsapp_meta' ? 'Registrar modulo Meta API' : activeTab === 'indeed' || activeTab === 'computrabajo' ? 'Crear entrada sin API' : 'Conectar con API oficial'}
                  </button>
                </div>
              </>
            )}

            {modalStep === 'qr' && (
              <BaileysQRModal
                baileysStatus={baileysStatus}
                baileysSessionId={baileysSessionId}
                baileysError={baileysError}
                baileysAuthExpired={baileysAuthExpired}
                isStartingBaileys={isStartingBaileys}
                onRegenerate={startLinking}
                onGoToLogin={goToLogin}
              />
            )}

            {modalStep === 'oauth_connecting' && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-zinc-500 animate-spin absolute" />
                  <div className="p-4 bg-slate-800 rounded-full">{getPlatformIcon(activeTab)}</div>
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
                <div className="w-20 h-20 bg-zinc-500/20 rounded-full flex items-center justify-center mb-6 border border-zinc-500/30">
                  <CheckCircle2 className="w-10 h-10 text-zinc-400" />
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
              <AlertCircle className="w-5 h-5 text-zinc-400" />
              ¿Estás seguro?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Estás a punto de desvincular el canal <strong className="text-white">{accountToUnlink.name}</strong> ({accountToUnlink.phone}).
              El Agente AI asignado ya no procesará ni responderá las interacciones entrantes de esta cuenta.
              <br /><br />
              ¿Estás seguro de continuar con la desconexión?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAccountToUnlink(null)} className="px-4 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={removeAccount} className="bg-zinc-600 hover:bg-zinc-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(163,163,163,0.2)]">Sí, Desconectar</button>
            </div>
          </div>
        </div>
      )}

      {/* Automations Config Modal */}
      {accountToAutomate && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-3xl relative glass-panel shadow-2xl flex flex-col max-h-[90vh]">
            <button onClick={() => setAccountToAutomate(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              {getPlatformIcon(accountToAutomate.type)}
              Mensajería Automática para {getPlatformLabel(accountToAutomate.type)}
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              Ajusta los detonadores de conversación e indica respuestas rápidas personalizadas para la conexión: <span className="font-semibold text-zinc-400">{accountToAutomate.name}</span>.
            </p>
            <AutomationRulesPanel
              accountToAutomate={accountToAutomate}
              automationRules={automationRules}
              welcomeMessage={welcomeMessage}
              followUpMessage={followUpMessage}
              onAddRule={addRule}
              onRemoveRule={removeRule}
              onUpdateRule={updateRule}
              onSetWelcomeMessage={setWelcomeMessage}
              onSetFollowUpMessage={setFollowUpMessage}
              onAddRecruitmentTemplateRule={addRecruitmentTemplateRule}
              onApplyRecruitmentTemplateToWelcome={applyRecruitmentTemplateToWelcome}
              onApplyRecruitmentTemplateToFollowUp={applyRecruitmentTemplateToFollowUp}
              getPlatformIcon={getPlatformIcon}
              getPlatformLabel={getPlatformLabel}
              onClose={() => setAccountToAutomate(null)}
              onSave={saveAutomationConfig}
            />
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50 shrink-0">
              <button onClick={() => setAccountToAutomate(null)} className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={saveAutomationConfig} className="bg-zinc-500 hover:bg-zinc-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(212,212,212,0.2)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

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
