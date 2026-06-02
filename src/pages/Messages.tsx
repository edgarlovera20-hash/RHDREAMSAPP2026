import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Inbox,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDb } from "@/hooks/useDb";
import { apiFetch, readApiJson } from "@/lib/api";
import { Message } from "@/services/db";

const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    resolve(result.includes(",") ? result.split(",")[1] : result);
  };
  reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo de audio."));
  reader.readAsDataURL(file);
});

type ChannelFilter =
  | "all"
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "facebook"
  | "tiktok"
  | "indeed"
  | "computrabajo"
  | "email"
  | "webhook";

type InboxEvent = {
  id: string;
  source: string;
  channel: string;
  direction: "inbound" | "outbound";
  sender: string;
  body: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  createdAt: number;
  raw?: any;
};

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  createdAt: number;
  status?: Message["status"];
  conversationId?: string;
  messageRecord?: Message;
  aiGenerated?: boolean;
  aiConfidence?: number;
  intent?: string;
  attachmentType?: string;
  audioFileName?: string;
  transcription?: string;
  transcriptionStatus?: string;
};

type UnifiedChat = {
  id: string;
  candidateId?: string;
  name: string;
  platform: ChannelFilter;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  rawLastMessageTime: number;
  messages: ChatMessage[];
  sourceLabel: string;
  email?: string;
  phone?: string;
  role?: string;
  stage?: string;
  rating?: number;
  location?: string;
  emptyChannel?: boolean;
  agentPersonalName?: string;
  companyName?: string;
  leadProfile?: any;
};

const platformStyles: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "bg-emerald-500" },
  instagram: { label: "Instagram DM", color: "bg-pink-500" },
  messenger: { label: "Messenger", color: "bg-blue-500" },
  facebook: { label: "Facebook Leads", color: "bg-blue-600" },
  tiktok: { label: "TikTok Leads", color: "bg-cyan-500" },
  indeed: { label: "Indeed", color: "bg-indigo-500" },
  computrabajo: { label: "Computrabajo", color: "bg-sky-500" },
  email: { label: "Email", color: "bg-amber-500" },
  webhook: { label: "Webhook", color: "bg-violet-500" },
  manual: { label: "Manual", color: "bg-slate-500" },
};

const normalizeChannel = (value?: string): ChannelFilter => {
  const text = String(value || "").toLowerCase();
  if (text.includes("whatsapp") || text.includes("baileys")) return "whatsapp";
  if (text.includes("inst") || text.includes("ig")) return "instagram";
  if (text.includes("messenger")) return "messenger";
  if (text.includes("facebook") || text.includes("meta")) return "facebook";
  if (text.includes("tiktok")) return "tiktok";
  if (text.includes("indeed")) return "indeed";
  if (text.includes("computrabajo")) return "computrabajo";
  if (text.includes("mail") || text.includes("email") || text.includes("gmail")) return "email";
  if (text.includes("webhook") || text.includes("externo") || text.includes("formularios")) return "webhook";
  return "manual" as ChannelFilter;
};

const formatTime = (value?: number) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";

