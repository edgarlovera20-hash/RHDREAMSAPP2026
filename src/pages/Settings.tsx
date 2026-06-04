import { useEffect, useState } from "react";
import { Shield, Users, Mail, Bell, BellRing, Key, Plus, Trash2, Zap, Settings as SettingsIcon, MessageSquare, Video, Globe, Calendar, CheckCircle2, Lock, Smartphone, History, Edit3, Linkedin, X, Check, Facebook, Instagram, Send, Loader2, Copy, AlertCircle, Eye, EyeOff } from "lucide-react";
import { DigitalOceanBadge } from "@/components/DigitalOceanBadge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, apiUrl, readApiJson } from "@/lib/api";

const ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema, reportes y facturación.' },
  { id: 'hr_manager', name: 'HR Manager', description: 'Crear ofertas, gestionar candidatos y ver embudos.' },
  { id: 'interviewer', name: 'Entrevistador', description: 'Acceso solo lectura a candidatos asignados y puntuaciones.' },
];

const INITIAL_USERS: any[] = [];

const AUTOMATIONS = [
  { id: 1, name: 'Email Confirmación Postulación', trigger: 'Recibir nueva postulación', action: 'Enviar plantilla "Gracias por aplicar"', active: true },
  { id: 2, name: 'Recordatorio Reclutador', trigger: 'Candidato avanza a Entrevista', action: 'Enviar notificación slack al Hiring Manager', active: true },
  { id: 3, name: 'Aviso Cambio Estado', trigger: 'Candidato es Rechazado', action: 'Enviar plantilla "Feedback constructivo"', active: false },
];

const INTEGRATION_ICON_IMAGES: Record<string, string> = {
  indeed: "/assets/integrations/indeed.svg",
  computrabajo: "/assets/integrations/computrabajo.svg",
  whatsapp_personal: "/assets/integrations/whatsapp.svg",
  whatsapp_meta: "/assets/integrations/whatsapp.svg",
  facebook_ads: "/assets/integrations/facebook.svg",
  facebook: "/assets/integrations/facebook.svg",
  messenger: "/assets/integrations/messenger.svg",
  instagram: "/assets/integrations/instagram.svg",
  tiktok: "/assets/integrations/tiktok.svg",
};

const INTEGRATIONS = [
  { id: 'google_workspace', name: 'Google Workspace', category: 'Productividad', description: 'OAuth real para Gmail, Calendar, Sheets, Forms y Drive desde el modulo Google Workspace.', icon: Globe, provider: null, actionPath: '/workspace' },
  { id: 'indeed', name: 'Indeed CSV / Correo / Webhook', category: 'Bolsa de empleo', description: 'Importa candidatos por CSV, correo parser, feed autorizado, Indeed Apply empresarial o webhook intermedio.', icon: MessageSquare, provider: 'indeed' },
  { id: 'computrabajo', name: 'Computrabajo CSV / Correo / Webhook', category: 'Bolsa de empleo', description: 'Importa candidatos por exportacion CSV, correo parser, feed autorizado o webhook intermedio.', icon: Users, provider: 'computrabajo' },
  { id: 'whatsapp_meta', name: 'WhatsApp Meta Cloud API', category: 'Comunicación oficial', description: 'Conector oficial de Meta: webhooks, Phone Number ID, token Cloud API y agente IA sin QR.', icon: Smartphone, provider: 'whatsapp_meta', actionPath: '/whatsapp' },
  { id: 'whatsapp_personal', name: 'WhatsApp Baileys QR', category: 'Comunicación asistida', description: 'Conexion real por QR usando Baileys. No se mezcla con WhatsApp Meta Cloud API.', icon: Smartphone, provider: 'whatsapp_personal', actionPath: '/whatsapp' },
  { id: 'facebook_ads', name: 'Facebook Recruitment Ads', category: 'Paid social', description: 'Analiza gasto, CPL, mejores horas y presupuesto de campañas de reclutamiento en Meta Ads.', icon: Facebook, provider: 'facebook_ads' },
  { id: 'canva', name: 'Canva Content Studio', category: 'Creatividad', description: 'Crea piezas reales con Canva Connect API cuando exista token OAuth valido.', icon: Edit3, provider: 'canva' },
  { id: 'facebook', name: 'Facebook Lead Ads & Messenger', category: 'Sourcing & Chat', description: 'Requiere Meta App, permisos aprobados, Page Access Token y webhooks de Meta.', icon: Facebook, provider: null, actionPath: '/whatsapp' },
  { id: 'instagram', name: 'Instagram Direct Message', category: 'Comunicación', description: 'Requiere Instagram Messaging API, cuenta profesional conectada a Facebook y permisos aprobados.', icon: Instagram, provider: null, actionPath: '/whatsapp' },
  { id: 'tiktok', name: 'TikTok Instant Forms & Chat', category: 'Sourcing & Lead Gen', description: 'Requiere TikTok Lead Generation API o exportacion autorizada hacia webhook.', icon: Video, provider: null, actionPath: '/whatsapp' },
];

const API_INTEGRATION_IDS = [
  "google_workspace",
  "whatsapp_meta",
  "whatsapp_personal",
  "facebook_ads",
  "canva",
  "facebook",
  "instagram",
  "tiktok",
];

