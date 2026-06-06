import { BarChart3, TrendingUp, DollarSign, Target, CheckCircle2, CalendarClock, Clock, Facebook, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type FacebookAdsAnalysis = {
  summary: {
    totalSpend: number;
    totalLeads: number;
    totalClicks: number;
    totalImpressions: number;
    cpl: number;
    cpc: number;
    ctr: number;
    estimatedInterviews: number;
    estimatedHires: number;
    costPerEstimatedHire: number;
    recommendedBudget: number;
    dailyBudget: number;
    budgetPacing: number;
  };
  bestHours: Array<{ hour: string; spend: number; leads: number; cpl: number | null; ctr: number }>;
  campaigns: Array<{ campaign: string; spend: number; leads: number; cpl: number | null; ctr: number }>;
  recommendation: {
    bestTime: string;
    budget: string;
    agentAction: string;
  };
};

type Props = {
  facebookDailyBudget: number;
  facebookTargetLeads: number;
  facebookTargetHires: number;
  facebookAdsAnalysis: FacebookAdsAnalysis | null;
  isAnalyzingFacebookAds: boolean;
  onSetDailyBudget: (value: number) => void;
  onSetTargetLeads: (value: number) => void;
  onSetTargetHires: (value: number) => void;
  onAnalyze: () => void;
};

export function FacebookAdsPanel({
  facebookDailyBudget,
  facebookTargetLeads,
  facebookTargetHires,
  facebookAdsAnalysis,
  isAnalyzingFacebookAds,
  onSetDailyBudget,
  onSetTargetLeads,
  onSetTargetHires,
  onAnalyze,
}: Props) {
  return (
    <div className="glass-panel rounded-2xl border border-zinc-500/20 p-5 overflow-hidden relative">
      <div className="absolute right-0 top-0 h-32 w-32 bg-zinc-500/10 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-[0.18em]">
              <BarChart3 className="w-4 h-4" />
              Facebook Recruitment Ads
            </div>
            <h3 className="mt-2 text-xl font-bold text-white">Agente optimizador de campañas pagadas</h3>
            <p className="mt-1 text-sm text-slate-400">
              Aurora analiza campañas de reclutamiento, calcula gasto, CPL, CTR, costo estimado por contratación y recomienda las mejores horas para invertir.
            </p>
          </div>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzingFacebookAds}
            className="h-11 px-4 rounded-xl bg-zinc-500 hover:bg-zinc-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {isAnalyzingFacebookAds ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Analizar gasto y horarios
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-zinc-300" />
              Presupuesto diario
            </span>
            <input
              type="number"
              min={1}
              value={facebookDailyBudget}
              onChange={(event) => onSetDailyBudget(Number(event.target.value))}
              className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
            />
          </label>
          <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <Target className="w-3 h-3 text-zinc-300" />
              Meta de leads
            </span>
            <input
              type="number"
              min={1}
              value={facebookTargetLeads}
              onChange={(event) => onSetTargetLeads(Number(event.target.value))}
              className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
            />
          </label>
          <label className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-zinc-300" />
              Meta de contrataciones
            </span>
            <input
              type="number"
              min={1}
              value={facebookTargetHires}
              onChange={(event) => onSetTargetHires(Number(event.target.value))}
              className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
            />
          </label>
        </div>

        {facebookAdsAnalysis ? (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Gasto", value: `$${facebookAdsAnalysis.summary.totalSpend}`, icon: DollarSign, color: "text-zinc-300" },
                { label: "Leads", value: facebookAdsAnalysis.summary.totalLeads, icon: Target, color: "text-zinc-300" },
                { label: "CPL", value: `$${facebookAdsAnalysis.summary.cpl}`, icon: TrendingUp, color: "text-zinc-300" },
                { label: "CTR", value: `${facebookAdsAnalysis.summary.ctr}%`, icon: BarChart3, color: "text-zinc-300" },
                { label: "Entrevistas", value: facebookAdsAnalysis.summary.estimatedInterviews, icon: CalendarClock, color: "text-zinc-300" },
                { label: "Contrataciones", value: facebookAdsAnalysis.summary.estimatedHires, icon: CheckCircle2, color: "text-zinc-300" },
                { label: "Costo/contr.", value: `$${facebookAdsAnalysis.summary.costPerEstimatedHire}`, icon: DollarSign, color: "text-zinc-300" },
                { label: "Presup. sugerido", value: `$${facebookAdsAnalysis.summary.recommendedBudget}`, icon: Target, color: "text-zinc-300" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    <metric.icon className={cn("w-3.5 h-3.5", metric.color)} />
                    {metric.label}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white">{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-zinc-300" />
                Recomendación del agente
              </div>
              <div className="mt-3 space-y-3 text-xs leading-5 text-slate-300">
                <p>{facebookAdsAnalysis.recommendation.bestTime}</p>
                <p>{facebookAdsAnalysis.recommendation.budget}</p>
                <p>{facebookAdsAnalysis.recommendation.agentAction}</p>
              </div>
            </div>

            <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-300" />
                  Mejores horas para invertir
                </h4>
                <div className="mt-3 space-y-2">
                  {facebookAdsAnalysis.bestHours.map((hour) => (
                    <div key={hour.hour} className="flex items-center justify-between rounded-lg bg-slate-900/80 border border-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{hour.hour}</p>
                        <p className="text-[11px] text-slate-500">{hour.leads} leads • CTR {hour.ctr}%</p>
                      </div>
                      <span className="text-sm font-bold text-zinc-300">CPL ${hour.cpl ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Facebook className="w-4 h-4 text-zinc-300" />
                  Campañas activas
                </h4>
                <div className="mt-3 space-y-2">
                  {facebookAdsAnalysis.campaigns.map((campaign) => (
                    <div key={campaign.campaign} className="rounded-lg bg-slate-900/80 border border-white/5 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white truncate">{campaign.campaign}</p>
                        <span className="text-xs font-bold text-zinc-300">${campaign.spend}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{campaign.leads} leads • CPL ${campaign.cpl ?? 0} • CTR {campaign.ctr}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-500/25 bg-slate-950/30 p-4 text-sm text-slate-400">
            Ejecuta el análisis para que el agente calcule gasto, CPL, mejor hora y presupuesto recomendado.
          </div>
        )}
      </div>
    </div>
  );
}