const readChannelAccounts = () => {
  try {
    const stored = localStorage.getItem("rhdreams_channel_accounts");
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

export function Messages() {
  const { candidates, messages, addMessage, triggerAgentDialogue, approveAiMessage, rejectAiMessage, loading } = useDb();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<ChannelFilter>("all");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [integrationInbox, setIntegrationInbox] = useState<InboxEvent[]>([]);
  const [channelAccounts, setChannelAccounts] = useState<any[]>(() => readChannelAccounts());
  const [localMessagesByChat, setLocalMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncAccounts = () => setChannelAccounts(readChannelAccounts());
    syncAccounts();
    window.addEventListener("storage", syncAccounts);
    window.addEventListener("focus", syncAccounts);
    return () => {
      window.removeEventListener("storage", syncAccounts);
      window.removeEventListener("focus", syncAccounts);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInbox = async () => {
      try {
        const response = await apiFetch("/api/integrations/inbox");
        const payload = await readApiJson(response);
        if (!cancelled) {
          setIntegrationInbox(Array.isArray(payload.data) ? payload.data : []);
          setInboxError("");
        }
      } catch (error: any) {
        if (!cancelled) {
          setInboxError(error.message || "No se pudo cargar la bandeja de integraciones.");
        }
      }
    };

    loadInbox();
    const interval = window.setInterval(loadInbox, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const chats = useMemo<UnifiedChat[]>(() => {
    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const grouped = new Map<string, UnifiedChat>();

    const ensureChat = (options: Partial<UnifiedChat> & { id: string; name: string; platform: ChannelFilter }) => {
      const existing = grouped.get(options.id);
      if (existing) return existing;

      const style = platformStyles[options.platform] || platformStyles.manual;
      const chat: UnifiedChat = {
        id: options.id,
        candidateId: options.candidateId,
        name: options.name,
        platform: options.platform,
        avatarColor: options.avatarColor || style.color,
        lastMessage: options.lastMessage || "Sin mensajes recibidos todavia.",
        lastMessageTime: options.lastMessageTime || "N/A",
        rawLastMessageTime: options.rawLastMessageTime || 0,
        messages: options.messages || [],
        sourceLabel: options.sourceLabel || style.label,
        email: options.email,
        phone: options.phone,
        role: options.role,
        stage: options.stage,
        rating: options.rating,
        location: options.location,
        emptyChannel: options.emptyChannel,
        agentPersonalName: options.agentPersonalName,
        companyName: options.companyName,
        leadProfile: options.leadProfile,
      };
      grouped.set(options.id, chat);
      return chat;
    };

    candidates.forEach((candidate) => {
      ensureChat({
        id: `candidate-${candidate.id}`,
        candidateId: candidate.id,
        name: candidate.name,
        platform: normalizeChannel(candidate.source),
        sourceLabel: candidate.source || "CRM",
        email: candidate.email,
        phone: candidate.phone || candidate.whatsapp,
        role: candidate.role,
        stage: candidate.stage,
        rating: candidate.rating,
        location: candidate.location,
      });
    });

    messages.forEach((message) => {
      const candidate = candidateMap.get(message.candidateId);
      const platform = normalizeChannel(message.channel || candidate?.source);
      const chat = ensureChat({
        id: candidate ? `candidate-${candidate.id}` : `message-${message.candidateId || message.sender || platform}`,
        candidateId: message.candidateId,
        name: candidate?.name || message.sender || "Contacto sin candidato",
        platform,
        sourceLabel: platformStyles[platform]?.label || String(message.channel || "CRM"),
        email: candidate?.email,
        phone: candidate?.phone || candidate?.whatsapp,
        role: candidate?.role,
        stage: candidate?.stage,
        rating: candidate?.rating,
        location: candidate?.location,
      });

      chat.messages.push({
        id: message.id,
        sender: message.sender,
        text: message.body,
        timestamp: formatTime(message.createdAt),
        createdAt: message.createdAt,
        status: message.status,
        conversationId: message.conversationId,
        messageRecord: message,
        aiGenerated: message.aiGenerated,
        aiConfidence: message.aiConfidence,
        intent: message.intent,
        attachmentType: message.attachmentType,
        audioFileName: message.audioFileName,
        transcription: message.transcription,
        transcriptionStatus: message.transcriptionStatus,
      });
    });

    integrationInbox.forEach((event) => {
      const platform = normalizeChannel(event.channel || event.source);
      const contactKey = event.candidateEmail || event.candidatePhone || event.sender || event.id;
      const leadProfile = event.raw?.lead;
      const matchingAccount = channelAccounts.find((account) => {
        const accountPlatform = normalizeChannel(account.type || account.mode || account.name);
        const isolationKey = account.isolationKey || account.phone?.replace(/^Sesion Baileys:\s*/i, "").trim();
        return accountPlatform === platform && (!event.source || isolationKey === event.source || account.name === event.source);
      });
      const chat = ensureChat({
        id: `integration-${platform}-${contactKey}`,
        name: event.candidateName || event.sender || platformStyles[platform]?.label || "Entrada externa",
        platform,
        sourceLabel: event.source || platformStyles[platform]?.label || "Integracion",
        email: event.candidateEmail,
        phone: event.candidatePhone,
        agentPersonalName: matchingAccount?.agentPersonalName,
        companyName: matchingAccount?.companyName,
        leadProfile,
        stage: leadProfile?.estatus,
        role: leadProfile?.vacante_interes,
        location: leadProfile?.ciudad,
      });

      if (leadProfile) {
        chat.leadProfile = {
          ...(chat.leadProfile || {}),
          ...leadProfile,
        };
        chat.name = leadProfile.nombre || chat.name;
        chat.stage = leadProfile.estatus || chat.stage;
        chat.role = leadProfile.vacante_interes || chat.role;
        chat.location = leadProfile.ciudad || chat.location;
        chat.phone = leadProfile.telefono || chat.phone;
        chat.email = leadProfile.correo || chat.email;
      }

      chat.messages.push({
        id: event.id,
        sender: event.direction === "outbound" ? "me" : "user",
        text: event.body,
        timestamp: formatTime(event.createdAt),
        createdAt: event.createdAt,
      });
    });

    channelAccounts.forEach((account) => {
      const platform = normalizeChannel(account.type || account.mode || account.name);
      ensureChat({
        id: `channel-${account.id}`,
        name: account.name || platformStyles[platform]?.label || "Canal conectado",
        platform,
        sourceLabel: account.mode || platformStyles[platform]?.label || "Canal",
        phone: account.phone,
        lastMessage: "Canal conectado. Esperando mensajes entrantes.",
        emptyChannel: true,
        agentPersonalName: account.agentPersonalName,
        companyName: account.companyName,
      });
    });

    Object.entries(localMessagesByChat).forEach(([chatId, localMessages]) => {
      const chat = grouped.get(chatId);
      if (!chat) return;
      chat.messages.push(...localMessages);
    });

    return Array.from(grouped.values())
      .map((chat) => {
        const orderedMessages = [...chat.messages].sort((a, b) => a.createdAt - b.createdAt);
        const last = orderedMessages[orderedMessages.length - 1];
        return {
          ...chat,
          messages: orderedMessages,
          lastMessage: last?.text || chat.lastMessage,
          lastMessageTime: last ? formatTime(last.createdAt) : chat.lastMessageTime,
          rawLastMessageTime: last?.createdAt || chat.rawLastMessageTime,
        };
      })
      .sort((a, b) => {
        if (a.rawLastMessageTime !== b.rawLastMessageTime) return b.rawLastMessageTime - a.rawLastMessageTime;
        return Number(a.emptyChannel) - Number(b.emptyChannel);
      });
  }, [candidates, messages, integrationInbox, channelAccounts, localMessagesByChat]);

  const totalsByChannel = useMemo(() => {
    const totals: Record<string, number> = {};
    chats.forEach((chat) => {
      totals[chat.platform] = (totals[chat.platform] || 0) + chat.messages.length;
    });
    return totals;
  }, [chats]);

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      chat.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchFilter.toLowerCase()) ||
      chat.sourceLabel.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesPlatform = selectedPlatform === "all" || chat.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  const activeChat = filteredChats.find((chat) => chat.id === activeChatId) || filteredChats[0] || null;
  const activeCandidate = activeChat?.candidateId ? candidates.find((candidate) => candidate.id === activeChat.candidateId) : null;
  const activeLead = activeChat?.leadProfile;

  const appendLocalMessage = (chatId: string, message: Omit<ChatMessage, "id" | "timestamp" | "createdAt">) => {
    const createdAt = Date.now();
    setLocalMessagesByChat((current) => ({
      ...current,
      [chatId]: [
        ...(current[chatId] || []),
        {
          ...message,
          id: `local-${createdAt}-${Math.random().toString(16).slice(2)}`,
          timestamp: formatTime(createdAt),
          createdAt,
        },
      ],
    }));
  };

  const sendExternalChatMessage = async (chat: UnifiedChat, body: string) => {
    if (chat.emptyChannel) {
      throw new Error("Selecciona una conversacion real de WhatsApp, no la tarjeta del canal.");
    }

    if (chat.platform === "whatsapp") {
      const response = await apiFetch("/api/integrations/baileys/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: chat.sourceLabel || "default",
          to: chat.phone || chat.email || chat.name,
          body,
        }),
      });
      await readApiJson(response);
      return;
    }

    appendLocalMessage(chat.id, {
      sender: "me",
      text: body,
    });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChat) return;
    if (activeChat.emptyChannel) {
      appendLocalMessage(activeChat.id, {
        sender: "system",
        text: "Este es solo el canal conectado. Selecciona el chat del contacto que escribio para responder.",
      });
      return;
    }

    const channel = (activeChat.platform === "email" || activeChat.platform === "messenger" || activeChat.platform === "instagram" || activeChat.platform === "whatsapp"
      ? activeChat.platform
      : "manual") as any;

    const payload = {
      candidateId: activeChat.candidateId,
      channel,
      direction: "outbound" as const,
      body: messageInput.trim(),
      sender: "me",
      status: "sent" as const,
    };

    setMessageInput("");
    if (activeChat.candidateId) {
      await addMessage(payload);
      return;
    }

    try {
      appendLocalMessage(activeChat.id, {
        sender: "me",
        text: payload.body,
      });
      await sendExternalChatMessage(activeChat, payload.body);
    } catch (error: any) {
      appendLocalMessage(activeChat.id, {
        sender: "system",
        text: `No se pudo enviar: ${error.message || "error de conexion"}`,
      });
    }
  };

  const handlePromptAgentDialogue = async () => {
    if (!activeChat || isAgentReplying) return;

    if (activeChat.emptyChannel) {
      appendLocalMessage(activeChat.id, {
        sender: "system",
        text: "Este es solo el canal conectado. La IA inicia cuando seleccionas una conversacion real con mensajes entrantes.",
      });
      return;
    }

    if (activeChat.candidateId && activeCandidate) {
      const assignedAgentId = activeCandidate.assignedAgentId || "agent-principal-1";
      setIsAgentReplying(true);
      try {
        await triggerAgentDialogue(
          activeChat.candidateId,
          assignedAgentId,
          "Responde al candidato segun su canal y etapa actual. Genera un mensaje autonomo, distinto, natural y breve. No uses plantillas, no copies mensajes establecidos y no repitas el mismo saludo."
        );
      } finally {
        setIsAgentReplying(false);
      }
      return;
    }

    if (activeChat.messages.length === 0) {
      appendLocalMessage(activeChat.id, {
        sender: "system",
        text: "Este canal esta conectado, pero aun no hay una conversacion real. Cuando llegue el primer WhatsApp de un candidato, la IA podra responder automaticamente.",
      });
      return;
    }

    const lastInbound = [...activeChat.messages].reverse().find((message) => message.sender !== "me")?.text || activeChat.lastMessage;
    setIsAgentReplying(true);
    try {
      const storedAgents = JSON.parse(localStorage.getItem("rhdreams_agents") || "[]");
      const principalAgent = Array.isArray(storedAgents)
        ? storedAgents.find((agent: any) => agent.id === "agent-principal-1" || agent.isPrincipal) || storedAgents[0]
        : null;
      const agentName = activeChat.agentPersonalName || principalAgent?.name || "Agente Principal 1";
      const companyName = activeChat.companyName || "Heavenly Dreams";
      const systemPrompt = `
Eres ${agentName}, agente personal de reclutamiento de ${companyName}.
Responde por ${platformStyles[activeChat.platform]?.label || activeChat.sourceLabel}.
Usa el nombre "${agentName}" como tu identidad conversacional para esta cuenta.
El contacto aun no esta vinculado a un candidato del CRM, asi que inicia conversacion, pide un dato a la vez y guia al candidato.
Trabaja en modo autonomo: crea cada mensaje desde cero segun el historial, sin plantillas ni textos preestablecidos.
Varia saludos, cierres, orden de preguntas y longitud para que no se sienta robotico.
No inventes horarios, salarios ni promesas de contratacion.
Si falta contexto, pregunta de forma breve.
Personalidad configurada: ${principalAgent?.personalityPrompt || principalAgent?.basePrompt || "Cercano, profesional y directo."}
      `.trim();

      const response = await apiFetch("/api/gemini/agent/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          systemPrompt,
          conversationHistory: activeChat.messages.map((message) => ({
            sender: message.sender === "me" ? "me" : "user",
            text: message.text,
          })),
          userPrompt: lastInbound,
        }),
      });
      const payload = await readApiJson(response);
      const reply = payload?.data?.reply || payload?.reply || "Hola, gracias por escribirnos. ¿Qué vacante te interesa?";
      appendLocalMessage(activeChat.id, {
        sender: "me",
        text: reply,
      });
      await sendExternalChatMessage(activeChat, reply);
    } catch (error: any) {
      appendLocalMessage(activeChat.id, {
        sender: "system",
        text: `No se pudo iniciar IA: ${error.message || "error de conexion"}`,
      });
    } finally {
      setIsAgentReplying(false);
    }
  };

  const handleApproveDraft = async (message: ChatMessage) => {
    if (!message.messageRecord) return;
    await approveAiMessage(message.messageRecord);
  };

  const handleRejectDraft = async (message: ChatMessage) => {
    if (!message.messageRecord) return;
    await rejectAiMessage(message.messageRecord, "Borrador IA rechazado desde la bandeja");
  };

  const handleInboundAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeChat?.candidateId) return;

    setIsProcessingAudio(true);
    try {
      const audioBase64 = await readFileAsBase64(file);
      await addMessage({
        candidateId: activeChat.candidateId,
        channel: activeChat.platform === "instagram" || activeChat.platform === "messenger" || activeChat.platform === "email" ? activeChat.platform : "whatsapp",
        direction: "inbound",
        body: `[Audio recibido: ${file.name}]`,
        sender: "user",
        status: "delivered",
        attachmentType: "audio",
        audioBase64,
        audioMimeType: file.type || "audio/mpeg",
        audioFileName: file.name,
        transcriptionStatus: "pending",
      } as any);
    } finally {
      setIsProcessingAudio(false);
      event.target.value = "";
    }
  };

  const filterButtons: Array<{ id: ChannelFilter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "facebook", label: "Facebook" },
    { id: "messenger", label: "Messenger" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "indeed", label: "Indeed" },
    { id: "computrabajo", label: "Computrabajo" },
    { id: "webhook", label: "Webhook" },
  ];

  return (
    <div className="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 overflow-hidden md:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(360px,430px)_minmax(520px,1fr)_minmax(280px,320px)] 2xl:grid-cols-[minmax(400px,480px)_minmax(620px,1fr)_minmax(300px,340px)]">
      <div
        className={cn(
          "min-h-0 w-full glass-panel rounded-2xl border border-slate-700/50 flex flex-col transition-all z-20",
          !isSidebarOpen && "hidden md:flex"
        )}
      >
        <div className="p-4 2xl:p-5 border-b border-white/5 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Bandeja de Entrada
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">Todos los canales en un solo inbox</p>
            </div>
            <button
              onClick={handlePromptAgentDialogue}
              disabled={!activeChat || isAgentReplying || Boolean(activeChat.emptyChannel)}
              title="Solicitar que la IA asista esta conversacion"
              className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-cyan-500/20 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Bot className="w-3.5 h-3.5" />
              Auto IA
            </button>
          </div>

          {inboxError && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {inboxError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Chats</p>
              <p className="text-lg font-bold text-white">{chats.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Mensajes</p>
              <p className="text-lg font-bold text-white">{chats.reduce((sum, chat) => sum + chat.messages.length, 0)}</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5">
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Canales</p>
              <p className="text-lg font-bold text-white">{Object.keys(totalsByChannel).length}</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar mensajes, canal o contacto..."
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
            />
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 styled-scrollbar">
            {filterButtons.map((button) => (
              <button
                key={button.id}
                onClick={() => setSelectedPlatform(button.id)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                  selectedPlatform === button.id
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                    : "bg-slate-800/50 text-slate-400 border-slate-700/50"
                )}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto styled-scrollbar">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "p-4 cursor-pointer transition-all border-b border-white/5 hover:bg-white/5 flex gap-3 relative",
                activeChat?.id === chat.id ? "bg-cyan-500/5 border-l-2 border-l-cyan-500" : "border-l-2 border-l-transparent"
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg", chat.avatarColor)}>
                {chat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-baseline mb-1">
                  <span className={cn("font-semibold truncate text-sm", activeChat?.id === chat.id ? "text-cyan-400" : "text-white")}>
                    {chat.name}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">{chat.lastMessageTime}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                    {platformStyles[chat.platform]?.label || chat.sourceLabel}
                  </span>
                  {chat.emptyChannel && <span className="text-[9px] text-slate-500">sin mensajes</span>}
                </div>
                <div className="text-xs text-slate-400 truncate w-full">{chat.lastMessage}</div>
              </div>
            </div>
          ))}

          {filteredChats.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-xs">
              No hay conversaciones para este filtro.
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 min-w-0 flex flex-col glass-panel rounded-2xl border border-slate-700/50 transition-all",
          isSidebarOpen && "hidden md:flex"
        )}
      >
        {activeChat ? (
          <>
            <div className="min-h-20 border-b border-white/5 flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0 bg-slate-900/50 backdrop-blur-md rounded-t-2xl">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg hidden sm:flex", activeChat.avatarColor)}>
                  {activeChat.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="max-w-[34ch] truncate font-semibold text-white tracking-tight leading-tight">{activeChat.name}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#00AFFF] mt-0.5">
                    Via {platformStyles[activeChat.platform]?.label || activeChat.sourceLabel}
                  </p>
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 styled-scrollbar bg-gradient-to-b from-slate-900/10 to-slate-900/30">
              <div className="flex justify-center">
                <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase bg-slate-800/40 px-3 py-1 rounded-full border border-slate-700/50">
                  Historial unificado de mensajes
                </span>
              </div>

              {activeChat.messages.length === 0 && (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-slate-500">
                  <Inbox className="mb-4 h-12 w-12 text-cyan-900" />
                  <p className="text-sm font-semibold text-slate-300">Esperando mensajes de este canal</p>
                  <p className="mt-1 max-w-sm text-xs">Cuando llegue un webhook, WhatsApp, Messenger, Instagram, TikTok, Indeed o Computrabajo, aparecera aqui.</p>
                </div>
              )}

              {activeChat.messages.map((msg) => (
                <div key={msg.id} className={cn("flex max-w-[85%] sm:max-w-[70%]", msg.sender === "me" ? "ml-auto justify-end" : "mr-auto justify-start")}>
                  <div className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "p-3 rounded-2xl shadow-sm text-sm relative group",
                        msg.status === "pending_approval" && "ring-1 ring-amber-400/60",
                        msg.sender === "me"
                          ? "bg-cyan-600 text-white rounded-tr-sm shadow-cyan-900/20"
                          : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-black/20"
                      )}
                    >
                      {msg.status === "pending_approval" && (
                        <div className="mb-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
                          <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                            <Bot className="h-3.5 w-3.5" />
                            Borrador IA pendiente de aprobación
                          </div>
                          <p className="mt-1 text-amber-100/80">
                            Intención: {msg.intent || "seguimiento"} · confianza: {Math.round((msg.aiConfidence || 0) * 100) || 82}%
                          </p>
                        </div>
                      )}
                      {msg.attachmentType === "audio" && (
                        <div className="mb-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
                          <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                            <Paperclip className="h-3.5 w-3.5" />
                            Audio entrante
                          </div>
                          <p className="mt-1 text-cyan-100/80">{msg.audioFileName || "Nota de voz"}</p>
                        </div>
                      )}
                      {msg.text}
                    </div>
                    <div className={cn("flex flex-wrap items-center gap-2 px-1", msg.sender === "me" ? "justify-end" : "justify-start")}>
                      <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                      {msg.status && msg.status !== "sent" && (
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          msg.status === "pending_approval"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : msg.status === "failed"
                              ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                              : "border-slate-600 bg-slate-800 text-slate-400"
                        )}>
                          {msg.status === "pending_approval" ? "requiere aprobación" : msg.status}
                        </span>
                      )}
                    </div>
                    {msg.status === "pending_approval" && msg.messageRecord && (
                      <div className="flex justify-end gap-2 px-1 pt-1">
                        <button
                          onClick={() => handleRejectDraft(msg)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-500/20"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleApproveDraft(msg)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/5 shrink-0 rounded-b-2xl">
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleInboundAudioUpload} />
              <div className="flex items-end gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-700/50 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-inner">
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isProcessingAudio || Boolean(activeChat.emptyChannel) || (!activeChat.candidateId && activeChat.platform !== "whatsapp")}
                  title="Subir audio entrante para transcribir"
                  className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all shrink-0 disabled:opacity-50"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder={activeChat.emptyChannel ? "Selecciona una conversacion real de WhatsApp para responder." : activeChat.candidateId ? `Enviar mensaje manual a ${activeChat.name}...` : activeChat.platform === "whatsapp" ? `Responder por WhatsApp a ${activeChat.name}...` : "Solo lectura: este canal necesita candidato vinculado o API oficial."}
                  disabled={Boolean(activeChat.emptyChannel) || (!activeChat.candidateId && activeChat.platform !== "whatsapp")}
                  className="flex-1 bg-transparent border-none text-slate-200 focus:outline-none focus:ring-0 resize-none py-3 text-sm min-h-[44px] max-h-32 styled-scrollbar disabled:text-slate-500"
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || Boolean(activeChat.emptyChannel) || (!activeChat.candidateId && activeChat.platform !== "whatsapp")}
                  className="p-2.5 bg-cyan-500 text-slate-900 hover:bg-cyan-600 rounded-xl transition-all font-bold shrink-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-1 px-2 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>{activeChat.emptyChannel ? "Canal conectado: espera o selecciona un contacto real" : activeChat.candidateId ? "Enter para enviar, Shift + Enter para nueva linea" : activeChat.platform === "whatsapp" ? "WhatsApp externo: puedes responder directo sin vincular candidato" : "Vincula este contacto a un candidato para responder desde CRM"}</span>
                <span>{loading ? "Sincronizando CRM..." : isProcessingAudio ? "Procesando audio..." : "Inbox actualizado cada 8 segundos"}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
            <Inbox className="mb-4 h-14 w-14 text-cyan-900" />
            <p className="text-sm font-semibold text-slate-300">Bandeja lista</p>
            <p className="mt-1 max-w-sm text-xs">Aun no hay mensajes recibidos. Los canales conectados, webhooks y conversaciones CRM apareceran aqui.</p>
          </div>
        )}
      </div>

      <div className="hidden min-h-0 w-full glass-panel rounded-2xl border border-slate-700/50 xl:flex flex-col overflow-y-auto styled-scrollbar">
        {activeChat ? (
          <>
            <div className="p-5 2xl:p-6 flex flex-col items-center border-b border-white/5">
              <div className={cn("w-16 h-16 2xl:w-20 2xl:h-20 rounded-2xl flex items-center justify-center text-2xl text-white font-bold shadow-[0_0_20px_rgba(0,0,0,0.2)] mb-4", activeChat.avatarColor)}>
                {activeChat.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-white text-base 2xl:text-lg text-center leading-tight">{activeChat.name}</h3>
              <p className="text-sm text-slate-400 text-center mb-4">{activeChat.role || activeChat.sourceLabel}</p>
              <div className="flex gap-2 overflow-x-auto pb-2 styled-scrollbar w-full justify-center">
                <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-md border border-cyan-500/20">
                  {platformStyles[activeChat.platform]?.label || activeChat.platform}
                </span>
                {activeChat.stage && (
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-md border border-slate-700">
                    {activeChat.stage}
                  </span>
                )}
                {activeChat.rating && (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-md border border-amber-500/20">
                    ★ {activeChat.rating}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
                  Detalles de la conversacion
                </h4>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Origen</p>
                    <p className="text-sm text-white font-medium">{activeChat.sourceLabel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Ubicacion</p>
                    <p className="text-sm text-white font-medium">{activeChat.location || "Sin dato"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Contacto</p>
                    <p className="text-xs text-white font-medium truncate">{activeChat.email || activeChat.phone || "Sin dato"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Mensajes</p>
                    <p className="text-sm text-white font-medium">{activeChat.messages.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
                <h4 className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                  Ficha del lead
                </h4>
                {[
                  ["Nombre", activeLead?.nombre || activeChat.name || "Pendiente"],
                  ["Telefono", activeLead?.telefono || activeChat.phone || "Sin dato"],
                  ["Edad", activeLead?.edad || "Pendiente"],
                  ["Ciudad", activeLead?.ciudad || activeChat.location || "Pendiente"],
                  ["Vacante", activeLead?.vacante_interes || activeChat.role || "Pendiente"],
                  ["Canal", activeLead?.canal || platformStyles[activeChat.platform]?.label || activeChat.platform],
                  ["Fecha", activeLead?.fecha_registro ? new Date(activeLead.fecha_registro).toLocaleDateString() : "Pendiente"],
                  ["Estado", activeLead?.estatus || activeChat.stage || "Nuevo"],
                  ["Reclutador", activeChat.agentPersonalName || "Agente IA"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
                    <span className="max-w-[170px] text-right text-xs font-semibold text-white break-words">{value}</span>
                  </div>
                ))}
                <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Notas IA</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {activeLead?.observaciones_ia || "Lead creado desde el canal. Esperando mas datos del candidato."}
                  </p>
                </div>
              </div>

              <button
                onClick={handlePromptAgentDialogue}
                disabled={!activeChat || isAgentReplying || Boolean(activeChat.emptyChannel)}
                className="w-full bg-cyan-600/10 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Bot className="w-4 h-4 text-cyan-400" /> {isAgentReplying ? "IA respondiendo..." : "Conversar via IA Agente"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-slate-500 font-mono text-xs">
            Sin seleccion de conversacion.
          </div>
        )}
      </div>
    </div>
  );
}
