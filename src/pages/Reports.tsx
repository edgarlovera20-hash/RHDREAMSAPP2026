import { Building, Filter, LayoutDashboard, Users, PieChart, TrendingUp, Calendar, Zap, MapPin, Megaphone, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDb } from "@/hooks/useDb";
import { CDMX_RECRUITMENT_PLAN, OFFICE_LOCATION } from "@/data/recruitmentPlan";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, LineChart, Line, ComposedChart, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#737373', '#737373', '#737373', '#737373', '#737373', '#64748b'];

export function Reports() {
  const { candidates, jobs } = useDb();
  const hiredStages = ["Contratado", "En capacitación", "DDO y bienvenida"];
  const totalCandidates = candidates.length;
  const hiredCandidates = candidates.filter((candidate) => hiredStages.includes(candidate.stage));
  const averageTimeToHire = hiredCandidates.length
    ? Math.round(hiredCandidates.reduce((sum, candidate) => {
        const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Number(candidate.createdAt || Date.now());
        const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Number(candidate.updatedAt || createdAt);
        return sum + Math.max(0, Math.round((updatedAt - createdAt) / (24 * 60 * 60 * 1000)));
      }, 0) / hiredCandidates.length)
    : 0;
  const conversionRate = totalCandidates > 0 ? Number(((hiredCandidates.length / totalCandidates) * 100).toFixed(1)) : 0;
  const funnelData = ["Nuevo", "Contactado", "Cita agendada", "Confirmó asistencia", "Entrevista realizada", "Contratado"].map((stage) => ({
    stage,
    count: candidates.filter((candidate) => stage === "Contratado" ? hiredStages.includes(candidate.stage) : candidate.stage === stage).length,
  }));
  const performanceData = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    const monthCandidates = candidates.filter((candidate) => {
      const createdAt = new Date(typeof candidate.createdAt === "number" ? candidate.createdAt : Number(candidate.createdAt || 0));
      return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
    });
    const monthHires = monthCandidates.filter((candidate) => hiredStages.includes(candidate.stage));
    const tth = monthHires.length
      ? Math.round(monthHires.reduce((sum, candidate) => {
          const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Number(candidate.createdAt || Date.now());
          const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : Number(candidate.updatedAt || createdAt);
          return sum + Math.max(0, Math.round((updatedAt - createdAt) / (24 * 60 * 60 * 1000)));
        }, 0) / monthHires.length)
      : 0;

    return { name: month, hires: monthHires.length, timeToHire: tth };
  });
  const sourceDistribution = Object.entries(candidates.reduce<Record<string, number>>((acc, candidate) => {
    const source = candidate.source || "Sin fuente";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {})).map(([name, count]) => ({ name, count }));

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // Funnel Data
    csvContent += "=== Embudo de Conversión ===\n";
    csvContent += "Fase,Cantidad\n";
    funnelData.forEach(row => {
      csvContent += `${row.stage},${row.count}\n`;
    });
    
    // Performance Data
    csvContent += "\n=== Rendimiento Histórico ===\n";
    csvContent += "Mes,Contrataciones,Time to Hire (días)\n";
    performanceData.forEach(row => {
      csvContent += `${row.name},${row.hires},${row.timeToHire}\n`;
    });
    
    // Candidates per job data
    csvContent += "\n=== Distribución por Oferta ===\n";
    csvContent += "Oferta,Candidatos\n";
    sourceDistribution.forEach(row => {
      csvContent += `"${row.name}",${row.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reportes_talentflow_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-cyan-400" />
            Reportes y Analíticas
          </h1>
          <p className="text-slate-400 text-sm font-light mt-1">
            Visualizaciones clave del rendimiento del reclutamiento y embudo de talento.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs bg-slate-800/50 border border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors font-medium flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Últimos 30 días
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-50 hover:text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(163,163,163,0.2)]">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-cyan-500/20 p-5 overflow-hidden relative">
        <div className="absolute right-0 top-0 h-40 w-40 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
              <MapPin className="h-4 w-4" />
              {OFFICE_LOCATION.name}
            </div>
            <h2 className="mt-2 text-xl font-bold text-white">{CDMX_RECRUITMENT_PLAN.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{CDMX_RECRUITMENT_PLAN.summary}</p>
            <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Direccion de entrevistas</p>
              <p className="mt-1 text-sm font-semibold text-white">{OFFICE_LOCATION.address}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{OFFICE_LOCATION.reference}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CDMX_RECRUITMENT_PLAN.objectives.map((objective) => (
              <div key={objective} className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3">
                <Target className="h-4 w-4 text-cyan-300" />
                <p className="mt-2 text-xs leading-5 text-slate-200">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl border border-white/5 p-5 xl:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Zonas prioritarias y hallazgos
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {CDMX_RECRUITMENT_PLAN.priorityZones.map((item) => (
              <div key={item.zone} className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{item.zone}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.areas}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.reason}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {CDMX_RECRUITMENT_PLAN.demographicInsights.map((insight) => (
              <div key={insight} className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs leading-5 text-slate-300">
                {insight}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Cadencia semanal
          </h3>
          <div className="space-y-2">
            {CDMX_RECRUITMENT_PLAN.weeklyCadence.map((item) => (
              <div key={item} className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs leading-5 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" />
            Mensajes por vacante
          </h3>
          <div className="space-y-3">
            {CDMX_RECRUITMENT_PLAN.candidatePersonas.map((persona) => (
              <div key={persona.role} className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{persona.role}</p>
                    <p className="text-xs text-slate-500">{persona.persona}</p>
                  </div>
                  <span className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-200">
                    {persona.channels.split(",")[0]}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-300">{persona.message}</p>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">{persona.channels}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Canales, embudo y metricas
          </h3>
          <div className="space-y-3">
            {CDMX_RECRUITMENT_PLAN.channelStrategy.map((channel) => (
              <div key={channel.channel} className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3">
                <p className="text-xs font-bold text-white">{channel.channel}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{channel.use}</p>
                <p className="mt-1 text-[11px] text-cyan-300">{channel.kpi}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Embudo</p>
              <ol className="space-y-1 text-xs leading-5 text-slate-300">
                {CDMX_RECRUITMENT_PLAN.funnel.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
              </ol>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Metricas</p>
              <ul className="space-y-1 text-xs leading-5 text-slate-300">
                {CDMX_RECRUITMENT_PLAN.metrics.map((metric) => <li key={metric}>• {metric}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-12 h-12 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Time to Hire (Promedio)</p>
          <h3 className="text-3xl font-bold text-white mb-2">{averageTimeToHire} <span className="text-sm font-medium text-slate-500">días</span></h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Calculado con candidatos contratados
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building className="w-12 h-12 text-purple-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Candidatos Totales</p>
          <h3 className="text-3xl font-bold text-white mb-2">{totalCandidates}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Firestore en tiempo real
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Tasa de Conversión</p>
          <h3 className="text-3xl font-bold text-white mb-2">{conversionRate}%</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Contratados / candidatos totales
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            Embudo de Conversión
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}`} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', color: '#fafafa' }}
                  itemStyle={{ color: '#737373' }}
                />
                <Bar dataKey="count" fill="#737373" radius={[0, 4, 4, 0]} barSize={20}>
                  {funnelData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time to Hire & Performance Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Rendimiento histórico (Contrataciones vs TTH)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} orientation="left" />
                <YAxis yAxisId="right" stroke="#94a3b8" fontSize={12} orientation="right" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', color: '#fafafa' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="hires" name="Contratados" fill="#737373" radius={[4, 4, 0, 0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="timeToHire" name="Tiempo (días)" stroke="#737373" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source of Hire (Using Candidates Per Job for now, but pretending it's source) */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Distribución por Fuente de Candidatos
          </h3>
          <div className="h-[300px] w-full flex itmes-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sourceDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#737373" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#737373" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', color: '#fafafa' }}
                />
                <Area type="monotone" dataKey="count" stroke="#737373" fillOpacity={1} fill="url(#colorHires)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
