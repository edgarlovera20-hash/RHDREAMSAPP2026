import { useState, useRef, useEffect } from 'react';
import { Bot, Plus, Search, BrainCircuit, Activity, Zap, MessageSquare, Briefcase, FileText, CheckCircle2, XCircle, Settings2, Code, Users, Download, Filter, Send, Copy, Loader2, Sparkles } from 'lucide-react';
import { MOCK_AGENTS, MOCK_PREBUILT_TEMPLATES, AGENT_LOGS } from '@/data/mockData';
import { AgentConfigModal } from '@/components/AgentConfigModal';

export function Agents() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [activeTab, setActiveTab] = useState<'agents' | 'templates' | 'memory'>('agents');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Sourcing');
  
  const [agentToConfig, setAgentToConfig] = useState<typeof MOCK_AGENTS[0] | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dirtyFields, setDirtyFields] = useState<{name?: boolean, role?: boolean}>({});

  // Chat state
  const [activeChatAgent, setActiveChatAgent] = useState<typeof MOCK_AGENTS[0] | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'agent', text: string}[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Code': return <Code className="w-6 h-6 text-cyan-400" />;
      case 'Briefcase': return <Briefcase className="w-6 h-6 text-cyan-400" />;
      case 'Users': return <Users className="w-6 h-6 text-cyan-400" />;
      default: return <Bot className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getFilteredLogs = () => {
    return AGENT_LOGS.filter(log => {
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
      channels: ['Email', 'LinkedIn'], // Default from checkbox visually
      memory: '0 GB',
      conversations: 0,
      successRate: '-',
      avatarColor: 'bg-indigo-500' // Generate a different color
    };
    
    setAgents([...agents, added]);
    setIsCreateModalOpen(false);
    setNewAgentName('');
    setActiveTab('agents');
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
      const res = await fetch('/api/gemini/agent/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: activeChatAgent.name,
          systemPrompt: activeChatAgent.systemPrompt || '',
          conversationHistory: chatMessages,
          userPrompt: userText
        })
      });
      const data = await res.json();
      if (data && data.reply) {
        setChatMessages(prev => [...prev, { role: 'agent', text: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'agent', text: "Lo siento, ha ocurrido un problema al procesar la respuesta del agente virtual." }]);
      }
    } catch (err) {
      console.error("Error communicating with agent:", err);
      setChatMessages(prev => [...prev, { role: 'agent', text: "Ocurrió un error al intentar comunicar con el agente virtual." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const openChat = (agent: typeof MOCK_AGENTS[0]) => {
    setActiveChatAgent(agent);
    setChatMessages([{ role: 'agent', text: `Hola, soy ${agent.name}. Estoy configurado como ${agent.role}. ¿En qué te puedo ayudar hoy? Explicame qué necesitas redactar, auditar o diseñar y me pondré a trabajar de inmediato.` }]);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" />
            Flota de Agentes AI
          </h1>
          <p className="text-slate-400 mt-1">Crea, entrena y monitorea los agentes de reclutamiento autónomo.</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Agente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/50 p-1 rounded-xl glass-panel w-fit border border-slate-700/50">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'agents' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Mis Agentes
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Plantillas
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'memory' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
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
                className={`glass-panel p-6 rounded-2xl flex flex-col border transition-all hover:-translate-y-1 group cursor-pointer ${activeChatAgent?.id === agent.id ? 'border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-cyan-500/5' : 'border-slate-700/50 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgba(34,211,238,0.05)]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${agent.avatarColor} shadow-lg`}>
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white tracking-tight">{agent.name}</h3>
                      <span className="text-xs text-slate-400">{agent.role}</span>
                    </div>
                  </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-xs font-semibold ${agent.status === 'Active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {agent.status === 'Active' ? 'Activo' : 'Borrador'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleAgentStatus(agent.id, e as any)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${agent.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-700'}`}
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
                      <p className="text-sm font-semibold text-cyan-400">{agent.successRate}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2 border-t border-slate-700/50 pt-4">
                  <button onClick={() => openChat(agent)} className="flex-1 py-1.5 text-sm font-medium text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Chatear
                  </button>
                  <button onClick={() => setAgentToConfig(agent)} className="flex-1 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:bg-white/5 rounded-lg">
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
            {MOCK_PREBUILT_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="relative glass-panel p-6 rounded-2xl border border-slate-700/50 flex flex-col group overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   {getIcon(tpl.icon)}
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-4">
                  {getIcon(tpl.icon)}
                </div>
                <h3 className="font-semibold text-white mb-2">{tpl.name}</h3>
                <p className="text-sm text-slate-400 mb-6 flex-1">{tpl.description}</p>
                <button className="w-full py-2 bg-slate-800 hover:bg-cyan-500 text-slate-200 hover:text-slate-900 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 hover:border-transparent">
                  <Plus className="w-4 h-4" /> Usar Plantilla
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Console / Memory Logs Tab */}
        {activeTab === 'memory' && (
          <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                <Activity className="w-4 h-4 text-cyan-400" /> Monitor en Tiempo Real
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                 <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs mr-2">
                   <Filter className="w-3 h-3 text-cyan-400 mr-1" />
                   <span className="text-slate-400 mr-1">Desde:</span>
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                   <span className="text-slate-500 mx-1">-</span>
                   <span className="text-slate-400 mr-1">Hasta:</span>
                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                   {(startDate || endDate) && (
                     <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-2 text-slate-400 hover:text-rose-400 transition-colors" title="Limpiar filtro">
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
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                 <span className="text-xs text-slate-400">Sistema Conectado</span>
              </div>
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
                      <span className="text-cyan-400 font-semibold">{log.agent}</span>
                      <span className="text-slate-300 ml-2">{log.action}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                       {log.type === 'outreach' && <MessageSquare className="w-3 h-3 text-blue-400" />}
                       {log.type === 'screening' && <FileText className="w-3 h-3 text-purple-400" />}
                       {log.type === 'match' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                       {log.type === 'learning' && <BrainCircuit className="w-3 h-3 text-amber-400" />}
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
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">Crear Agente Personalizado</h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Nombre del Agente <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  className={`w-full bg-slate-800 border ${dirtyFields.name && !newAgentName.trim() ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50' : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/50'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all font-medium`}
                  placeholder="Ej: Reclutador de React"
                  value={newAgentName}
                  onChange={e => {
                    setNewAgentName(e.target.value);
                    setDirtyFields(prev => ({...prev, name: true}));
                  }}
                  onBlur={() => setDirtyFields(prev => ({...prev, name: true}))}
                />
                {dirtyFields.name && !newAgentName.trim() && (
                   <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> El nombre del agente es obligatorio.</p>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Función Principal <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    list="agent-roles"
                    className={`w-full bg-slate-800 border ${dirtyFields.role && !newAgentRole.trim() ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50' : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/50'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all`}
                    value={newAgentRole}
                    onChange={e => {
                      setNewAgentRole(e.target.value);
                      setDirtyFields(prev => ({...prev, role: true}));
                    }}
                    onBlur={() => setDirtyFields(prev => ({...prev, role: true}))}
                    placeholder="Escribe o selecciona un rol..."
                  />
                  {dirtyFields.role && !newAgentRole.trim() && (
                    <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" /> La función principal es obligatoria.</p>
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

              <div>
                <label className="text-sm text-slate-300 block mb-1">Prompt / Personalidad base</label>
                <p className="text-xs text-slate-500 mb-2">Define cómo actuará y qué tono usará este agente.</p>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none font-mono text-sm leading-relaxed h-28"
                  placeholder="Actúa como un reclutador tech amigable pero directo. Tu objetivo es encontrar desarrolladores frontend con React."
                />
              </div>
              
               <div>
                  <label className="text-sm text-slate-300 mb-2 block">Memoria Asignada</label>
                  <div className="border border-slate-700/50 bg-slate-800/50 p-3 rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5 text-cyan-500" />
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
                        <input type="checkbox" className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500" />
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
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 text-slate-900" fill="currentColor" />
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
                    <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed font-sans ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none shadow-[0_4px_12px_rgba(6,182,212,0.15)]' : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-lg'}`}>
                      {msg.text}
                    </div>
                    {msg.role === 'agent' && (
                      <button
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="mt-1 p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-cyan-400 transition-all opacity-0 group-hover/msg:opacity-100 self-start shrink-0"
                        title="Copiar texto al portapapeles"
                      >
                        {copiedIndex === idx ? (
                          <span className="text-[10px] text-emerald-400 font-bold px-1 uppercase tracking-wider">¡Listo!</span>
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
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
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
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentMessage.trim() || isGenerating}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 p-2.5 rounded-xl transition-colors flex items-center justify-center shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {agentToConfig && (
        <AgentConfigModal agent={agentToConfig} onClose={() => setAgentToConfig(null)} />
      )}
    </div>
  );
}
