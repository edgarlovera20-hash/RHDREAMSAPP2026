import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Mail, Calendar, FileSpreadsheet, FolderOpen, Users, Video,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Send,
  RefreshCw, LogIn, LogOut, Sparkles, ArrowRight, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type MsTab = "outlook" | "calendar" | "excel" | "onedrive" | "teams";

const MS_MODULES: { id: MsTab; name: string; icon: any; color: string; description: string; img: string }[] = [
  { id: "outlook",   name: "Outlook Mail",   icon: Mail,            color: "text-blue-400",    description: "Envía correos a candidatos desde tu cuenta corporativa de Outlook.",                          img: "/assets/workspace/outlook-mail.svg" },
  { id: "calendar",  name: "Calendar",        icon: Calendar,        color: "text-cyan-400",    description: "Agenda entrevistas y sincroniza eventos con tu calendario de Microsoft 365.",                  img: "/assets/workspace/outlook-calendar.svg" },
  { id: "excel",     name: "Excel Online",    icon: FileSpreadsheet, color: "text-green-400",   description: "Exporta e importa candidatos desde hojas de cálculo de OneDrive.",                            img: "/assets/workspace/excel.svg" },
  { id: "onedrive",  name: "OneDrive",        icon: FolderOpen,      color: "text-sky-400",     description: "Sube y comparte CVs, documentos y archivos del proceso de selección.",                        img: "/assets/workspace/onedrive.svg" },
  { id: "teams",     name: "Teams",           icon: Video,           color: "text-purple-400",  description: "Crea reuniones de Teams para entrevistas virtuales y recibe el link automáticamente.",         img: "/assets/workspace/teams.svg" },
];

function useMicrosoftAuth() {
  const [msToken, setMsToken]   = useState<string | null>(() => localStorage.getItem("ms_access_token"));
  const [msEmail, setMsEmail]   = useState<string | null>(() => localStorage.getItem("ms_email"));
  const [msName, setMsName]     = useState<string | null>(() => localStorage.getItem("ms_name"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token   = params.get("ms_access_token");
    const refresh = params.get("ms_refresh_token");
    const email   = params.get("ms_email");
    const name    = params.get("ms_name");
    if (token) {
      localStorage.setItem("ms_access_token",  token);
      localStorage.setItem("ms_refresh_token", refresh || "");
      localStorage.setItem("ms_email",         email   || "");
      localStorage.setItem("ms_name",          name    || "");
      setMsToken(token);
      setMsEmail(email);
      setMsName(name);
      window.history.replaceState({}, "", "/microsoft");
    }
  }, []);

  const signIn  = () => { window.location.href = "/api/auth/microsoft"; };
  const signOut = () => {
    ["ms_access_token","ms_refresh_token","ms_email","ms_name"].forEach(k => localStorage.removeItem(k));
    setMsToken(null); setMsEmail(null); setMsName(null);
  };

  return { msToken, msEmail, msName, signIn, signOut, isConnected: !!msToken };
}

