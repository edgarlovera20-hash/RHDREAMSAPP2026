import { useState } from "react";
import { Plus, Search, Smartphone, Shield, Zap, QrCode, Trash2, CheckCircle2, RotateCcw, X, SmartphoneNfc, MessageSquare, Clock, Facebook, Instagram, Video, Loader2, Settings2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_AGENTS } from "@/data/mockData";

export function WhatsAppAccounts() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'facebook' | 'instagram' | 'tiktok'>('whatsapp');
  
  const [accounts, setAccounts] = useState([
    {
      id: "wa-1",
      name: "Soporte RH Principal",
      phone: "+1 555 123 4567",
      status: "connected",
      agentId: "ag-1",
      lastSync: "Hace 2 min",
      type: "whatsapp"
    },
    {
      id: "wa-2",
      name: "Reclutamiento Tech",
      phone: "+34 600 111 222",
      status: "disconnected",
      agentId: "ag-2",
      lastSync: "Hace 1 hora",
      type: "whatsapp"
    },
    {
      id: "fb-1",
      name: "Página Oficial Facebook - Reclutamiento",
      phone: "ID: pg_38291048",
      status: "connected",
      agentId: "ag-1",
      lastSync: "Hace 5 min",
      type: "facebook"
    },
    {
      id: "ig-1",
      name: "Instagram Business @DreamsTalent",
      phone: "ID: ig_84712048",
      status: "connected",
      agentId: "ag-2",
      lastSync: "Hace 10 min",
      type: "instagram"
    },
    {
      id: "tt-1",
      name: "Campañas TikTok @rhabundancia",
      phone: "ID: tt_94225011",
      status: "connected",
      agentId: "ag-1",
      lastSync: "Hace 15 min",
      type: "tiktok"
    }
  ]);

  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'info' | 'qr' | 'oauth_connecting' | 'success'>('info');
  
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
    acc.type === activeTab &&
    (acc.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
     acc.phone.includes(searchFilter))
  );

  const startLinking = () => {
    if (!newAccountName || !selectedAgent) return;
    
    if (activeTab === 'whatsapp') {
      setModalStep('qr');
      setTimeout(() => {
        setModalStep('success');
        setTimeout(() => {
          handleCreateAccount();
        }, 1500);
      }, 3500);
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
    if (activeTab === 'whatsapp') {
      phoneIdText = "+0 " + Math.floor(100000000 + Math.random() * 900000000).toString();
    } else if (activeTab === 'facebook') {
      phoneIdText = `ID: pg_${Math.floor(10000000 + Math.random() * 90000000)}`;
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
      type: activeTab
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
    setWelcomeMessage(`¡Hola! Gracias por comunicarte con nuestro equipo a través de ${getPlatformLabel(account.type)}. ¿En qué posición o vacante estás interesado para enviarte toda la información pertinente?`);
    setFollowUpMessage('Hola de nuevo, detectamos que no hemos recibido respuesta. ¿Pudiste revisar el formulario? Si tienes dudas házmelo saber.');
  };

  const saveAutomationConfig = () => {
    setAccountToAutomate(null);
  };

  const assignAgent = (accountId: string, agentId: string) => {
    setAccounts(accounts.map(a => a.id === accountId ? { ...a, agentId } : a));
  };

  const getPlatformLabel = (type: string) => {
    switch(type) {
      case 'whatsapp': return 'WhatsApp';
      case 'facebook': return 'Facebook Messenger';
      case 'instagram': return 'Instagram DM';
      case 'tiktok': return 'TikTok Leads';
      default: return 'Canal';
    }
  };

  const getPlatformColor = (type: string) => {
    switch(type) {
      case 'whatsapp': return 'text-emerald-400 border-emerald-500/30';
      case 'facebook': return 'text-blue-400 border-blue-500/30';
      case 'instagram': return 'text-pink-400 border-pink-500/30';
      case 'tiktok': return 'text-cyan-400 border-cyan-500/30';
      default: return 'text-slate-400 border-slate-700';
    }
  };

  const getPlatformIcon = (type: string) => {
    switch(type) {
      case 'whatsapp': return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-400" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-400" />;
      case 'tiktok': return <Video className="w-5 h-5 text-cyan-400" />;
      default: return <Smartphone className="w-5 h-5" />;
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
            setIsModalOpen(true);
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] uppercase tracking-wide border",
            activeTab === 'whatsapp' ? "bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-250" :
            activeTab === 'facebook' ? "bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/40 text-blue-250" :
            activeTab === 'instagram' ? "bg-pink-600/20 border-pink-500/50 hover:bg-pink-600/40 text-pink-250" :
            "bg-cyan-600/20 border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-250"
          )}
        >
          {activeTab === 'whatsapp' ? <QrCode className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Enlazar nuevo {getPlatformLabel(activeTab)}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-slate-900/60 border border-white/5 rounded-xl self-start">
        {[
          { id: 'whatsapp', name: 'WhatsApp Business', icon: Smartphone, color: 'text-emerald-400' },
          { id: 'facebook', name: 'Facebook Messenger', icon: Facebook, color: 'text-blue-400' },
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
            <tab.icon className={cn("w-4 h-4", tab.color)} />
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

      {/* Main Grid Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAccounts.map(account => (
          <div 
            key={account.id} 
            className={cn(
              "glass-panel rounded-2xl flex flex-col p-6 border transition-all duration-300 group hover:scale-[1.01] hover:shadow-xl",
              account.status === 'connected' ? "hover:border-cyan-500/30 border-white/5" : "border-rose-500/20"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                  account.status === 'connected' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                )}>
                  {getPlatformIcon(account.type)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-cyan-300 transition-colors">{account.name}</h3>
                  <p className="text-slate-450 text-xs font-mono">{account.phone}</p>
                </div>
              </div>
              <div className={cn(
                "px-2 py-0.5 flex items-center gap-1 rounded-full text-[9px] uppercase tracking-wider font-bold border",
                account.status === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {account.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                {account.status === "connected" ? "Conectado" : "Desvinculado"}
              </div>
            </div>

            {/* Campaign info section dynamically shown per platform */}
            <div className="mb-4 bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Modo de Captura</div>
              <p className="text-xs text-slate-300 font-light">
                {account.type === 'whatsapp' && "Chat bidireccional directo e interrogación de perfil por WhatsApp Business."}
                {account.type === 'facebook' && "Sustracción directa de respuestas desde Lead Ads y auto-respuesta vía Messenger."}
                {account.type === 'instagram' && "Respuestas instantáneas en DMs para candidatos que envíen 'EMPLEO'."}
                {account.type === 'tiktok' && "Lectura automática de formularios de registro y confirmación con agente de IA."}
              </p>
            </div>

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
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-md relative flex flex-col glass-panel shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {modalStep === 'info' && (
              <>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 flex items-center gap-2">
                   {getPlatformIcon(activeTab)}
                   Vincular {getPlatformLabel(activeTab)}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre Identificador</label>
                    <input 
                      type="text" 
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-505 transition-all"
                      placeholder={
                        activeTab === 'whatsapp' ? "Ej: Línea Reclutamiento Monterrey" :
                        activeTab === 'facebook' ? "Ej: FanPage Reclutamiento México" :
                        activeTab === 'instagram' ? "Ej: Cuenta IG @TalentDream" : "Ej: Campaña TikTok Lead Ads 2026"
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> 
                      Vincular con Agente AI
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
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
                    <p className="text-xs text-slate-500 mt-2 font-light">Este agente responderá de forma inteligente las interacciones provenientes de este canal.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={startLinking}
                    disabled={!newAccountName || !selectedAgent}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activeTab === 'whatsapp' ? 'Generar Código QR' : 'Conectar con API Externa'}
                  </button>
                </div>
              </>
            )}

            {modalStep === 'qr' && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Escanea el código QR</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-[280px]">Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este código para terminar de enlazar.</p>
                
                <div className="bg-white p-4 rounded-2xl mb-8 relative">
                   <QrCode className="w-48 h-48 text-slate-900" />
                   <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>

                <div className="flex items-center gap-2 text-sm text-cyan-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Esperando conexión desde tu dispositivo móvil...
                </div>
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
                  <h3 className="text-xl font-bold text-white mb-1">Verificando Credenciales de API</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Estableciendo túnel seguro y concediendo permisos de webhook para {getPlatformLabel(activeTab)} de forma automática...</p>
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
                <p className="text-slate-400 text-sm">La integración con {getPlatformLabel(activeTab)} se ha activado exitosamente y fue vinculada con el Agente AI.</p>
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
