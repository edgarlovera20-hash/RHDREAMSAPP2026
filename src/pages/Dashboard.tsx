import { useState, useEffect } from "react";
import {
  Users, UserPlus, Briefcase, Clock, Activity, Cpu,
  AlertCircle, X, CheckCircle2, AlertTriangle, Info,
  Calendar, TrendingUp, TrendingDown, Minus, ChevronRight,
  BarChart2, Target, Award, ArrowUpRight,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Line, ComposedChart,
} from "recharts";
import { DigitalOceanBadge } from "@/components/DigitalOceanBadge";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDb } from "@/hooks/useDb";
import { cn } from "@/lib/utils";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";

const COLORS = ["#22d3ee", "#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"];

const getAlertColors = (type: string) => {
  switch (type) {
    case "success":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500/35", text: "text-emerald-400", icon: CheckCircle2, glow: "shadow-[0_0_20px_rgba(52,211,153,0.12)]" };
    case "warning":
      return { bg: "bg-amber-500/10", border: "border-amber-500/35", text: "text-amber-400", icon: AlertTriangle, glow: "shadow-[0_0_20px_rgba(251,191,36,0.12)]" };
    case "error":
      return { bg: "bg-red-500/10", border: "border-red-500/35", text: "text-red-400", icon: AlertCircle, glow: "shadow-[0_0_20px_rgba(239,68,68,0.12)]" };
    case "info":
    default:
      return { bg: "bg-cyan-500/10", border: "border-cyan-500/35", text: "text-cyan-400", icon: Info, glow: "shadow-[0_0_20px_rgba(34,211,238,0.12)]" };
  }
};

const CHART_TOOLTIP_STYLE = {
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  backgroundColor: "rgba(10,12,18,0.95)",
  color: "#e5e5e5",
  boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,211,238,0.08)",
  backdropFilter: "blur(20px)",
  fontFamily: "Inter, sans-serif",
  fontSize: "12px",
  padding: "10px 14px",
};

const EmptyChart = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
    <div className="w-12 h-12 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center">
      <BarChart2 className="w-5 h-5 text-slate-600" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-xs text-slate-700 mt-1">Los datos aparecerán cuando haya candidatos registrados</p>
    </div>
  </div>
);