const WEBHOOK_INTEGRATION_IDS = [
  "indeed",
  "computrabajo",
];

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Agradecimiento Postulación', subject: 'Gracias por aplicar a {{job_name}}', type: 'Automático', body: '<p>Hola {{candidate_name}},</p><p>Gracias por postularte a la posición de <strong>{{job_name}}</strong>. Hemos recibido tu perfil y nuestro equipo lo revisará en breve.</p>' },
  { id: 2, name: 'Invitación a Entrevista', subject: 'Avanzamos contigo: Entrevista para {{job_name}}', type: 'Manual', body: '<p>Hola {{candidate_name}},</p><p>Nos encantó tu perfil y nos gustaría invitarte a una entrevista para la posición de <strong>{{job_name}}</strong>.</p>' },
  { id: 3, name: 'Rechazo (Fit Cultural)', subject: 'Actualización sobre tu candidatura', type: 'Automático', body: '<p>Hola {{candidate_name}},</p><p>Gracias por tu tiempo. En esta ocasión hemos decidido avanzar con otros candidatos que se ajustan mejor al perfil.</p>' },
  { id: 4, name: 'Oferta Laboral', subject: '¡Tenemos una oferta para ti!', type: 'Manual', body: '<p>Felicidades {{candidate_name}}, te extendemos una oferta formal para unirte a nuestro equipo.</p>' },
];

const SECURITY_LOGS: any[] = [];

const SECURITY_ALERTS_PREFS = [
  { id: 'suspicious_login', label: 'Intentos de inicio de sesión sospechosos', enabled: true },
  { id: 'role_changes', label: 'Cambios en roles de usuario', enabled: false },
];

const API_VAULT_OWNER_EMAILS = [
  "edgar.lovera@sociomax.com.mx",
  "edgarlovera20@gmail.com",
  "edgarloveraj20@gmail.com",
];

const API_VAULT_PRESETS = [
  "Google Gemini",
  "OpenAI",
  "Groq",
  "OpenRouter",
  "Meta / Facebook",
  "Instagram",
  "TikTok",
  "Indeed",
  "Computrabajo",
  "Canva",
  "WhatsApp Meta Cloud API",
  "WhatsApp / Baileys QR",
  "Otro",
];