export function MicrosoftHub() {
  const { triggerEvent } = useNotifications();
  const { msToken, msEmail, msName, signIn, signOut, isConnected } = useMicrosoftAuth();
  const [activeTab, setActiveTab] = useState<MsTab>("outlook");

  // ── Outlook ──────────────────────────────────────────────────────────────
  const [outlookTo,      setOutlookTo]      = useState("");
  const [outlookSubject, setOutlookSubject] = useState("");
  const [outlookBody,    setOutlookBody]    = useState("");
  const [sendingMail,    setSendingMail]    = useState(false);
  const [mailResult,     setMailResult]     = useState<{ ok: boolean; msg: string } | null>(null);

  const sendOutlookMail = async () => {
    if (!msToken || !outlookTo || !outlookSubject || !outlookBody) return;
    setSendingMail(true); setMailResult(null);
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: { Authorization: `Bearer ${msToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            subject: outlookSubject,
            body: { contentType: "HTML", content: outlookBody.replace(/\n/g, "<br/>") },
            toRecipients: [{ emailAddress: { address: outlookTo } }],
          },
          saveToSentItems: true,
        }),
      });
      if (res.ok || res.status === 202) {
        setMailResult({ ok: true, msg: "Correo enviado correctamente." });
        triggerEvent?.("ms_mail_sent", { to: outlookTo });
        setOutlookTo(""); setOutlookSubject(""); setOutlookBody("");
      } else {
        const err = await res.json();
        setMailResult({ ok: false, msg: err?.error?.message || "Error al enviar." });
      }
    } catch (e: any) {
      setMailResult({ ok: false, msg: e.message });
    } finally { setSendingMail(false); }
  };

  // ── Calendar ─────────────────────────────────────────────────────────────
  const [evtTitle,   setEvtTitle]   = useState("");
  const [evtDate,    setEvtDate]    = useState("");
  const [evtTime,    setEvtTime]    = useState("10:00");
  const [evtEmail,   setEvtEmail]   = useState("");
  const [evtDur,     setEvtDur]     = useState("60");
  const [creatingEvt,setCreatingEvt]= useState(false);
  const [evtResult,  setEvtResult]  = useState<{ ok: boolean; msg: string; link?: string } | null>(null);

  const createCalendarEvent = async () => {
    if (!msToken || !evtTitle || !evtDate) return;
    setCreatingEvt(true); setEvtResult(null);
    try {
      const start = new Date(`${evtDate}T${evtTime}:00`);
      const end   = new Date(start.getTime() + Number(evtDur) * 60000);
      const body: any = {
        subject: evtTitle,
        start:   { dateTime: start.toISOString(), timeZone: "America/Mexico_City" },
        end:     { dateTime: end.toISOString(),   timeZone: "America/Mexico_City" },
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      };
      if (evtEmail) body.attendees = [{ emailAddress: { address: evtEmail }, type: "required" }];

      const res  = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${msToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const link = data.onlineMeeting?.joinUrl || data.webLink;
        setEvtResult({ ok: true, msg: "Evento creado con Teams Meeting.", link });
        triggerEvent?.("ms_event_created", { title: evtTitle });
        setEvtTitle(""); setEvtDate(""); setEvtEmail("");
      } else {
        setEvtResult({ ok: false, msg: data?.error?.message || "Error al crear evento." });
      }
    } catch (e: any) {
      setEvtResult({ ok: false, msg: e.message });
    } finally { setCreatingEvt(false); }
  };

  // ── OneDrive ──────────────────────────────────────────────────────────────
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);

  const fetchDriveFiles = async () => {
    if (!msToken) return;
    setLoadingDrive(true);
    try {
      const res  = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children?$top=20&$orderby=lastModifiedDateTime desc", {
        headers: { Authorization: `Bearer ${msToken}` },
      });
      const data = await res.json();
      setDriveFiles(data.value || []);
    } catch { setDriveFiles([]); }
    finally { setLoadingDrive(false); }
  };

  useEffect(() => { if (isConnected && activeTab === "onedrive") fetchDriveFiles(); }, [activeTab, isConnected]);

  // ── Teams ─────────────────────────────────────────────────────────────────
  const [teams, setTeams]     = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const fetchTeams = async () => {
    if (!msToken) return;
    setLoadingTeams(true);
    try {
      const res  = await fetch("https://graph.microsoft.com/v1.0/me/joinedTeams", {
        headers: { Authorization: `Bearer ${msToken}` },
      });
      const data = await res.json();
      setTeams(data.value || []);
    } catch { setTeams([]); }
    finally { setLoadingTeams(false); }
  };

  useEffect(() => { if (isConnected && activeTab === "teams") fetchTeams(); }, [activeTab, isConnected]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/assets/integrations/microsoft.svg" alt="Microsoft" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white">Microsoft 365</h1>
            <p className="text-xs text-slate-400">Outlook · Calendar · Excel · OneDrive · Teams</p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">{msEmail || msName}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Desconectar
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "linear-gradient(white,white) padding-box, linear-gradient(135deg,#f25022,#7fba00,#00a4ef,#ffb900) border-box",
              border: "2px solid transparent",
              color: "#1a1a1a",
              boxShadow: "0 2px 12px rgba(0,164,239,0.3)",
            }}
          >
            <img src="/assets/integrations/microsoft.svg" alt="M" className="w-5 h-5" />
            <span style={{ background: "linear-gradient(90deg,#f25022,#00a4ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Conectar Microsoft 365
            </span>
          </button>
        )}
      </div>

      {/* Modules grid (disconnected state) */}
      {!isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MS_MODULES.map((mod) => (
            <div key={mod.id} className="glass-panel p-5 rounded-xl border border-white/8 opacity-60 group">
              <div className="flex items-center gap-4 mb-3">
                <img
                  src={mod.img}
                  alt={mod.name}
                  className="w-14 h-14 object-contain transition-all duration-300 drop-shadow-[0_4px_14px_rgba(0,0,0,0.4)] group-hover:scale-125 group-hover:-translate-y-1.5"
                  loading="lazy"
                />
                <span className="text-sm font-semibold text-slate-300">{mod.name}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 glass-panel p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-1">Autenticación segura con Microsoft</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecta tu cuenta Microsoft 365 con OAuth 2.0. Se solicitarán permisos para: correo, calendario, archivos y Teams.
                Tus credenciales nunca se almacenan en nuestros servidores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connected — Tab navigation + modules */}
      {isConnected && (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 border border-white/5 rounded-xl self-start">
            {MS_MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all",
                  activeTab === mod.id
                    ? "bg-blue-500/15 text-white shadow-[0_0_18px_rgba(59,130,246,0.2)] border border-blue-400/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <img src={mod.img} alt={mod.name} className={cn("w-6 h-6 object-contain transition-all duration-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]", activeTab === mod.id ? "scale-110 -translate-y-0.5" : "opacity-70")} loading="lazy" />
                {mod.name}
              </button>
            ))}
          </div>

          {/* ── OUTLOOK ── */}
          {activeTab === "outlook" && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Enviar correo por Outlook</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Para</label>
                  <input
                    type="email"
                    value={outlookTo}
                    onChange={e => setOutlookTo(e.target.value)}
                    placeholder="candidato@correo.com"
                    className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-400/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Asunto</label>
                  <input
                    type="text"
                    value={outlookSubject}
                    onChange={e => setOutlookSubject(e.target.value)}
                    placeholder="Invitación a entrevista — Heavenly Dreams"
                    className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-400/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mensaje</label>
                <textarea
                  value={outlookBody}
                  onChange={e => setOutlookBody(e.target.value)}
                  rows={5}
                  placeholder="Hola, te invitamos a una entrevista..."
                  className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-400/50 transition-colors resize-none"
                />
              </div>
              <button
                onClick={sendOutlookMail}
                disabled={sendingMail || !outlookTo || !outlookSubject || !outlookBody}
                className="self-start flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 text-blue-300 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              >
                {sendingMail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar por Outlook
              </button>
              {mailResult && (
                <div className={cn("flex items-center gap-2 text-xs p-3 rounded-xl border", mailResult.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300")}>
                  {mailResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {mailResult.msg}
                </div>
              )}
            </div>
          )}

          {/* ── CALENDAR ── */}
          {activeTab === "calendar" && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Agendar entrevista con Teams Meeting</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Título del evento</label>
                  <input type="text" value={evtTitle} onChange={e => setEvtTitle(e.target.value)} placeholder="Entrevista — Asesor Comercial" className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/50 transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Correo del candidato</label>
                  <input type="email" value={evtEmail} onChange={e => setEvtEmail(e.target.value)} placeholder="candidato@correo.com" className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/50 transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fecha</label>
                  <input type="date" value={evtDate} onChange={e => setEvtDate(e.target.value)} className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50 transition-colors" />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Hora</label>
                    <input type="time" value={evtTime} onChange={e => setEvtTime(e.target.value)} className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Duración</label>
                    <select value={evtDur} onChange={e => setEvtDur(e.target.value)} className="bg-slate-900/80 border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none">
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={createCalendarEvent}
                disabled={creatingEvt || !evtTitle || !evtDate}
                className="self-start flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              >
                {creatingEvt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                Crear evento con Teams Meeting
              </button>
              {evtResult && (
                <div className={cn("flex items-start gap-2 text-xs p-3 rounded-xl border", evtResult.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300")}>
                  {evtResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div>
                    <p>{evtResult.msg}</p>
                    {evtResult.link && (
                      <a href={evtResult.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 font-bold underline">
                        Abrir Teams Meeting <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXCEL (placeholder) ── */}
          {activeTab === "excel" && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center gap-4 min-h-[220px] text-center">
              <FileSpreadsheet className="w-10 h-10 text-green-400 opacity-60" />
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">Excel Online — Próximamente</p>
                <p className="text-xs text-slate-500">Exporta e importa candidatos desde hojas de OneDrive Business. Disponible en la próxima actualización.</p>
              </div>
            </div>
          )}

          {/* ── ONEDRIVE ── */}
          {activeTab === "onedrive" && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-sky-400" />
                  <h2 className="text-base font-bold text-white">OneDrive — Archivos recientes</h2>
                </div>
                <button onClick={fetchDriveFiles} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  {loadingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Actualizar
                </button>
              </div>
              {driveFiles.length === 0 && !loadingDrive && (
                <p className="text-xs text-slate-500 text-center py-8">No se encontraron archivos o no tienes permisos de OneDrive.</p>
              )}
              <div className="flex flex-col gap-2">
                {driveFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-white/5 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-xs text-slate-200 truncate">{f.name}</span>
                    </div>
                    <a href={f.webUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TEAMS ── */}
          {activeTab === "teams" && (
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">Teams — Equipos conectados</h2>
                </div>
                <button onClick={fetchTeams} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  {loadingTeams ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Actualizar
                </button>
              </div>
              {teams.length === 0 && !loadingTeams && (
                <p className="text-xs text-slate-500 text-center py-8">No se encontraron equipos. Verifica permisos de Teams en tu cuenta Microsoft.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-900/60 rounded-xl border border-purple-500/10 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-white truncate">{t.displayName}</p>
                    {t.description && <p className="text-xs text-slate-400 truncate">{t.description}</p>}
                    <span className="mt-1 self-start text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Teams</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
