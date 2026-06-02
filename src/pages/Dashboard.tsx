import { useState } from "react";
import { Users, UserPlus, Briefcase, Clock, Activity, Cpu, AlertCircle, X, CheckCircle2, AlertTriangle, Info, Calendar, Filter } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, PieChart, Pie, Cell, Line, ComposedChart } from "recharts";
import { useNotifications } from "@/contexts/NotificationContext";
import { useDb } from "@/hooks/useDb";
import { cn } from "@/lib/utils";

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

const getAlertColors = (type: string) => {
  switch (type) {
    case 'success': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', icon: CheckCircle2, gradient: 'from-emerald-500/5' };
    case 'warning': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', icon: AlertTriangle, gradient: 'from-amber-500/5' };
    case 'error': return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500', icon: AlertCircle, gradient: 'from-rose-500/5' };
    case 'info':
    default: return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500', icon: Info, gradient: 'from-cyan-500/5' };
  }
};

export function Dashboard() {
  const { candidates, jobs, appointments } = useDb();
  const { notifications, markAsRead } = useNotifications();
  const unreadAlerts = notifications.filter(n => !n.read).slice(0, 3); // Módulos de alerta en el dashboard

  // Interactive filter states
  const [selectedPreset, setSelectedPreset] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const uniqueCandidatesMap = new Map();
  candidates.forEach(c => {
    uniqueCandidatesMap.set(c.id, c);
  });
  const dedupedCandidates = Array.from(uniqueCandidatesMap.values());

  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T23:59:59");

  // Dynamic filter logic
  const filteredCandidates = dedupedCandidates.filter(c => {
    const createTime = typeof c.createdAt === 'number' ? c.createdAt : Number(c.createdAt || Date.now());
    return createTime >= start.getTime() && createTime <= end.getTime();
  });

  const totalCandidates = filteredCandidates.length;
  const newApplications = filteredCandidates.filter(c => c.stage?.toLowerCase() === 'nuevo').length;
  const activeJobs = jobs.filter(j => j.status === 'Active' || j.status === 'Draft').length;

  // Filter appointments scheduled inside active timeframe
  const filteredAppointments = appointments.filter(a => {
    if (!a.date) return false;
    const apptDate = new Date(a.date + "T12:00:00");
    return apptDate >= start && apptDate <= end;
  });
  const scheduledCount = filteredAppointments.length > 0 ? filteredAppointments.length : appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
  const calculateAverageTimeToHire = (candidateList: typeof filteredCandidates) => {
    const hiredCandidates = candidateList.filter(c => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage));
    if (hiredCandidates.length === 0) return 0;

    const totalDays = hiredCandidates.reduce((sum, candidate) => {
      const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Number(candidate.createdAt || Date.now());
      const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Number(candidate.updatedAt || createdAt);
      return sum + Math.max(0, Math.round((updatedAt - createdAt) / (24 * 60 * 60 * 1000)));
    }, 0);

    return Math.round(totalDays / hiredCandidates.length);
  };

  // Compute Funnel Dataset Dynamically
  const computedFunnelData = (() => {
    const stagesToDisplay = ["Nuevo", "Contactado", "Cita agendada", "Confirmó asistencia", "Entrevista realizada", "Contratado"];
    const totalInFilter = filteredCandidates.length;

    return stagesToDisplay.map(stage => {
      let count = 0;
      if (stage === "Nuevo") {
        count = filteredCandidates.length;
      } else if (stage === "Contactado") {
        count = filteredCandidates.filter(c => c.stage !== "Nuevo" && c.stage !== "Rechazado").length;
      } else if (stage === "Cita agendada") {
        count = filteredCandidates.filter(c => !["Nuevo", "Contactado", "Rechazado"].includes(c.stage)).length;
      } else if (stage === "Confirmó asistencia") {
        count = filteredCandidates.filter(c => !["Nuevo", "Contactado", "Cita agendada", "Rechazado", "No asistió"].includes(c.stage)).length;
      } else if (stage === "Entrevista realizada") {
        count = filteredCandidates.filter(c => ["Entrevista realizada", "Contratado", "DDO y bienvenida", "En capacitación"].includes(c.stage)).length;
      } else if (stage === "Contratado") {
        count = filteredCandidates.filter(c => c.stage === "Contratado" || c.stage === "En capacitación" || c.stage === "DDO y bienvenida").length;
      }

      const conversion = totalInFilter > 0 ? Math.round((count / totalInFilter) * 100) : 0;

      return {
        stage,
        count,
        conversion
      };
    });
  })();

  // Compute Performance Trend Dynamically
  const computedPerformanceData = (() => {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays <= 8 || selectedPreset === "7d") {
      const result = [];
      const daysArr = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = daysArr[d.getDay()];
        const dateString = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const name = `${dayName} ${dateString}`;
        
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
        
        const dayCandidates = filteredCandidates.filter(c => {
          const ct = typeof c.createdAt === 'number' ? c.createdAt : Number(c.createdAt || Date.now());
          return ct >= startOfDay && ct <= endOfDay;
        });
        const hiresCount = dayCandidates.filter(c => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length;
        
        const baseTth = calculateAverageTimeToHire(dayCandidates);
        
        result.push({
          name,
          hires: hiresCount,
          timeToHire: baseTth
        });
      }
      return result;
    }
    
    if (diffDays <= 32 || selectedPreset === "30d") {
      const result = [];
      for (let i = 3; i >= 0; i--) {
        const name = `Semana ${4 - i}`;
        const wStart = new Date(start.getTime() + (3 - i) * 7 * 24 * 60 * 60 * 1000).getTime();
        const wEnd = i === 0 ? end.getTime() : new Date(start.getTime() + (4 - i) * 7 * 24 * 60 * 60 * 1000).getTime();
        
        const weekCandidates = filteredCandidates.filter(c => {
          const ct = typeof c.createdAt === 'number' ? c.createdAt : Number(c.createdAt || Date.now());
          return ct >= wStart && ct <= wEnd;
        });
        const hiresCount = weekCandidates.filter(c => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length;
        const baseTth = calculateAverageTimeToHire(weekCandidates);
        
        result.push({
          name,
          hires: hiresCount,
          timeToHire: baseTth
        });
      }
      return result;
    }
    
    const monthsEs = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const result = [];
    
    let currentMonth = start.getMonth();
    let currentYear = start.getFullYear();
    const endMonth = end.getMonth();
    const endYear = end.getFullYear();
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthName = monthsEs[currentMonth];
      const name = `${monthName} ${String(currentYear).slice(-2)}`;
      
      const mStart = new Date(currentYear, currentMonth, 1).getTime();
      const mEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
      
      const monthCandidates = filteredCandidates.filter(c => {
        const ct = typeof c.createdAt === 'number' ? c.createdAt : Number(c.createdAt || Date.now());
        return ct >= mStart && ct <= mEnd;
      });
      const hiresCount = monthCandidates.filter(c => ["Contratado", "En capacitación", "DDO y bienvenida"].includes(c.stage)).length;
      const baseTth = calculateAverageTimeToHire(monthCandidates);
      
      result.push({
        name,
        hires: hiresCount,
        timeToHire: baseTth
      });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    return result;
  })();

  // Compute Job Pie Chart Dynamically
  const computedCandidatesPerJobData = (() => {
    if (jobs.length === 0) {
      return [];
    }

    const distribution = jobs.map(job => {
      const count = filteredCandidates.filter(c => c.jobId === job.id || c.role?.toLowerCase() === job.title?.toLowerCase()).length;
      return {
        name: job.title,
        count
      };
    });

    return distribution;
  })();

  return (
    <div className="flex flex-col gap-6 w-full min-h-full pb-8">
      {unreadAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {unreadAlerts.map(alert => {
            const { bg, border, text, icon: Icon, gradient } = getAlertColors(alert.type);
            return (
              <div key={alert.id} className={`${bg} border ${border} p-3 rounded-xl flex items-start justify-between relative overflow-hidden group`}>
                <div className={`absolute inset-0 bg-gradient-to-r ${gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <div className="flex gap-3 relative z-10 w-full pr-8">
                  <Icon className={`w-5 h-5 ${text} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold ${text}`}>{alert.title}</h3>
                    <p className="text-sm text-slate-300 mt-1">{alert.message}</p>
                  </div>
                </div>
                <button onClick={() => markAsRead(alert.id)} className="text-slate-400 hover:text-white transition-colors relative z-10 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mt-2 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight">
             <Cpu className="w-8 h-8 text-cyan-400 shrink-0" />
             <span>Heavenly Dreams</span>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-bold">Metrics</span>
          </h1>
          <p className="text-slate-400 mt-2 font-light tracking-wide text-sm opacity-80 uppercase">Autonomous matching and conversion analysis</p>
        </div>
        <div className="hidden md:flex items-center gap-3 px-5 py-2.5 glass-panel rounded-full text-xs font-semibold uppercase tracking-widest text-emerald-400 border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          System Active
        </div>
      </div>

      {/* Dynamic Date Filter Toolbar */}
      <div className="flex min-h-[76px] flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-4 p-4 md:p-5 glass-panel rounded-2xl border border-white/5 bg-slate-900/45 shadow-lg relative overflow-visible group mb-6">
        <div className="absolute inset-y-0 left-0 w-2 rounded-l-2xl bg-gradient-to-b from-cyan-500 to-blue-500"></div>
        <div className="flex items-center gap-4 relative z-10 w-full min-w-0 2xl:max-w-[460px]">
          <div className="grid h-11 w-11 shrink-0 place-items-center border border-cyan-500/20 bg-cyan-500/10 rounded-xl">
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm md:text-base font-semibold tracking-wide text-slate-100 leading-tight">
              Rango de Tiempo
            </h4>
            <p className="text-xs md:text-sm text-slate-400 font-sans mt-1 leading-snug">Filtra métricas por rango específico o selecciona presets rápidos</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3 relative z-10 w-full 2xl:w-auto 2xl:justify-end">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/45 rounded-xl border border-white/5">
            {[
              { id: "7d", label: "7 Días" },
              { id: "30d", label: "30 Días" },
              { id: "90d", label: "90 Días" },
              { id: "all", label: "Todo" },
              { id: "custom", label: "Rango Libre" }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id as any);
                  if (preset.id !== "custom") {
                    const endPreset = new Date();
                    const startPreset = new Date();
                    if (preset.id === "7d") startPreset.setDate(endPreset.getDate() - 7);
                    else if (preset.id === "30d") startPreset.setDate(endPreset.getDate() - 30);
                    else if (preset.id === "90d") startPreset.setDate(endPreset.getDate() - 90);
                    else if (preset.id === "all") startPreset.setDate(endPreset.getDate() - 365); // 1 YEAR
                    
                    setStartDateStr(startPreset.toISOString().split("T")[0]);
                    setEndDateStr(endPreset.toISOString().split("T")[0]);
                  }
                }}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all border border-transparent whitespace-nowrap",
                  selectedPreset === preset.id 
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)] border-cyan-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/45 rounded-xl border border-white/5 py-2 px-3">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Desde</span>
            <input 
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setSelectedPreset("custom");
              }}
              className="text-xs font-mono text-slate-200 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer p-0 w-[115px] filter invert-[0.1]"
            />
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider ml-1">Hasta</span>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setSelectedPreset("custom");
              }}
              className="text-xs font-mono text-slate-200 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer p-0 w-[115px] filter invert-[0.1]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Candidatos", value: String(totalCandidates), subtitle: "Sincronizado Firestore", icon: Users, color: 'cyan' as const },
          { title: "Nuevas Aplicaciones", value: String(newApplications), subtitle: "En bandeja 'Nuevo'", icon: Activity, color: 'purple' as const },
          { title: "Ofertas Activas", value: String(activeJobs), subtitle: "Vacantes reales cargadas", icon: Briefcase, color: 'emerald' as const },
          { title: "Citas en Agenda", value: String(scheduledCount), subtitle: "Entrevistas agendadas", icon: Clock, color: 'rose' as const },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const styles = {
            cyan: { text: "text-cyan-400", bgLine: "via-cyan-500/40", shadow: "group-hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]", dot: "bg-cyan-400", hoverBorder: "hover:border-cyan-500/50" },
            purple: { text: "text-purple-400", bgLine: "via-purple-500/40", shadow: "group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]", dot: "bg-purple-400", hoverBorder: "hover:border-purple-500/50" },
            emerald: { text: "text-emerald-400", bgLine: "via-emerald-500/40", shadow: "group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]", dot: "bg-emerald-400", hoverBorder: "hover:border-emerald-500/50" },
            rose: { text: "text-rose-400", bgLine: "via-rose-500/40", shadow: "group-hover:drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]", dot: "bg-rose-400", hoverBorder: "hover:border-rose-500/50" },
          }[stat.color];

          return (
            <div key={i} className={`glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group ${styles.hoverBorder} transition-all duration-300`}>
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${styles.bgLine} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <div className="absolute -inset-20 bg-slate-900/0 group-hover:bg-slate-800/20 transition-colors pointer-events-none"></div>
              
              <div className="flex items-center justify-between pb-4 relative z-10">
                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">{stat.title}</p>
                <Icon className={`w-5 h-5 opacity-70 group-hover:opacity-100 transition-all ${styles.text} ${styles.shadow}`} />
              </div>
              
              <div className="relative z-10">
                <div className="text-4xl font-light text-white tracking-tighter font-mono">{stat.value}</div>
                <p className={`text-[10px] mt-3 font-semibold uppercase tracking-widest flex items-center gap-2 ${styles.text} opacity-80`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} /> {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div className="glass-panel p-8 rounded-2xl flex flex-col relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-32 bg-cyan-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <h2 className="text-[11px] font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-400 rounded-sm shadow-[0_0_8px_#22d3ee]"></span> Embudo y Tasa de Conversión (%)
          </h2>
          <div className="h-[320px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={computedFunnelData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' }} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(6,182,212,0.3)', backgroundColor: 'rgba(15, 17, 21, 0.9)', color: '#e2e8f0', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)', fontFamily: 'Inter', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="url(#cyanGradient)" radius={[0, 4, 4, 0]} barSize={24} name="Candidatos">
                  <defs>
                    <linearGradient id="cyanGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                </Bar>
                <Line type="monotone" dataKey="conversion" stroke="#a855f7" strokeWidth={3} dot={{ r: 5, fill: '#0F172A', strokeWidth: 2, stroke: '#a855f7' }} activeDot={{ r: 7, fill: '#a855f7', strokeWidth: 0, className: "drop-shadow-[0_0_12px_#a855f7]" }} name="Conversión %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <h2 className="text-[11px] font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 bg-indigo-400 rounded-sm shadow-[0_0_8px_#818cf8]"></span> Candidatos por Oferta Activa
          </h2>
          <div className="h-[320px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={computedCandidatesPerJobData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={10}
                  dataKey="count"
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {computedCandidatesPerJobData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer hover:opacity-90 transition-opacity" />
                  ))}
                </Pie>
                <RechartsTooltip 
                  itemStyle={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'Inter', fontSize: '12px' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)', backgroundColor: 'rgba(15, 17, 21, 0.9)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl flex flex-col lg:col-span-2 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-32 bg-sky-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          <h2 className="text-[11px] font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 bg-sky-400 rounded-sm shadow-[0_0_8px_#38bdf8]"></span> Rendimiento de Contratación (y Tiempo al Contratar)
          </h2>
          <div className="h-[340px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={computedPerformanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600, fontFamily: 'Inter' }} dy={15} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(14,165,233,0.3)', backgroundColor: 'rgba(15, 17, 21, 0.9)', color: '#e2e8f0', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)', fontFamily: 'Inter', fontSize: '12px' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="hires" name="Contrataciones" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHires)" activeDot={{ r: 6, fill: '#0ea5e9', strokeWidth: 0, className: "drop-shadow-[0_0_12px_#0ea5e9]" }} />
                <Line yAxisId="right" type="monotone" dataKey="timeToHire" name="Tiempo (días)" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#0F172A', strokeWidth: 2, stroke: '#8B5CF6' }} activeDot={{ r: 7, fill: '#8B5CF6', strokeWidth: 0, className: "drop-shadow-[0_0_12px_#8B5CF6]" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
