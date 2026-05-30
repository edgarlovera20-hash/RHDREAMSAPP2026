import { useState } from "react";
import { Plus, Search, Smartphone, Shield, Zap, QrCode, Trash2, CheckCircle2, RotateCcw, X, SmartphoneNfc, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_AGENTS } from "@/data/mockData";

export function WhatsAppAccounts() {
  const [accounts, setAccounts] = useState([
    {
      id: "wa-1",
      name: "Soporte RH Principal",
      phone: "+1 555 123 4567",
      status: "connected",
      agentId: "ag-1",
      lastSync: "Hace 2 min"
    },
    {
      id: "wa-2",
      name: "Reclutamiento Tech",
      phone: "+34 600 111 222",
      status: "disconnected",
      agentId: "ag-2",
      lastSync: "Hace 1 hora"
    }
  ]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'info' | 'qr' | 'success'>('info');
  
  const [newAccountName, setNewAccountName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const [accountToUnlink, setAccountToUnlink] = useState<any>(null);
  const [accountToAutomate, setAccountToAutomate] = useState<any>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');
  
  // Advanced Rules State
  const [automationRules, setAutomationRules] = useState<any[]>([
    {
      id: 'rule-1',
      trigger: 'keyword',
      keywords: 'información, empleo, vacante',
      condition: 'contains',
      action: 'send_message',
      actionData: '¡Hola! Claro, te comparto la información de nuestras vacantes actuales.'
    }
  ]);

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
    acc.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    acc.phone.includes(searchFilter)
  );

  const startLinking = () => {
    if (!newAccountName || !selectedAgent) return;
    setModalStep('qr');
    // Simulate QR scan after 5 seconds
    setTimeout(() => {
      setModalStep('success');
      setTimeout(() => {
        handleCreateAccount();
      }, 1500);
    }, 5000);
  };

  const handleCreateAccount = () => {
    const added = {
      id: `wa-${Date.now()}`,
      name: newAccountName,
      phone: "+0 " + Math.floor(100000000 + Math.random() * 900000000).toString(),
      status: "connected",
      agentId: selectedAgent,
      lastSync: "Justo ahora"
    };
    setAccounts([...accounts, added]);
    setIsModalOpen(false);
    setModalStep('info');
    setNewAccountName('');
    setSelectedAgent('');
  };

  const confirmRemoveAccount = (account: any) => {
    setAccountToUnlink(account);
  };

  const removeAccount = () => {
    if (accountToUnlink) {
      setAccounts(accounts.filter(a => a.id !== accountToUnlink.id));
      setAccountToUnlink(null);
    }
  };

  const openAutomationConfig = (account: any) => {
    setAccountToAutomate(account);
    // Mock existing templates
    setWelcomeMessage('¡Hola! Bienvenido a nuestro proceso de selección. ¿En qué puedo ayudarte hoy?');
    setFollowUpMessage('Hola de nuevo, notamos que no hemos recibido respuesta. ¿Sigues interesado en la posición?');
  };

  const saveAutomationConfig = () => {
    // Logic to save would go here
    setAccountToAutomate(null);
  };

  const assignAgent = (accountId: string, agentId: string) => {
    setAccounts(accounts.map(a => a.id === accountId ? { ...a, agentId } : a));
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div style={{ fontFamily: 'Georgia' }}>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-2">Cuentas de WhatsApp</h1>
          <p className="text-slate-400">Escanea códigos QR para enlazar múltiples cuentas y asigalas a tus Agentes AI.</p>
        </div>
        <button 
          onClick={() => {
            setModalStep('info');
            setIsModalOpen(true);
          }}
          className="bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-50 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] uppercase tracking-wide">
          <QrCode className="w-4 h-4" />
          Enlazar Nueva Cuenta
        </button>
      </div>

      <div className="glass-panel p-2 rounded-xl flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 ml-2 text-slate-500" />
        <input 
          type="text" 
          placeholder="Buscar cuenta..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-transparent border-none outline-none focus:ring-0 text-white text-sm placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAccounts.map(account => (
          <div key={account.id} className="glass-panel rounded-2xl flex flex-col p-6 border border-slate-700/50 hover:border-emerald-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  account.status === 'connected' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" : "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                )}>
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-emerald-400 transition-colors">{account.name}</h3>
                  <p className="text-slate-400 text-sm font-mono">{account.phone}</p>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 flex items-center gap-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold",
                account.status === "connected" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              )}>
                {account.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                {account.status === "connected" ? "Conectado" : "Desconectado"}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Agente Asignado
                </label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors appearance-none"
                    value={account.agentId}
                    onChange={(e) => assignAgent(account.id, e.target.value)}
                  >
                    <option value="">-- Sin asignar --</option>
                    {MOCK_AGENTS.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-500">Última sincr: {account.lastSync}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openAutomationConfig(account)}
                    className="text-slate-500 hover:text-cyan-400 p-1.5 rounded-md hover:bg-cyan-500/10 transition-colors"
                    title="Configurar Mensajes Automáticos"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => confirmRemoveAccount(account)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
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
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500">
            <Smartphone className="w-12 h-12 mb-4 opacity-50" />
            <p>No se encontraron cuentas vinculadas.</p>
          </div>
        )}
      </div>

      {/* Link Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-md relative flex flex-col glass-panel shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {modalStep === 'info' && (
              <>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-6 flex items-center gap-2">
                   <SmartphoneNfc className="w-6 h-6 text-emerald-400" />
                   Vincular WhatsApp
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre Identificador</label>
                    <input 
                      type="text" 
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="Ej: Linea Reclutamiento Monterrey"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-cyan-400" /> 
                      Vincular con Agente AI
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                      >
                        <option value="">Selecciona un Agente...</option>
                        {MOCK_AGENTS.map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.name} - {agent.role}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-light">Este agente responderá automáticamente los mensajes de esta cuenta.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={startLinking}
                    disabled={!newAccountName || !selectedAgent}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generar Código QR
                  </button>
                </div>
              </>
            )}

            {modalStep === 'qr' && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Escanea el código QR</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-[280px]">Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este código.</p>
                
                <div className="bg-white p-4 rounded-2xl mb-8 relative">
                   <QrCode className="w-48 h-48 text-slate-900" />
                   {/* Scanning animation line */}
                   <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-400 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  Esperando conexión...
                </div>
              </div>
            )}

            {modalStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Cuenta Vinculada!</h3>
                <p className="text-slate-400">La cuenta ha sido conectada exitosamente y asignada al agente seleccionado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlink Confirmation Modal */}
      {accountToUnlink && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">¿Desvincular cuenta?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Estás a punto de desvincular la cuenta <strong className="text-white">{accountToUnlink.name}</strong> ({accountToUnlink.phone}). 
              El Agente AI ya no podrá responder mensajes en esta línea. 
              <br /><br />
              ¿Estás seguro de continuar?
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
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                Sí, Desvincular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automations Config Modal */}
      {accountToAutomate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-3xl relative glass-panel shadow-2xl flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setAccountToAutomate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Mensajería Automática Avanzada
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Configura automatizaciones y flujos para <span className="font-semibold text-emerald-400">{accountToAutomate.name}</span>. 
            </p>

            <div className="flex-1 overflow-y-auto pr-2 styled-scrollbar space-y-8">
              {/* Basic Automations Section */}
              <div className="space-y-6">
                <h4 className="text-white font-semibold flex items-center gap-2 border-b border-slate-800 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Mensajes Básicos
                </h4>
                <div>
                  <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
                    Mensaje de Bienvenida Automático
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Se envía a nuevos contactos o conversaciones entrantes por primera vez.</p>
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
                    Seguimiento Automático (Follow-up)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Se envía a candidatos que no han respondido en 48hs.</p>
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
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-500" />
                    Reglas de Automatización (Triggers & Workflows)
                  </h4>
                  <button 
                    onClick={addRule}
                    className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nueva Regla
                  </button>
                </div>
                
                <p className="text-xs text-slate-400">Define disparadores, condiciones y acciones específicas (Ej. Palabras clave para asignar agente o enviar respuestas).</p>

                <div className="space-y-4">
                  {automationRules.map((rule, idx) => (
                    <div key={rule.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
                      
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regla #{idx + 1}</span>
                         <button onClick={() => removeRule(rule.id)} className="text-slate-500 hover:text-rose-400 transition-colors p-1">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Trigger Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Trigger (Evento)</label>
                          <select 
                            value={rule.trigger}
                            onChange={(e) => updateRule(rule.id, 'trigger', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="keyword">Mensaje Entrante</option>
                            <option value="form">Envío de Formulario</option>
                            <option value="webhook">Evento de Webhook</option>
                          </select>
                        </div>
                        
                        {/* Condition Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Search className="w-3 h-3" /> Condition (Regla)</label>
                          <select 
                            value={rule.condition}
                            onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="contains">Contiene palabra clave</option>
                            <option value="exact">Coincidencia exacta</option>
                            <option value="any">Cualquier mensaje</option>
                          </select>
                        </div>

                        {/* Action Column */}
                        <div className="col-span-12 md:col-span-4 space-y-2">
                          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Action (Acción)</label>
                          <select 
                            value={rule.action}
                            onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="send_message">Iniciar Conversación / Respuesta</option>
                            <option value="assign_agent">Asignar a un Agente</option>
                            <option value="send_email">Enviar Correo Electrónico</option>
                          </select>
                        </div>
                      </div>

                      {/* Dynamic Inputs based on Trigger/Action */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                        {rule.trigger === 'keyword' && rule.condition !== 'any' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Palabras clave (separadas por coma)</label>
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
                          <label className="text-xs font-medium text-slate-400">
                            {rule.action === 'send_message' ? 'Mensaje de respuesta' : 
                             rule.action === 'assign_agent' ? 'ID del agente' : 'Destinatario o Plantilla'}
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
                    <div className="text-center p-8 bg-slate-800/30 border border-slate-700/50 rounded-xl border-dashed">
                      <p className="text-slate-500 text-sm">No hay reglas configuradas. Haz clic en 'Nueva Regla' para comenzar.</p>
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
                <CheckCircle2 className="w-4 h-4" /> Guardar Automatización
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
