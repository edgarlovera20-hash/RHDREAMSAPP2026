import type { ReactNode } from "react";
import { CheckCircle2, RotateCcw, Zap, Settings2, Trash2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_COMPANY_NAME } from "@/lib/recruiterAgentPrompt";

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

interface ChannelAccountsListProps {
  filteredAccounts: ChannelAccount[];
  activeTab: ChannelType;
  getPlatformIcon: (type: string) => ReactNode;
  getPlatformLabel: (type: string) => string;
  getPlatformColor: (type: string) => string;
  getCaptureDescription: (type: string) => string;
  getPlatformMode: (type: string) => string;
  getAssignedAgent: (agentId: string) => any;
  getCompatibleAgents: (type: ChannelType) => any[];
  getAccountIsolationKey: (account: ChannelAccount) => string;
  onAssignAgent: (accountId: string, agentId: string) => void;
  onOpenAutomation: (account: ChannelAccount) => void;
  onConfirmRemove: (account: ChannelAccount) => void;
}

export function ChannelAccountsList({
  filteredAccounts,
  activeTab,
  getPlatformIcon,
  getPlatformLabel,
  getPlatformColor,
  getCaptureDescription,
  getPlatformMode,
  getAssignedAgent,
  getCompatibleAgents,
  getAccountIsolationKey,
  onAssignAgent,
  onOpenAutomation,
  onConfirmRemove,
}: ChannelAccountsListProps) {
  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 xl:gap-6">
      {filteredAccounts.map(account => (
        <div
          key={account.id}
          className={cn(
            "glass-panel rounded-2xl flex min-w-0 flex-col p-5 lg:p-6 border transition-all duration-300 group hover:shadow-xl",
            account.status === 'connected' ? "hover:border-zinc-500/30 border-white/5" : "border-zinc-500/20"
          )}
        >
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                  account.status === 'connected' ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                )}>
                  {getPlatformIcon(account.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold leading-tight tracking-tight text-white transition-colors group-hover:text-zinc-300">{account.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">{account.companyName || DEFAULT_COMPANY_NAME}</p>
                  {account.agentPersonalName && (
                    <p className="mt-0.5 text-xs font-semibold text-zinc-300">Atiende: {account.agentPersonalName}</p>
                  )}
                  <p className="break-words text-xs font-mono text-slate-400">{account.phone}</p>
                </div>
              </div>
              <div className={cn(
                "shrink-0 px-2.5 py-1 flex items-center gap-1 rounded-full text-[9px] uppercase tracking-wider font-bold border",
                account.status === "connected" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
              )}>
                {account.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                {account.status === "connected" ? "Conectado" : "Desvinculado"}
              </div>
            </div>

            {getAssignedAgent(account.agentId) && (
              <div className="rounded-xl border border-zinc-500/10 bg-zinc-500/5 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Sabe responder sobre</div>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {getAssignedAgent(account.agentId)?.description}
                </p>
              </div>
            )}
          </div>

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
                <span className="text-[10px] text-zinc-300 border border-zinc-500/10 bg-slate-950 px-2 py-1 rounded-lg font-mono">
                  {account.webhookUrl}
                </span>
              )}
            </div>
          </div>

          {account.type === "whatsapp_personal" && (
            <div className="mb-4 rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                <Shield className="w-3.5 h-3.5" />
                Aislamiento activo
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Esta cuenta usa su propia sesion, agente y reglas. Los mensajes entrantes se enrutan solo al agente seleccionado aqui.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg border border-zinc-500/20 bg-slate-950/70 px-2 py-1 text-[10px] font-mono text-zinc-300">
                  {getAccountIsolationKey(account)}
                </span>
                <span className="rounded-lg border border-zinc-500/20 bg-slate-950/70 px-2 py-1 text-[10px] text-zinc-300">
                  Agente: {account.agentPersonalName || getAssignedAgent(account.agentId)?.name || "Sin asignar"}
                </span>
              </div>
            </div>
          )}

          {account.type === "whatsapp_meta" && (
            <div className="mb-4 rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                <Shield className="w-3.5 h-3.5" />
                Meta Cloud aislado
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Esta cuenta recibe por webhook oficial de Meta y responde usando WhatsApp Cloud API. No usa QR, no usa sesiones Baileys y no comparte reglas con WhatsApp QR.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg border border-zinc-500/20 bg-slate-950/70 px-2 py-1 text-[10px] font-mono text-zinc-300">
                  WHATSAPP_PHONE_NUMBER_ID
                </span>
                <span className="rounded-lg border border-zinc-500/20 bg-slate-950/70 px-2 py-1 text-[10px] text-zinc-300">
                  Agente: {account.agentPersonalName || getAssignedAgent(account.agentId)?.name || "Sin asignar"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-slate-700/50 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-zinc-400" /> Agente AI Asignado
              </label>
              <div className="relative">
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 outline-none focus:border-zinc-500 transition-colors appearance-none"
                  value={account.agentId}
                  onChange={(e) => onAssignAgent(account.id, e.target.value)}
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
              <span className="text-[10px] text-slate-500 font-mono">Actualizado: {account.lastSync}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenAutomation(account)}
                  className="text-slate-500 hover:text-zinc-400 p-1.5 rounded-md hover:bg-zinc-500/10 transition-all border border-transparent hover:border-zinc-500/20"
                  title="Configurar Mensajes Automáticos"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onConfirmRemove(account)}
                  className="text-slate-500 hover:text-zinc-400 p-1.5 rounded-md hover:bg-zinc-500/10 transition-all border border-transparent hover:border-zinc-500/20"
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
  );
}