type ApiVaultEntry = {
  id: string;
  provider: string;
  label: string;
  kind: string;
  model: string;
  apiKey: string;
  endpoint: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const emptyVaultDraft = {
  provider: "Google Gemini",
  label: "",
  kind: "Modelo IA",
  model: "",
  apiKey: "",
  endpoint: "",
  notes: "",
};

const CUSTOM_FIELDS = [
  { id: '1', name: 'candidate_level', description: 'Nivel del candidato (Ej. Junior, Senior)' },
  { id: '2', name: 'interview_date', description: 'Fecha de la entrevista' }
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('workflows');
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const { accessToken, user } = useAuth();
  const {
    prefs: notificationPrefs,
    updatePref: toggleNotificationPref,
    triggerEvent,
    pushStatus,
    pushError,
    requestPushPermission,
    sendTestPushNotification,
  } = useNotifications();
  const [integrationsList, setIntegrationsList] = useState(INTEGRATIONS);
  const [integrationCatalog, setIntegrationCatalog] = useState<Record<string, any>>({});
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, any>>({});
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const stored = localStorage.getItem("rhdreams_integration_configs");
      return stored ? JSON.parse(stored) : {};
    } catch (_error) {
      return {};
    }
  });
  const [configuringIntegration, setConfiguringIntegration] = useState<any>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [webhookTestStatus, setWebhookTestStatus] = useState<any>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const currentUserEmail = user?.email?.trim().toLowerCase() || "";
  const isApiVaultOwner = Boolean(
    currentUserEmail && API_VAULT_OWNER_EMAILS.includes(currentUserEmail)
  );
  const vaultStorageKey = `rhdreams_api_vault_${user?.uid || currentUserEmail || "no_user"}`;
  const [vaultEntries, setVaultEntries] = useState<ApiVaultEntry[]>([]);
  const [vaultDraft, setVaultDraft] = useState(emptyVaultDraft);
  const [visibleVaultSecrets, setVisibleVaultSecrets] = useState<Record<string, boolean>>({});
  const [securityAlerts, setSecurityAlerts] = useState(SECURITY_ALERTS_PREFS);
  const [templates, setTemplates] = useState(EMAIL_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [customFields, setCustomFields] = useState(CUSTOM_FIELDS);
  const [newCustomField, setNewCustomField] = useState({ name: '', description: '' });
  const [users, setUsers] = useState(INITIAL_USERS);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);

  // Draft states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('hr_manager');

  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState('Recibir nueva postulación');
  const [newFlowAction, setNewFlowAction] = useState('Enviar correo a HR');

  const toggleAutomation = (id: number) => {
    setAutomations(autos => autos.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  useEffect(() => {
    localStorage.setItem("rhdreams_integration_configs", JSON.stringify(integrationConfigs));
  }, [integrationConfigs]);

  useEffect(() => {
    if (!isApiVaultOwner) {
      setVaultEntries([]);
      return;
    }

    try {
      const stored = localStorage.getItem(vaultStorageKey);
      setVaultEntries(stored ? JSON.parse(stored) : []);
    } catch (_error) {
      setVaultEntries([]);
    }
  }, [isApiVaultOwner, vaultStorageKey]);

  useEffect(() => {
    if (!isApiVaultOwner) return;
    localStorage.setItem(vaultStorageKey, JSON.stringify(vaultEntries));
  }, [isApiVaultOwner, vaultEntries, vaultStorageKey]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await apiFetch("/api/integrations/catalog");
        const payload = await readApiJson(response);
        setIntegrationCatalog(payload.data || {});
      } catch (_error) {
        setIntegrationCatalog({});
      }
    };

    loadCatalog();
  }, []);

  const testIntegration = async (integration: any) => {
    if (!integration.provider) return;
    setTestingIntegration(integration.id);
    try {
      const response = await apiFetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: integration.provider,
          config: integrationConfigs[integration.id] || {},
        }),
      });
      const payload = await readApiJson(response);
      setIntegrationStatus((current) => ({
        ...current,
        [integration.id]: payload.data || payload,
      }));
    } catch (error: any) {
      setIntegrationStatus((current) => ({
        ...current,
        [integration.id]: {
          ok: false,
          message: error.message || "No se pudo probar la integracion.",
        },
      }));
    } finally {
      setTestingIntegration(null);
    }
  };

  const getIntegrationStatus = (integration: any) => {
    if (integration.id === "google_workspace") {
      return {
        ok: Boolean(accessToken),
        message: accessToken ? "OAuth Google activo en esta sesion." : "Conecta Google Workspace desde su modulo.",
      };
    }

    if (!integration.provider) {
      return {
        ok: false,
        message: "Requiere configuracion oficial del proveedor o webhook.",
      };
    }

    return integrationStatus[integration.id] || {
      ok: false,
      message: "Pendiente de prueba real.",
      missing: integrationCatalog[integration.provider]?.requiredConfig || [],
    };
  };

  const saveIntegrationConfig = () => {
    if (!configuringIntegration) return;
    setConfiguringIntegration(null);
    testIntegration(configuringIntegration);
  };

  const toAbsoluteApiUrl = (path: string) => {
    const url = apiUrl(path);
    return url.startsWith("http") ? url : `${window.location.origin}${url}`;
  };

  const getWebhookUrl = (source: string) => toAbsoluteApiUrl(`/api/integrations/webhooks/${source}`);

  const copyText = async (text: string) => {
    await navigator.clipboard?.writeText(text);
  };

  const maskSecret = (value: string) => {
    if (!value) return "Sin clave guardada";
    if (value.length <= 8) return "••••••••";
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
  };

  const saveVaultEntry = () => {
    if (!isApiVaultOwner || !vaultDraft.provider || !vaultDraft.apiKey.trim()) return;
    const now = new Date().toISOString();
    const entry: ApiVaultEntry = {
      id: `vault_${Date.now()}`,
      provider: vaultDraft.provider,
      label: vaultDraft.label.trim() || vaultDraft.provider,
      kind: vaultDraft.kind,
      model: vaultDraft.model.trim(),
      apiKey: vaultDraft.apiKey.trim(),
      endpoint: vaultDraft.endpoint.trim(),
      notes: vaultDraft.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setVaultEntries((current) => [entry, ...current]);
    setVaultDraft(emptyVaultDraft);
    triggerEvent("api_vault_key_added", {
      title: "Clave guardada en bóveda",
      message: `${entry.label} quedó guardada solo para ${currentUserEmail}.`,
      type: "success",
    });
  };

  const deleteVaultEntry = (id: string) => {
    setVaultEntries((current) => current.filter((entry) => entry.id !== id));
    setVisibleVaultSecrets((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const sendWebhookTest = async (source: string) => {
    setWebhookTestStatus({ source, loading: true });
    try {
      const response = await apiFetch(`/api/integrations/webhooks/${source}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { "x-rhdreams-webhook-secret": webhookSecret } : {}),
        },
        body: JSON.stringify({
          event: "candidate.created",
          payload: {
            id: `test-${Date.now()}`,
            name: "Candidato Demo Webhook",
            email: "demo@heavenlydreams.com.mx",
            phone: "+52 55 0000 0000",
            jobTitle: "Ejecutivo de ventas",
          },
        }),
      });
      const payload = await readApiJson(response);
      setWebhookTestStatus({ source, ok: true, message: "Webhook real recibido por el backend.", data: payload.data });
    } catch (error: any) {
      setWebhookTestStatus({ source, ok: false, message: error.message || "No se pudo enviar el webhook." });
    }
  };

  const renderIntegrationCard = (integration: any) => {
    const status = getIntegrationStatus(integration);
    const catalogItem = integration.provider ? integrationCatalog[integration.provider] : null;
    const missing = status.missing || catalogItem?.requiredConfig || [];
    const iconImage = INTEGRATION_ICON_IMAGES[integration.id];

    return (
      <div key={integration.id} className="glass-panel glass-panel-hover p-5 rounded-xl border border-white/10 group">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all overflow-hidden", status.ok ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30 shadow-[inset_0_0_10px_rgba(163,163,163,0.3)]" : "bg-slate-800 text-slate-500 border border-slate-700")}>
            {iconImage ? (
              <img
                src={iconImage}
                alt={`${integration.name} icono`}
                className="h-9 w-9 object-contain"
                loading="lazy"
              />
            ) : (
              <integration.icon className="w-6 h-6" />
            )}
          </div>
          <div className={cn("px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest font-bold border", status.ok ? "text-zinc-300 border-zinc-500/30 bg-zinc-500/10" : "text-zinc-300 border-zinc-500/30 bg-zinc-500/10")}>
            {status.ok ? "Real conectado" : "Requiere datos"}
          </div>
        </div>
        <h4 className={cn("font-semibold text-sm mb-1 transition-colors", status.ok ? "text-white" : "text-slate-300")}>{integration.name}</h4>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">{integration.category}</div>
        <p className="text-xs text-slate-400 leading-relaxed font-light">{integration.description}</p>

        <div className="mt-4 rounded-lg border border-white/5 bg-slate-950/40 p-3">
          <p className="text-[11px] text-slate-300">{status.message}</p>
          {missing.length > 0 && (
            <p className="mt-2 text-[10px] text-zinc-200">
              Faltan: {missing.join(", ")}
            </p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <span className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold", status.ok ? "text-zinc-400" : "text-slate-500")}>
            {status.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {status.ok ? "Validado" : "No validado"}
          </span>
          <div className="flex items-center gap-2">
            {integration.actionPath && (
              <button
                onClick={() => { window.location.href = integration.actionPath; }}
                className="text-xs text-slate-400 hover:text-zinc-400 transition-colors flex items-center gap-1"
              >
                <SettingsIcon className="w-3.5 h-3.5" /> Abrir modulo
              </button>
            )}
            {integration.provider && (
              <>
                <button
                  onClick={() => setConfiguringIntegration(integration)}
                  className="text-xs text-slate-400 hover:text-zinc-400 transition-colors flex items-center gap-1"
                >
                  <SettingsIcon className="w-3.5 h-3.5" /> Credenciales
                </button>
                <button
                  onClick={() => testIntegration(integration)}
                  disabled={testingIntegration === integration.id}
                  className="text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-60"
                >
                  {testingIntegration === integration.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  Probar real
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const toggleSecurityAlert = (id: string) => {
    setSecurityAlerts(alts => alts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Configuración</h1>
        <p className="text-slate-400">Maneja tu equipo, roles, permisos y opciones del sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 flex flex-col gap-1 shrink-0 glass-panel p-3 rounded-2xl">
          {[
            { id: 'workflows', label: 'Flujos de Trabajo', icon: Zap },
            { id: 'users', label: 'Usuarios y Roles', icon: Users },
            { id: 'security', label: 'Seguridad', icon: Shield },
            { id: 'notifications', label: 'Notificaciones', icon: Bell },
            { id: 'integrations', label: 'Canales e integraciones', icon: Key },
            { id: 'vault', label: 'Bóveda API', icon: Lock },
            { id: 'templates', label: 'Plantillas Correo', icon: Mail },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                activeTab === tab.id
                  ? "bg-zinc-500/10 text-zinc-400 drop-shadow-[0_0_8px_rgba(163,163,163,0.8)]"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "opacity-100" : "opacity-60")} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 w-full glass-panel rounded-2xl overflow-hidden relative group">
          <div className="absolute -inset-20 bg-zinc-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-1000"></div>

          <div className="relative z-10 w-full h-full">
            {activeTab === 'workflows' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Flujos de Automatización</h2>
                    <p className="text-sm text-slate-400 font-light">Configura notificaciones y correos automáticos.</p>
                  </div>
                  <button
                    onClick={() => setIsFlowModalOpen(true)}
                    className="bg-zinc-600/20 border border-zinc-500/50 hover:bg-zinc-600/40 text-zinc-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]">
                    <Plus className="w-4 h-4" /> Crear Flujo
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid gap-4">
                    {automations.map(auto => (
                      <div key={auto.id} className="glass-panel glass-panel-hover p-5 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all", auto.active ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 shadow-[inset_0_0_8px_rgba(163,163,163,0.2)]" : "bg-slate-800 text-slate-500 border border-slate-700")}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={cn("font-semibold transition-colors", auto.active ? "text-white" : "text-slate-400")}>{auto.name}</h4>
                            <div className={cn("flex flex-wrap items-center gap-2 mt-2 text-[11px] uppercase tracking-wider font-bold", auto.active ? "text-slate-400" : "text-slate-600")}>
                               <span className="glass-panel px-2 py-0.5 rounded text-slate-300">{auto.trigger}</span>
                               <span className="text-zinc-500/50 font-normal lowercase tracking-normal">→ entonces →</span>
                               <span className="bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded">{auto.action}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-l border-white/5 pl-4 ml-4">
                          <button
                            onClick={() => toggleAutomation(auto.id)}
                            className={cn("px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest border transition-colors",
                              auto.active
                                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20 shadow-[inset_0_0_8px_rgba(163,163,163,0.2)]"
                                : "bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-800 hover:text-white"
                            )}
                          >
                            {auto.active ? 'Activo' : 'Inactivo'}
                          </button>
                          <button className="p-2 text-slate-500 hover:text-zinc-400 rounded-lg hover:bg-zinc-500/10 transition-colors">
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Gestión de Usuarios</h2>
                    <p className="text-sm text-slate-400 font-light">Controla quién puede acceder a qué.</p>
                  </div>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-zinc-600/20 border border-zinc-500/50 hover:bg-zinc-600/40 text-zinc-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]">
                    <Plus className="w-4 h-4" /> Invitar
                  </button>
                </div>

                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                        <th className="pb-3 text-zinc-400/80">Usuario</th>
                        <th className="pb-3 text-zinc-400/80">Rol</th>
                        <th className="pb-3 text-right text-zinc-400/80">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-zinc-500/5 transition-colors group">
                          <td className="py-4">
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-slate-500 text-xs">{user.email}</div>
                          </td>
                          <td className="py-4">
                            <select
                              className="glass-panel text-slate-300 rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-zinc-500 appearance-none bg-slate-900"
                              value={user.role}
                              onChange={(e) => {
                                setUsers(users.map(u => u.id === user.id ? { ...u, role: e.target.value } : u));
                                triggerEvent('role_change', {
                                  title: 'Rol Cambiado',
                                  message: `Se cambió el rol de ${user.name} a ${ROLES.find(r => r.id === e.target.value)?.name}`,
                                  type: 'info'
                                });
                              }}
                            >
                              {ROLES.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => {
                                setUsers(users.filter(u => u.id !== user.id));
                                triggerEvent('user_removed', {
                                  title: 'Usuario Eliminado',
                                  message: `${user.name} fue revocado.`,
                                  type: 'error'
                                });
                              }}
                              className="text-slate-500 hover:text-zinc-400 p-1.5 rounded-md hover:bg-zinc-500/10 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/20">
                  <h3 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-zinc-400" /> Niveles de Permiso
                  </h3>
                  <div className="grid gap-4">
                    {ROLES.map(role => (
                      <div key={role.id} className="glass-panel p-4 rounded-xl flex items-start gap-4 hover:border-white/10 transition-colors">
                        <div className="mt-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 p-2 rounded-lg shadow-[inset_0_0_8px_rgba(163,163,163,0.2)]">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{role.name}</h4>
                          <p className="text-xs text-slate-400 mt-1 font-light">{role.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'notifications' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Preferencias de Notificación</h2>
                    <p className="text-sm text-slate-400 font-light">Elige qué eventos activan cada tipo de notificación.</p>
                  </div>
                  <button className="bg-zinc-600/20 border border-zinc-500/50 hover:bg-zinc-600/40 text-zinc-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]">
                    Guardar Cambios
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl border border-zinc-500/30 bg-zinc-500/10 p-2 text-zinc-300">
                          <BellRing className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">Push del navegador</h3>
                            <span className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              pushStatus === 'granted' && "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
                              pushStatus === 'denied' && "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
                              pushStatus === 'default' && "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
                              pushStatus === 'unsupported' && "border-slate-600 bg-slate-800 text-slate-400"
                            )}>
                              {pushStatus === 'granted' ? 'Activas' : pushStatus === 'denied' ? 'Bloqueadas' : pushStatus === 'unsupported' ? 'No soportadas' : 'Sin permiso'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Recibe avisos de citas, cambios de estado y alertas importantes aunque estés en otra pestaña.
                          </p>
                          {pushError && (
                            <p className="mt-2 text-xs text-zinc-300">{pushError}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={requestPushPermission}
                          disabled={pushStatus === 'unsupported' || pushStatus === 'granted'}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-500/50 bg-zinc-600/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-50 transition-all hover:bg-zinc-600/40 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Bell className="h-4 w-4" />
                          Activar Push
                        </button>
                        <button
                          type="button"
                          onClick={sendTestPushNotification}
                          disabled={pushStatus !== 'granted'}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-200 transition-colors hover:border-zinc-500/40 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          Probar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-black/20 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                          <th className="p-4 font-semibold text-zinc-400/80">Tipo de Evento</th>
                          <th className="p-4 text-center font-semibold text-zinc-400/80 w-24">In-App</th>
                          <th className="p-4 text-center font-semibold text-zinc-400/80 w-24">Push</th>
                          <th className="p-4 text-center font-semibold text-zinc-400/80 w-24">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {notificationPrefs.map(pref => (
                          <tr key={pref.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4">
                              <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{pref.label}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{pref.description}</div>
                            </td>
                            <td className="p-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={pref.inApp}
                                  onChange={() => toggleNotificationPref(pref.id, 'inApp')}
                                />
                                <div className={cn(
                                  "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                  pref.inApp ? "bg-zinc-500 shadow-[0_0_10px_rgba(163,163,163,0.5)]" : "bg-slate-700"
                                )}></div>
                                <div className={cn(
                                  "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                  pref.inApp ? "translate-x-full border-white" : ""
                                )}></div>
                              </label>
                            </td>
                            <td className="p-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={pref.push}
                                  onChange={() => toggleNotificationPref(pref.id, 'push')}
                                />
                                <div className={cn(
                                  "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                  pref.push ? "bg-zinc-500 shadow-[0_0_10px_rgba(163,163,163,0.5)]" : "bg-slate-700"
                                )}></div>
                                <div className={cn(
                                  "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                  pref.push ? "translate-x-full border-white" : ""
                                )}></div>
                              </label>
                            </td>
                            <td className="p-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={pref.email}
                                  onChange={() => toggleNotificationPref(pref.id, 'email')}
                                />
                                <div className={cn(
                                  "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                  pref.email ? "bg-zinc-500 shadow-[0_0_10px_rgba(163,163,163,0.5)]" : "bg-slate-700"
                                )}></div>
                                <div className={cn(
                                  "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                  pref.email ? "translate-x-full border-white" : ""
                                )}></div>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'integrations' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Canales, APIs y webhooks reales</h2>
                    <p className="text-sm text-slate-400 font-light">El estado se valida con credenciales o endpoints reales; no se activa por simulacion.</p>
                  </div>
                  <button
                    onClick={() => setConfiguringIntegration(integrationsList.find(item => item.provider) || null)}
                    className="bg-zinc-600/20 border border-zinc-500/50 hover:bg-zinc-600/40 text-zinc-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]"
                  >
                    <Plus className="w-4 h-4" /> Nueva Integracion
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-zinc-300" />
                        Apps que ocupan API oficial
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Estas necesitan OAuth, token, permisos aprobados o credenciales del proveedor.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integrationsList
                        .filter((integration) => API_INTEGRATION_IDS.includes(integration.id))
                        .map(renderIntegrationCard)}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-zinc-300" />
                        Apps por webhook, CSV o correo
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Estas reciben candidatos por endpoint, exportacion autorizada, correo parser o archivo CSV.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integrationsList
                        .filter((integration) => WEBHOOK_INTEGRATION_IDS.includes(integration.id))
                        .map(renderIntegrationCard)}
                    </div>
                  </section>

                  <div className="glass-panel rounded-xl border border-zinc-500/20 overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-slate-950/40">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-zinc-300" />
                        Modulo de Webhooks
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">Usa estas URLs para recibir candidatos reales desde formularios, bolsas de trabajo, Make, Zapier o sistemas externos.</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Secreto para prueba local del webhook</label>
                        <input
                          type="password"
                          value={webhookSecret}
                          onChange={(event) => setWebhookSecret(event.target.value)}
                          placeholder="Debe coincidir con RHDREAMS_WEBHOOK_SECRET si esta configurado"
                          className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                        />
                      </div>

                      {["indeed", "computrabajo", "formularios", "externo"].map((source) => {
                        const url = source === "indeed" || source === "computrabajo"
                          ? toAbsoluteApiUrl(`/api/integrations/webhooks/job-board/${source}`)
                          : getWebhookUrl(source);

                        return (
                          <div key={source} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">{source}</p>
                                <p className="mt-1 break-all font-mono text-[11px] text-slate-300">{url}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyText(url)}
                                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copiar
                                </button>
                                <button
                                  onClick={() => sendWebhookTest(source)}
                                  disabled={webhookTestStatus?.source === source && webhookTestStatus?.loading}
                                  className="rounded-lg border border-zinc-500/30 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-500/20 flex items-center gap-1 disabled:opacity-60"
                                >
                                  {webhookTestStatus?.source === source && webhookTestStatus?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                  Probar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {webhookTestStatus && !webhookTestStatus.loading && (
                        <div className={cn("rounded-xl border px-4 py-3 text-xs", webhookTestStatus.ok ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-200" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-200")}>
                          {webhookTestStatus.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'vault' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Bóveda privada de claves API</h2>
                    <p className="text-sm text-slate-400 font-light">Guarda claves de apps y modelos de IA separadas por tu cuenta.</p>
                  </div>
                  <div className={cn(
                    "rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest",
                    isApiVaultOwner ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"
                  )}>
                    {isApiVaultOwner ? "Acceso privado activo" : "Cuenta no autorizada"}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {!isApiVaultOwner ? (
                    <div className="rounded-2xl border border-zinc-500/20 bg-zinc-500/10 p-6 text-sm text-zinc-100">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-white">Bóveda bloqueada</h3>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-100/80">
                            Esta bóveda solo se abre con las cuentas autorizadas: {API_VAULT_OWNER_EMAILS.join(", ")}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5">
                        <div className="glass-panel rounded-xl border border-zinc-500/20 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <Key className="h-4 w-4 text-zinc-300" />
                            <h3 className="text-sm font-semibold text-white">Agregar nueva clave</h3>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">App o proveedor</label>
                              <select
                                value={vaultDraft.provider}
                                onChange={(event) => setVaultDraft({ ...vaultDraft, provider: event.target.value })}
                                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50 appearance-none"
                              >
                                {API_VAULT_PRESETS.map((provider) => (
                                  <option key={provider} value={provider}>{provider}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre interno</label>
                                <input
                                  value={vaultDraft.label}
                                  onChange={(event) => setVaultDraft({ ...vaultDraft, label: event.target.value })}
                                  placeholder="Ej: Gemini producción"
                                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
                                <select
                                  value={vaultDraft.kind}
                                  onChange={(event) => setVaultDraft({ ...vaultDraft, kind: event.target.value })}
                                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50 appearance-none"
                                >
                                  <option>Modelo IA</option>
                                  <option>API App</option>
                                  <option>OAuth Token</option>
                                  <option>Webhook Secret</option>
                                  <option>Servicio externo</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">Modelo o alcance</label>
                              <input
                                value={vaultDraft.model}
                                onChange={(event) => setVaultDraft({ ...vaultDraft, model: event.target.value })}
                                placeholder="Ej: gemini-1.5-pro, gpt-4.1, ads_read"
                                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">Clave API / Token / Secret</label>
                              <input
                                type="password"
                                value={vaultDraft.apiKey}
                                onChange={(event) => setVaultDraft({ ...vaultDraft, apiKey: event.target.value })}
                                placeholder="Pega la clave aquí"
                                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">Endpoint opcional</label>
                              <input
                                value={vaultDraft.endpoint}
                                onChange={(event) => setVaultDraft({ ...vaultDraft, endpoint: event.target.value })}
                                placeholder="https://api.proveedor.com/v1/..."
                                className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">Notas</label>
                              <textarea
                                value={vaultDraft.notes}
                                onChange={(event) => setVaultDraft({ ...vaultDraft, notes: event.target.value })}
                                placeholder="Dónde se usa, permisos, límites, fecha de renovación..."
                                className="min-h-[82px] w-full resize-none bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50"
                              />
                            </div>

                            <button
                              onClick={saveVaultEntry}
                              disabled={!vaultDraft.apiKey.trim()}
                              className="w-full rounded-lg bg-zinc-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Guardar en bóveda
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-4">
                            <div className="flex items-start gap-3">
                              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300" />
                              <div>
                                <h3 className="text-sm font-semibold text-white">Propietario de la bóveda</h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                  Sesión actual: <span className="font-mono text-zinc-200">{currentUserEmail}</span>. Las claves se guardan bajo esta cuenta y no aparecen para otros usuarios.
                                </p>
                                <p className="mt-2 text-[11px] leading-relaxed text-zinc-200/80">
                                  Para producción real, copia las claves al servidor como variables de entorno cuando quieras que el backend las use.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3">
                            {vaultEntries.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
                                Todavía no hay claves guardadas en esta bóveda.
                              </div>
                            ) : vaultEntries.map((entry) => (
                              <div key={entry.id} className="glass-panel rounded-xl border border-white/10 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="font-semibold text-white">{entry.label}</h4>
                                      <span className="rounded-md border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">{entry.provider}</span>
                                      <span className="rounded-md border border-white/10 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">{entry.kind}</span>
                                    </div>
                                    {entry.model && <p className="mt-1 text-xs text-slate-400">Modelo/alcance: {entry.model}</p>}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setVisibleVaultSecrets((current) => ({ ...current, [entry.id]: !current[entry.id] }))}
                                      className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:text-zinc-300 hover:bg-white/5"
                                      title="Mostrar u ocultar clave"
                                    >
                                      {visibleVaultSecrets[entry.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                    <button
                                      onClick={() => copyText(entry.apiKey)}
                                      className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:text-zinc-300 hover:bg-white/5"
                                      title="Copiar clave"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteVaultEntry(entry.id)}
                                      className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:text-zinc-300 hover:bg-zinc-500/10"
                                      title="Eliminar clave"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 rounded-lg border border-white/5 bg-slate-950/50 p-3">
                                  <p className="break-all font-mono text-[11px] text-slate-300">
                                    {visibleVaultSecrets[entry.id] ? entry.apiKey : maskSecret(entry.apiKey)}
                                  </p>
                                  {entry.endpoint && <p className="mt-2 break-all text-[11px] text-slate-500">Endpoint: {entry.endpoint}</p>}
                                  {entry.notes && <p className="mt-2 text-xs leading-relaxed text-slate-400">{entry.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : activeTab === 'templates' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Plantillas de Correo</h2>
                    <p className="text-sm text-slate-400 font-light">Estandariza la comunicación de tu equipo de reclutamiento.</p>
                  </div>
                  {!editingTemplate && (
                    <button
                      onClick={() => setEditingTemplate({ id: Date.now(), name: '', subject: '', type: 'Manual', body: '' })}
                      className="bg-zinc-600/20 border border-zinc-500/50 hover:bg-zinc-600/40 text-zinc-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]">
                      <Plus className="w-4 h-4" /> Crear Plantilla
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {editingTemplate ? (
                    <div className="glass-panel p-5 rounded-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-semibold text-white">{editingTemplate.name ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                         <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid gap-4">
                         <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la Plantilla</label>
                           <input type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-medium text-slate-400 mb-1.5">Asunto</label>
                             <input type="text" value={editingTemplate.subject} onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50" />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
                             <select value={editingTemplate.type} onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50 appearance-none">
                               <option value="Manual">Manual</option>
                               <option value="Automático">Automático</option>
                             </select>
                           </div>
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuerpo del Correo</label>
                           <textarea
                             value={editingTemplate.body}
                             onChange={(event) => setEditingTemplate({ ...editingTemplate, body: event.target.value })}
                             className="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none focus:border-zinc-400"
                           />
                           <p className="text-[10px] text-slate-500 mt-2">Variables disponibles: {'{{candidate_name}}'}, {'{{job_name}}'}, {'{{company_name}}'}, {customFields.map(cf => `{{${cf.name}}}`).join(', ')}</p>
                         </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">Cancelar</button>
                        <button onClick={() => {
                          if (templates.find(t => t.id === editingTemplate.id)) {
                             setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                          } else {
                             setTemplates([...templates, editingTemplate]);
                          }
                          setEditingTemplate(null);
                        }} className="bg-zinc-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-zinc-600 transition-colors flex items-center gap-2">
                          <Check className="w-4 h-4" /> Guardar Plantilla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4">
                        {templates.map(template => (
                          <div key={template.id} className="glass-panel glass-panel-hover p-4 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-white text-sm">{template.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 font-light">Asunto: <span className="text-slate-300 italic">{template.subject}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider", template.type === 'Automático' ? "bg-zinc-500/10 text-zinc-400" : "bg-slate-800 text-slate-400")}>
                                {template.type}
                              </span>
                              <div className="flex items-center gap-2 border-l border-white/5 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingTemplate(template)} className="p-1.5 text-slate-400 hover:text-zinc-400 hover:bg-zinc-500/10 rounded-lg transition-colors">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setTemplates(templates.filter(t => t.id !== template.id))} className="p-1.5 text-slate-400 hover:text-zinc-400 hover:bg-zinc-500/10 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-white">Campos Personalizados</h3>
                          <p className="text-xs text-slate-400 font-light mt-0.5">Define variables adicionales para usarlas dentro de las plantillas de correo como {'{{nombre_variable}}'}.</p>
                        </div>

                        <div className="grid gap-3 mb-5">
                          {customFields.map(field => (
                            <div key={field.id} className="glass-panel p-3 rounded-lg flex items-center justify-between">
                              <div>
                                <h4 className="text-sm text-zinc-300 font-mono text-[11px]">{'{{'}{field.name}{'}}'}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>
                              </div>
                              <button onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} className="text-slate-500 hover:text-zinc-400 p-1.5 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="nombre_variable"
                              value={newCustomField.name}
                              onChange={e => setNewCustomField({...newCustomField, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                              className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50 h-9 font-mono text-[11px]"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Breve descripción del campo"
                              value={newCustomField.description}
                              onChange={e => setNewCustomField({...newCustomField, description: e.target.value})}
                              className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500/50 h-9"
                            />
                          </div>
                          <button
                            disabled={!newCustomField.name || !newCustomField.description}
                            onClick={() => {
                              setCustomFields([...customFields, { id: Date.now().toString(), name: newCustomField.name, description: newCustomField.description }]);
                              setNewCustomField({ name: '', description: '' });
                            }}
                            className="bg-zinc-600/20 border border-zinc-500/50 text-zinc-400 hover:bg-zinc-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 h-9 whitespace-nowrap">
                            Añadir Campo
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Seguridad y Auditoría</h2>
                    <p className="text-sm text-slate-400 font-light">Monitoriza accesos y protege los datos de tu empresa.</p>
                  </div>
                  <button className="bg-slate-800/80 border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm">
                    Exportar Reporte
                  </button>
                </div>

                <div className="p-6 grid gap-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-zinc-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock className="w-16 h-16 text-zinc-400" /></div>
                        <h3 className="font-semibold text-white mb-2 relative z-10">Autenticación de Dos Factores (2FA)</h3>
                        <p className="text-xs text-slate-400 mb-4 max-w-[200px] relative z-10">Requiere un código adicional para iniciar sesión en cuentas de administradores.</p>
                        <div className="relative z-10">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-9 h-5 rounded-full peer-focus:outline-none transition-all bg-zinc-500 shadow-[0_0_10px_rgba(163,163,163,0.5)]"></div>
                            <div className="absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all translate-x-full border-white"></div>
                          </label>
                        </div>
                     </div>
                     <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-zinc-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Smartphone className="w-16 h-16 text-zinc-400" /></div>
                        <h3 className="font-semibold text-white mb-2 relative z-10">Restricción de Dispositivos</h3>
                        <p className="text-xs text-slate-400 mb-4 max-w-[200px] relative z-10">Limitar el acceso al sistema solo desde IPs o dispositivos de la compañía.</p>
                        <div className="relative z-10">
                          <button className="text-xs border border-white/10 hover:border-zinc-500/50 bg-slate-900/50 px-3 py-1.5 rounded-lg text-slate-300 transition-colors">
                            Configurar Reglas
                          </button>
                        </div>
                     </div>
                   </div>

                   <div className="glass-panel rounded-xl overflow-hidden border border-white/10 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-4 h-4 text-zinc-400" />
                        <h3 className="font-medium text-sm text-slate-200">Alertas de Seguridad (Email)</h3>
                      </div>
                      <div className="grid gap-3">
                        {securityAlerts.map(alert => (
                          <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-white/5 hover:bg-slate-800/50 transition-colors">
                            <span className="text-sm text-slate-300 font-light">{alert.label}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={alert.enabled}
                                onChange={() => toggleSecurityAlert(alert.id)}
                              />
                              <div className={cn(
                                "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                alert.enabled ? "bg-zinc-500 shadow-[0_0_10px_rgba(163,163,163,0.5)]" : "bg-slate-700"
                              )}></div>
                              <div className={cn(
                                "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                alert.enabled ? "translate-x-full border-white" : ""
                              )}></div>
                            </label>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                    <div className="px-5 py-4 border-b border-white/5 bg-black/20 flex items-center gap-2">
                       <History className="w-4 h-4 text-zinc-400" />
                       <h3 className="font-medium text-sm text-slate-200">Log de Auditoría</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <tbody className="divide-y divide-white/5">
                          {SECURITY_LOGS.map(log => (
                            <tr key={log.id} className="hover:bg-zinc-500/5 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-medium text-slate-200">{log.event}</div>
                              </td>
                              <td className="px-5 py-3 text-slate-400 text-xs flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 opacity-50" /> {log.user}
                              </td>
                              <td className="px-5 py-3 text-slate-500 text-xs">
                                IP: {log.ip}
                              </td>
                              <td className="px-5 py-3 text-right text-slate-400 text-xs">
                                {log.time}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                   </div>
                </div>
              </div>
            ) : (
               <div className="p-6 flex flex-col items-center justify-center text-center h-[400px] text-slate-500 relative">
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
                 <Shield className="w-16 h-16 text-zinc-900 mb-4 opacity-50 drop-shadow-[0_0_15px_rgba(163,163,163,0.2)]" />
                 <h3 className="text-lg font-medium text-slate-300 mb-1 tracking-tight">Módulo en construcción</h3>
                 <p className="max-w-xs text-sm font-light">Pronto podrás configurar esta sección del sistema inteligente aquí.</p>
               </div>
            )}

            {/* Invite Modal */}
            {isInviteModalOpen && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
                  <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-4">Invitar Miembro</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="correo@empresa.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Rol</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none appearance-none"
                      >
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (newUserEmail) {
                          setUsers([...users, { id: Date.now(), name: newUserEmail.split('@')[0], email: newUserEmail, role: newUserRole }]);
                          setIsInviteModalOpen(false);
                          setNewUserEmail('');
                          triggerEvent('user_invited', { title: 'Invitación Enviada', message: `Se ha invitado a ${newUserEmail}.`, type: 'success' });
                        }
                      }}
                      className="w-full bg-zinc-500 hover:bg-zinc-600 text-slate-900 font-semibold py-2 rounded-lg text-sm mt-2 transition-colors"
                    >
                      Enviar Invitación
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Integration Credentials Modal */}
            {configuringIntegration && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-lg relative glass-panel shadow-2xl">
                  <button onClick={() => setConfiguringIntegration(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-1">Credenciales reales</h3>
                  <p className="text-xs text-slate-400 mb-5">
                    {configuringIntegration.name}. Estos datos se guardan en este navegador para probar contra el backend real.
                  </p>

                  <div className="space-y-3">
                    {(integrationCatalog[configuringIntegration.provider]?.requiredConfig || []).map((key: string) => (
                      <div key={key}>
                        <label className="text-xs text-slate-400 block mb-1">{key}</label>
                        <input
                          type={key.toLowerCase().includes("secret") || key.toLowerCase().includes("token") ? "password" : "text"}
                          value={integrationConfigs[configuringIntegration.id]?.[key] || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setIntegrationConfigs((current) => ({
                              ...current,
                              [configuringIntegration.id]: {
                                ...(current[configuringIntegration.id] || {}),
                                [key]: value,
                              },
                            }));
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {integrationCatalog[configuringIntegration.provider]?.notes && (
                    <div className="mt-4 rounded-xl border border-zinc-500/20 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-100">
                      {integrationCatalog[configuringIntegration.provider].notes}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      onClick={() => setConfiguringIntegration(null)}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveIntegrationConfig}
                      className="bg-zinc-500 hover:bg-zinc-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" /> Guardar y probar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Modal */}
            {isFlowModalOpen && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
                  <button onClick={() => setIsFlowModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-4">Nuevo Flujo Automático</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre Corto</label>
                      <input
                        type="text"
                        value={newFlowName}
                        onChange={(e) => setNewFlowName(e.target.value)}
                        placeholder="Ej: Auto-rechazo por salario"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Cuando ocurra (Trigger)</label>
                      <input
                        type="text"
                        value={newFlowTrigger}
                        onChange={(e) => setNewFlowTrigger(e.target.value)}
                        placeholder="Ej: Candidato avanza a entrevista"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hacer esto (Action)</label>
                      <input
                        type="text"
                        value={newFlowAction}
                        onChange={(e) => setNewFlowAction(e.target.value)}
                        placeholder="Ej: Enviar mensaje slack"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (newFlowName) {
                          setAutomations([...automations, { id: Date.now(), name: newFlowName, trigger: newFlowTrigger, action: newFlowAction, active: true }]);
                          setIsFlowModalOpen(false);
                          setNewFlowName('');
                        }
                      }}
                      className="w-full bg-zinc-500 hover:bg-zinc-600 text-slate-900 font-semibold py-2 rounded-lg text-sm mt-2 transition-colors"
                    >
                      Guardar Flujo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <DigitalOceanBadge />
      </div>
    </div>
  );
}
