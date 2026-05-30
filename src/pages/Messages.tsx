import React, { useState } from 'react';
import { Search, Filter, Phone, Video, MoreVertical, Paperclip, Send, Image as ImageIcon, Smile, Briefcase, Mail, MapPin, User, ChevronLeft, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDb } from '@/hooks/useDb';

export function Messages() {
  const { candidates, messages, addMessage, triggerAgentDialogue } = useDb();
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'whatsapp' | 'instagram' | 'messenger'>('all');

  // Group candidate messages into active chats dynamically
  const chats = candidates.map(cand => {
    const candMsgs = messages.filter(m => m.candidateId === cand.id);
    const lastMsg = candMsgs[candMsgs.length - 1];
    
    // Choose platform details based on source
    const sourceLower = cand.source.toLowerCase();
    let platform: 'whatsapp' | 'instagram' | 'messenger' = 'whatsapp';
    let avatarColor = 'bg-emerald-500';
    
    if (sourceLower.includes('inst') || sourceLower.includes('ig')) {
      platform = 'instagram';
      avatarColor = 'bg-pink-500';
    } else if (sourceLower.includes('mess') || sourceLower.includes('fb') || sourceLower.includes('face')) {
      platform = 'messenger';
      avatarColor = 'bg-blue-500';
    }

    return {
      id: cand.id,
      candidateId: cand.id,
      name: cand.name,
      platform,
      avatarColor,
      unread: 0,
      lastMessage: lastMsg ? lastMsg.body : "Sin mensajes. Haz clic para chatear.",
      lastMessageTime: lastMsg 
        ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : "N/A",
      rawLastMessageTime: lastMsg ? lastMsg.createdAt : 0,
      messages: candMsgs.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.body,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))
    };
  });

  // Sort chats: candidates with messages first, and sorted by newest message
  chats.sort((a, b) => b.rawLastMessageTime - a.rawLastMessageTime);

  const filteredChats = chats.filter(chat => {
    // Search match
    const matchesSearch = chat.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          chat.lastMessage.toLowerCase().includes(searchFilter.toLowerCase());
    
    // Platform match
    const matchesPlatform = selectedPlatform === 'all' || chat.platform === selectedPlatform;

    return matchesSearch && matchesPlatform;
  });

  const activeChat = filteredChats.find(c => c.id === activeChatId) || filteredChats[0] || null;
  const activeCandidate = activeChat ? candidates.find(c => c.id === activeChat.candidateId) : null;

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;

    const payload = {
      candidateId: activeChat.candidateId,
      channel: activeChat.platform,
      direction: "outbound" as const,
      body: messageInput.trim(),
      sender: "me",
      status: "sent" as const
    };

    setMessageInput('');
    await addMessage(payload);
  };

  // Trigger outbound AI dialogue prompt manually
  const handlePromptAgentDialogue = async () => {
    if (!activeChat || !activeCandidate) return;
    const assignedAgentId = activeCandidate.assignedAgentId || "agent-1";
    await triggerAgentDialogue(activeChat.candidateId, assignedAgentId, "Por favor habla con el candidato sobre oportunidades de Heavenly Dreams.");
  };

  if (candidates.length === 0) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center text-slate-500 font-mono text-xs">
        CONECTANDO CRM PRINCIPAL... CARGANDO CANDIDATOS...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 overflow-hidden">
      
      {/* Conversations List (Left) */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 glass-panel rounded-2xl border border-slate-700/50 flex flex-col shrink-0 transition-all z-20",
        !isSidebarOpen && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-white/5 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">Mensajes</h2>
            <button 
              onClick={handlePromptAgentDialogue}
              title="Solicitar que la IA asista esta conversación"
              className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] flex items-center gap-1.5"
            >
              <Smile className="w-3.5 h-3.5" />
              Auto IA
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar conversaciones..." 
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 styled-scrollbar">
            <button 
              onClick={() => setSelectedPlatform('all')}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                selectedPlatform === 'all' 
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" 
                  : "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}
            >
              Todos
            </button>
            <button 
              onClick={() => setSelectedPlatform('whatsapp')}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                selectedPlatform === 'whatsapp' 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}
            >
              WhatsApp
            </button>
            <button 
              onClick={() => setSelectedPlatform('instagram')}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                selectedPlatform === 'instagram' 
                  ? "bg-pink-500/20 text-pink-400 border-pink-500/30" 
                  : "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}
            >
              Instagram
            </button>
            <button 
              onClick={() => setSelectedPlatform('messenger')}
              className={cn(
                "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                selectedPlatform === 'messenger' 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                  : "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}
            >
              Messenger
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto styled-scrollbar">
          {filteredChats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); }}
              className={cn(
                "p-4 cursor-pointer transition-all border-b border-white/5 hover:bg-white/5 flex gap-3 relative",
                activeChat && activeChat.id === chat.id ? "bg-cyan-500/5 border-l-2 border-l-cyan-500" : "border-l-2 border-l-transparent"
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg relative", chat.avatarColor)}>
                {chat.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-baseline mb-1">
                  <span className={cn("font-semibold truncate text-sm", activeChat?.id === chat.id ? "text-cyan-400" : "text-white")}>
                    {chat.name}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">{chat.lastMessageTime}</span>
                </div>
                <div className="text-xs text-slate-400 truncate w-full flex items-center gap-1">
                  {chat.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area (Center) */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 glass-panel rounded-2xl border border-slate-700/50 transition-all",
        isSidebarOpen && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-slate-900/50 backdrop-blur-md rounded-t-2xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg hidden sm:flex", activeChat.avatarColor)}>
                  {activeChat.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-tight leading-tight">{activeChat.name}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#00AFFF] mt-0.5">Vía {activeChat.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 styled-scrollbar bg-gradient-to-b from-slate-900/10 to-slate-900/30">
              <div className="flex justify-center">
                <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase bg-slate-800/40 px-3 py-1 rounded-full border border-slate-700/50">
                  Historial de Comunicación
                </span>
              </div>
              
              {activeChat.messages.map((msg) => (
                <div key={msg.id} className={cn("flex max-w-[85%] sm:max-w-[70%]", msg.sender === 'me' ? "ml-auto justify-end" : "mr-auto justify-start")}>
                  <div className="flex flex-col gap-1">
                    <div className={cn(
                      "p-3 rounded-2xl shadow-sm text-sm relative group",
                      msg.sender === 'me' 
                        ? "bg-cyan-600 text-white rounded-tr-sm shadow-cyan-900/20" 
                        : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-black/20"
                    )}>
                      {msg.text}
                    </div>
                    <span className={cn(
                      "text-[9px] text-slate-500 font-mono px-1",
                      msg.sender === 'me' ? "text-right" : "text-left"
                    )}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Area */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/5 shrink-0 rounded-b-2xl">
              <div className="flex items-end gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-700/50 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner">
                <button className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all shrink-0 group">
                  <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <div className="flex-1 min-h-[44px] relative">
                  <textarea 
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    placeholder={`Enviar mensaje manual a ${activeChat.name}...`}
                    className="w-full bg-transparent border-none text-slate-200 focus:outline-none focus:ring-0 resize-none py-3 text-sm min-h-[44px] max-h-32 styled-scrollbar"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <button className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2.5 bg-cyan-500 text-slate-900 hover:bg-cyan-600 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] rounded-xl transition-all font-bold shrink-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-slate-500">
                <span>Presiona Enter para enviar, Shift + Enter para nueva línea</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
            SELECCIONA UNA CONVERSACIÓN
          </div>
        )}
      </div>

      {/* Contact Info Panel (Right) - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:flex w-80 glass-panel rounded-2xl border border-slate-700/50 flex-col shrink-0 overflow-y-auto styled-scrollbar">
        {activeChat && activeCandidate ? (
          <>
            <div className="p-6 flex flex-col items-center border-b border-white/5">
              <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-2xl text-white font-bold shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-4", activeChat.avatarColor)}>
                {activeChat.name.charAt(0)}
              </div>
              <h3 className="font-bold text-white text-lg">{activeChat.name}</h3>
              <p className="text-sm text-slate-400 text-center mb-4">{activeCandidate.role}</p>
              
              <div className="flex gap-2 overflow-x-auto pb-2 styled-scrollbar w-full justify-center">
                 <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-md border border-cyan-500/20">{activeCandidate.stage}</span>
                 {activeCandidate.rating && (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-md flex items-center gap-1 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    ★ {activeCandidate.rating}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Detalles del Candidato</h4>
                 
                 <div className="flex items-start gap-3">
                   <Briefcase className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                   <div>
                      <p className="text-xs text-slate-400 mb-0.5">Pretensión salarial</p>
                      <p className="text-sm text-white font-medium">{activeCandidate.salaryDemand || 'Abierto'}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-start gap-3">
                   <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                   <div>
                      <p className="text-xs text-slate-400 mb-0.5">Ubicación</p>
                      <p className="text-sm text-white font-medium">{activeCandidate.location}</p>
                   </div>
                 </div>

                 <div className="flex items-start gap-3">
                   <Mail className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                   <div>
                      <p className="text-xs text-slate-400 mb-0.5">Email</p>
                      <p className="text-xs text-white font-medium truncate">{activeCandidate.email}</p>
                   </div>
                 </div>
              </div>

              <div className="pt-2">
                 <button 
                  onClick={handlePromptAgentDialogue}
                  className="w-full bg-cyan-600/10 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                 >
                    <Smile className="w-4 h-4 animate-pulse text-cyan-400" /> Conversar vía IA Agente
                 </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-slate-500 font-mono text-xs">
            Sin selección de candidato para mapeo.
          </div>
        )}
      </div>
    </div>
  );
}
