import { Plus, Trash2, Zap, Search, CheckCircle2, MessageSquare, Clock } from "lucide-react";
import { WHATSAPP_RECRUITMENT_TEMPLATES } from "@/data/recruitmentKnowledge";

type AutomationRule = {
  id: string;
  trigger: string;
  keywords: string;
  condition: string;
  action: string;
  actionData: string;
};

type ChannelAccount = {
  id: string;
  name: string;
  phone: string;
  status: string;
  agentId: string;
  lastSync: string;
  type: string;
  mode?: string;
  webhookUrl?: string;
  isolationKey?: string;
  companyName?: string;
  agentPersonalName?: string;
};

interface AutomationRulesPanelProps {
  accountToAutomate: ChannelAccount;
  automationRules: AutomationRule[];
  welcomeMessage: string;
  followUpMessage: string;
  onAddRule: () => void;
  onRemoveRule: (id: string) => void;
  onUpdateRule: (id: string, field: string, value: any) => void;
  onSetWelcomeMessage: (msg: string) => void;
  onSetFollowUpMessage: (msg: string) => void;
  onAddRecruitmentTemplateRule: (templateId: string) => void;
  onApplyRecruitmentTemplateToWelcome: (body: string) => void;
  onApplyRecruitmentTemplateToFollowUp: (body: string) => void;
  getPlatformIcon: (type: string) => React.ReactNode;
  getPlatformLabel: (type: string) => string;
  onClose: () => void;
  onSave: () => void;
}

export function AutomationRulesPanel({
  accountToAutomate,
  automationRules,
  welcomeMessage,
  followUpMessage,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onSetWelcomeMessage,
  onSetFollowUpMessage,
  onAddRecruitmentTemplateRule,
  onApplyRecruitmentTemplateToWelcome,
  onApplyRecruitmentTemplateToFollowUp,
  getPlatformIcon,
  getPlatformLabel,
  onClose,
  onSave,
}: AutomationRulesPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-8 style-3">
      {accountToAutomate.type === 'whatsapp_personal' && (
        <div className="space-y-4">
          <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            Plantillas reales de reclutamiento WhatsApp
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WHATSAPP_RECRUITMENT_TEMPLATES.map((template) => (
              <div key={template.id} className="rounded-xl border border-zinc-500/15 bg-zinc-500/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white">{template.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-300">{template.stage}</p>
                  </div>
                  <button
                    onClick={() => onAddRecruitmentTemplateRule(template.id)}
                    className="rounded-lg border border-zinc-400/30 px-2 py-1 text-[10px] font-bold text-zinc-200 hover:bg-zinc-500/10"
                  >
                    Regla
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-slate-400">{template.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onApplyRecruitmentTemplateToWelcome(template.body)}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    Usar saludo
                  </button>
                  <button
                    onClick={() => onApplyRecruitmentTemplateToFollowUp(template.body)}
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
          <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          Mensajería de Respuesta Rápida de Entrada
        </h4>
        <div>
          <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
            Saludo de Conversación / Formulario
          </label>
          <p className="text-[11px] text-slate-500 mb-2">Este mensaje se envía de inmediato cuando un candidato interactúa o se suscribe.</p>
          <textarea
            value={welcomeMessage}
            onChange={(e) => onSetWelcomeMessage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none h-20 font-mono"
            placeholder="Escribe el mensaje de bienvenida..."
          />
        </div>

        <div>
          <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-zinc-500" />
            Recordatorio de Reactivación de Candidato
          </label>
          <p className="text-[11px] text-slate-500 mb-2">Mensaje automático para reactivar conversaciones frías en las que el aplicante dejó de contestar.</p>
          <textarea
            value={followUpMessage}
            onChange={(e) => onSetFollowUpMessage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none h-20 font-mono"
            placeholder="Escribe el mensaje de seguimiento..."
          />
        </div>
      </div>

      {/* Advanced Rules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-500" />
            Reglas Específicas de Desvío / Filtro
          </h4>
          <button
            onClick={onAddRule}
            className="text-xs bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-400 border border-zinc-500/30 px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Añadir Regla
          </button>
        </div>

        <p className="text-[11px] text-slate-400">Intervenga el flujo por defecto aislando respuestas con base en triggers de palabras o acciones específicas.</p>

        <div className="space-y-4">
          {automationRules.map((rule, idx) => (
            <div key={rule.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Regla de Filtrado #{idx + 1}</span>
                <button onClick={() => onRemoveRule(rule.id)} className="text-slate-500 hover:text-zinc-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3 text-zinc-400" /> Trigger (Evento)</label>
                  <select
                    value={rule.trigger}
                    onChange={(e) => onUpdateRule(rule.id, 'trigger', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="keyword">Mensaje Entrante</option>
                    <option value="form">Envío de Formulario</option>
                    <option value="webhook">Evento de Webhook</option>
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Search className="w-3 h-3 text-zinc-400" /> Regla de Condición</label>
                  <select
                    value={rule.condition}
                    onChange={(e) => onUpdateRule(rule.id, 'condition', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="contains">Contiene palabra clave</option>
                    <option value="exact">Coincidencia exacta</option>
                    <option value="any">Cualquier mensaje</option>
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-zinc-400" /> Acción del Bot</label>
                  <select
                    value={rule.action}
                    onChange={(e) => onUpdateRule(rule.id, 'action', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/85 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="send_message">Iniciar Conversación / Respuesta</option>
                    <option value="assign_agent">Asignar a un Agente</option>
                    <option value="send_email">Enviar Correo Electrónico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                {rule.trigger === 'keyword' && rule.condition !== 'any' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Palabras clave (separadas por coma)</label>
                    <input
                      type="text"
                      value={rule.keywords}
                      onChange={(e) => onUpdateRule(rule.id, 'keywords', e.target.value)}
                      placeholder="Ej: información, aplicar, ayuda"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    {rule.action === 'send_message' ? 'Mensaje de respuesta automática' :
                     rule.action === 'assign_agent' ? 'ID del Agente de Reclutamiento' : 'Destinatario o Plantilla'}
                  </label>
                  <input
                    type="text"
                    value={rule.actionData}
                    onChange={(e) => onUpdateRule(rule.id, 'actionData', e.target.value)}
                    placeholder={
                      rule.action === 'send_message' ? "Introduce la respuesta automática..." :
                      rule.action === 'assign_agent' ? "Ej: ag-1" : "Ej: rh@empresa.com"
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 transition-colors"
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
  );
}