export function Dashboard() {
  const { candidates, jobs, appointments } = useDb();
  const { notifications, markAsRead } = useNotifications();
  const unreadAlerts = notifications.filter((n) => !n.read).slice(0, 3);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const [selectedPreset, setSelectedPreset] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const uniqueCandidatesMap = new Map();
  candidates.forEach((c) => uniqueCandidatesMap.set(c.id, c));
  const dedupedCandidates = Array.from(uniqueCandidatesMap.values());

  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T23:59:59");

  const filteredCandidates = dedupedCandidates.filter((c) => {
    const ct = typeof c.createdAt === "number" ? c.createdAt : Number(c.createdAt || Date.now());
    return ct >= start.getTime() && ct <= end.getTime();
  });

  const totalCandidates = filteredCandidates.length;
  const newApplications = filteredCandidates.filter((c) => c.stage?.toLowerCase() === "nuevo").length;
  const activeJobs = jobs.filter((j) => j.status === "Active" || j.status === "Draft").length;
  const filteredAppointments = appointments.filter((a) => {
    if (!a.date) return false;
    const d = new Date(a.date + "T12:00:00");
    return d >= start && d <= end;
  });
  const scheduledCount =
    filteredAppointments.length > 0
      ? filteredAppointments.length
      : appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed").length;

  const hiredCount = filteredCandidates.filter((c) =>
    ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)
  ).length;

  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;

  const calculateAverageTimeToHire = (list: typeof filteredCandidates) => {
    const hired = list.filter((c) => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage));
    if (!hired.length) return 0;
    const total = hired.reduce((sum, c) => {
      const createdAt = typeof c.createdAt === "number" ? c.createdAt : Number(c.createdAt || Date.now());
      const updatedAt = typeof c.updatedAt === "number" ? c.updatedAt : Number(c.updatedAt || createdAt);
      return sum + Math.max(0, Math.round((updatedAt - createdAt) / 86400000));
    }, 0);
    return Math.round(total / hired.length);
  };

  const computedFunnelData = (() => {
    const stages = ["Nuevo", "Contactado", "Cita agendada", "Confirmó asistencia", "Entrevista realizada", "Contratado"];
    return stages.map((stage) => {
      let count = 0;
      if (stage === "Nuevo") count = filteredCandidates.length;
      else if (stage === "Contactado") count = filteredCandidates.filter((c) => c.stage !== "Nuevo" && c.stage !== "Rechazado").length;
      else if (stage === "Cita agendada") count = filteredCandidates.filter((c) => !["Nuevo", "Contactado", "Rechazado"].includes(c.stage)).length;
      else if (stage === "Confirmó asistencia") count = filteredCandidates.filter((c) => !["Nuevo", "Contactado", "Cita agendada", "Rechazado", "No asistió"].includes(c.stage)).length;
      else if (stage === "Entrevista realizada") count = filteredCandidates.filter((c) => ["Entrevista realizada", "Contratado", "DDO y bienvenida", "En capacitación"].includes(c.stage)).length;
      else if (stage === "Contratado") count = hiredCount;
      return { stage, count, conversion: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0 };
    });
  })();

  const computedPerformanceData = (() => {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    if (diffDays <= 8 || selectedPreset === "7d") {
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
        const e2 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
        const dc = filteredCandidates.filter((c) => { const ct = typeof c.createdAt === "number" ? c.createdAt : Number(c.createdAt || Date.now()); return ct >= s && ct <= e2; });
        return { name: `${days[d.getDay()]} ${d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}`, hires: dc.filter((c) => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length, timeToHire: calculateAverageTimeToHire(dc) };
      });
    }
    if (diffDays <= 32 || selectedPreset === "30d") {
      return Array.from({ length: 4 }, (_, i) => {
        const wStart = new Date(start.getTime() + i * 7 * 86400000).getTime();
        const wEnd = i === 3 ? end.getTime() : new Date(start.getTime() + (i + 1) * 7 * 86400000).getTime();
        const wc = filteredCandidates.filter((c) => { const ct = typeof c.createdAt === "number" ? c.createdAt : Number(c.createdAt || Date.now()); return ct >= wStart && ct <= wEnd; });
        return { name: `Sem ${i + 1}`, hires: wc.filter((c) => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length, timeToHire: calculateAverageTimeToHire(wc) };
      });
    }
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result = [];
    let m = start.getMonth(), y = start.getFullYear();
    while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
      const ms = new Date(y, m, 1).getTime(), me = new Date(y, m + 1, 0, 23, 59, 59).getTime();
      const mc = filteredCandidates.filter((c) => { const ct = typeof c.createdAt === "number" ? c.createdAt : Number(c.createdAt || Date.now()); return ct >= ms && ct <= me; });
      result.push({ name: `${months[m]} ${String(y).slice(-2)}`, hires: mc.filter((c) => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length, timeToHire: calculateAverageTimeToHire(mc) });
      m++; if (m > 11) { m = 0; y++; }
    }
    return result;
  })();

  const computedCandidatesPerJobData = jobs.map((job) => ({
    name: job.title,
    count: filteredCandidates.filter((c) => c.jobId === job.id || c.role?.toLowerCase() === job.title?.toLowerCase()).length,
  }));

  if (loading) {
    return (
      <div className="flex flex-col gap-5 w-full pb-8">
        <div className="h-36 rounded-2xl bg-zinc-900/60 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full pb-8">

      {/* Alerts */}
      {unreadAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {unreadAlerts.map((alert) => {
            const { bg, border, text, icon: Icon, glow } = getAlertColors(alert.type);
            return (
              <div key={alert.id} className={`${bg} border ${border} ${glow} p-3.5 rounded-xl flex items-start justify-between`}>
                <div className="flex gap-3 w-full pr-8">
                  <Icon className={`w-4.5 h-4.5 ${text} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold ${text}`}>{alert.title}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{alert.message}</p>
                  </div>
                </div>
                <button onClick={() => markAsRead(alert.id)} className="text-slate-500 hover:text-white transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-br from-[#0a1628] via-[#0d1117] to-[#0a0e1a]">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-7">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
              <Cpu className="w-3 h-3" /> Centro de Mando
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              Heavenly Dreams{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                Metrics
              </span>
            </h1>
            <p className="text-slate-500 mt-1.5 text-xs font-semibold uppercase tracking-[0.2em]">
              Autonomous Matching & Conversion Analysis
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick KPIs */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="text-center px-4 py-2.5 rounded-xl border border-white/6 bg-white/3">
                <div className="text-xl font-bold text-white font-mono">{conversionRate}%</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Conversión</div>
              </div>
              <div className="text-center px-4 py-2.5 rounded-xl border border-white/6 bg-white/3">
                <div className="text-xl font-bold text-white font-mono">{hiredCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Contratados</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
              System Active
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-white/6 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-lg border border-amber-400/25 bg-amber-400/8 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">Periodo</span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-lg border border-white/5 flex-wrap">
          {([
            { id: "7d", label: "7D" },
            { id: "30d", label: "30D" },
            { id: "90d", label: "90D" },
            { id: "all", label: "Todo" },
            { id: "custom", label: "Libre" },
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPreset(p.id);
                if (p.id !== "custom") {
                  const e2 = new Date();
                  const s = new Date();
                  if (p.id === "7d") s.setDate(e2.getDate() - 7);
                  else if (p.id === "30d") s.setDate(e2.getDate() - 30);
                  else if (p.id === "90d") s.setDate(e2.getDate() - 90);
                  else if (p.id === "all") s.setDate(e2.getDate() - 365);
                  setStartDateStr(s.toISOString().split("T")[0]);
                  setEndDateStr(e2.toISOString().split("T")[0]);
                }
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition-all duration-200",
                selectedPreset === p.id
                  ? "bg-cyan-400/15 text-cyan-200 border border-cyan-300/35 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-lg border border-white/5 ml-auto">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Desde</span>
          <input
            type="date"
            value={startDateStr}
            onChange={(e) => { setStartDateStr(e.target.value); setSelectedPreset("custom"); }}
            className="text-xs font-mono text-slate-300 bg-transparent border-0 outline-none w-[110px] [color-scheme:dark] cursor-pointer"
          />
          <span className="text-slate-700">–</span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hasta</span>
          <input
            type="date"
            value={endDateStr}
            onChange={(e) => { setEndDateStr(e.target.value); setSelectedPreset("custom"); }}
            className="text-xs font-mono text-slate-300 bg-transparent border-0 outline-none w-[110px] [color-scheme:dark] cursor-pointer"
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Candidatos",
            value: totalCandidates,
            sub: "Sincronizado Firestore",
            icon: Users,
            color: { accent: "cyan", text: "text-cyan-300", border: "border-cyan-400/20", bg: "from-cyan-950/50", iconBg: "bg-cyan-400/10 border-cyan-300/25", line: "bg-cyan-400", glow: "shadow-[0_0_40px_rgba(34,211,238,0.08)]" },
            trend: null,
          },
          {
            title: "Nuevas Aplicaciones",
            value: newApplications,
            sub: "En bandeja Nuevo",
            icon: Activity,
            color: { accent: "emerald", text: "text-emerald-300", border: "border-emerald-400/20", bg: "from-emerald-950/45", iconBg: "bg-emerald-400/10 border-emerald-300/25", line: "bg-emerald-400", glow: "shadow-[0_0_40px_rgba(52,211,153,0.08)]" },
            trend: null,
          },
          {
            title: "Ofertas Activas",
            value: activeJobs,
            sub: "Vacantes reales cargadas",
            icon: Briefcase,
            color: { accent: "violet", text: "text-violet-300", border: "border-violet-400/20", bg: "from-violet-950/45", iconBg: "bg-violet-400/10 border-violet-300/25", line: "bg-violet-400", glow: "shadow-[0_0_40px_rgba(167,139,250,0.08)]" },
            trend: null,
          },
          {
            title: "Citas en Agenda",
            value: scheduledCount,
            sub: "Entrevistas agendadas",
            icon: Clock,
            color: { accent: "amber", text: "text-amber-300", border: "border-amber-400/20", bg: "from-amber-950/40", iconBg: "bg-amber-400/10 border-amber-300/25", line: "bg-amber-400", glow: "shadow-[0_0_40px_rgba(251,191,36,0.08)]" },
            trend: null,
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-4",
                "bg-gradient-to-br to-zinc-950/95",
                stat.color.bg,
                stat.color.border,
                stat.color.glow,
                "transition-all duration-300 hover:scale-[1.015] hover:brightness-110 group cursor-default"
              )}
            >
              {/* Top accent line */}
              <div className={`absolute inset-x-0 top-0 h-[2px] ${stat.color.line} opacity-60`} />
              {/* Ambient glow */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: `var(--tw-gradient-from, currentColor)` }} />

              <div className="flex items-center justify-between relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] leading-tight">{stat.title}</p>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${stat.color.iconBg}`}>
                  <Icon className={`w-4 h-4 ${stat.color.text}`} />
                </div>
              </div>

              <div className="relative z-10">
                <div className="flex items-end gap-3">
                  <span className={cn(
                    "text-5xl font-bold font-mono leading-none tracking-tighter transition-all",
                    stat.value === 0 ? "text-zinc-600" : "text-white"
                  )}>
                    {stat.value === 0 ? "—" : stat.value}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 mt-3 ${stat.color.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stat.color.line} opacity-80`} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{stat.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tasa de Conversión", value: `${conversionRate}%`, icon: Target, color: "text-cyan-400" },
          { label: "Contratados", value: hiredCount, icon: Award, color: "text-emerald-400" },
          { label: "Tiempo Promedio", value: `${calculateAverageTimeToHire(filteredCandidates)}d`, icon: Clock, color: "text-violet-400" },
          { label: "Activos en proceso", value: filteredCandidates.filter(c => !["Contratado", "Rechazado", "No asistió"].includes(c.stage)).length, icon: TrendingUp, color: "text-amber-400" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-zinc-950/60 hover:bg-zinc-900/60 transition-colors group">
              <Icon className={`w-4 h-4 shrink-0 ${kpi.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              <div className="min-w-0">
                <div className={`text-lg font-bold font-mono leading-none ${kpi.value === "0" || kpi.value === "0d" || kpi.value === "0%" ? "text-zinc-600" : "text-white"}`}>
                  {kpi.value === "0" || kpi.value === "0d" || kpi.value === "0%" ? "—" : kpi.value}
                </div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1 truncate">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Funnel Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/12 bg-gradient-to-br from-cyan-950/30 to-zinc-950/90 p-6 flex flex-col group hover:border-cyan-400/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-cyan-400/6 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-sm bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Embudo de Conversión</h2>
            </div>
            <span className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider">%</span>
          </div>
          <div className="h-[300px] w-full relative z-10">
            {totalCandidates === 0 ? (
              <EmptyChart label="Sin candidatos en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={computedFunnelData} layout="vertical" margin={{ top: 0, right: 36, left: 48, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.025)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 10, fontWeight: 600 }} width={90} />
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.015)" }} />
                  <defs>
                    <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="count" fill="url(#funnelGrad)" radius={[0, 6, 6, 0]} barSize={20} name="Candidatos" />
                  <Line type="monotone" dataKey="conversion" stroke="#3f3f46" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 4, fill: "#18181b", strokeWidth: 2, stroke: "#52525b" }} activeDot={{ r: 6, fill: "#22d3ee", strokeWidth: 0 }} name="Conversión %" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-400/12 bg-gradient-to-br from-violet-950/30 to-zinc-950/90 p-6 flex flex-col group hover:border-violet-400/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-violet-400/6 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-sm bg-violet-300 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Candidatos por Oferta</h2>
            </div>
          </div>
          <div className="h-[300px] w-full relative z-10">
            {computedCandidatesPerJobData.every((d) => d.count === 0) || jobs.length === 0 ? (
              <EmptyChart label="Sin ofertas activas con candidatos" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={computedCandidatesPerJobData} cx="50%" cy="50%" innerRadius={72} outerRadius={110} paddingAngle={6} dataKey="count" stroke="none" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
                    {computedCandidatesPerJobData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.88} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          {jobs.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 relative z-10">
              {computedCandidatesPerJobData.slice(0, 6).map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Area Chart — full width */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/12 bg-gradient-to-br from-emerald-950/25 to-zinc-950/90 p-6 flex flex-col lg:col-span-2 group hover:border-emerald-400/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-400/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">Rendimiento de Contratación</h2>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400/50 rounded" />Contrataciones</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400/50 rounded" style={{ borderTop: "2px dashed" }} />Días</span>
            </div>
          </div>
          <div className="h-[300px] w-full relative z-10">
            {totalCandidates === 0 ? (
              <EmptyChart label="Sin datos de rendimiento en el periodo" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={computedPerformanceData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hiresGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.025)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#3f3f46", fontSize: 10, fontWeight: 600 }} dy={12} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#3f3f46", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#3f3f46", fontSize: 10 }} />
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area yAxisId="left" type="monotone" dataKey="hires" name="Contrataciones" stroke="#34d399" strokeWidth={2.5} fill="url(#hiresGrad)" activeDot={{ r: 5, fill: "#34d399", strokeWidth: 0 }} />
                  <Line yAxisId="right" type="monotone" dataKey="timeToHire" name="Tiempo (días)" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#0a0a0a", strokeWidth: 2, stroke: "#a78bfa" }} activeDot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <DigitalOceanBadge />
      </div>
    </div>
  );
}
