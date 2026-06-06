import { Activity, Briefcase, Calendar, CheckCircle2, Circle, ClipboardCheck, Folder, Heart, MessageCircle, Package, Shirt, Tag, TrendingUp, UserCheck, Users } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { deriveCandidateTags, inferVisitReason } from "@/utils/candidateTracking";

const PROCESS_STAGES = [
  "Contacto",
  "Habló con agente",
  "Entrevista agendada",
  "Asistió a entrevista",
  "Día de observación / DDO",
  "Bienvenida 1er día",
  "Inventario y materiales",
  "Seguimiento y bienestar",
  "Contratado"
];

const PIPELINE_STAGE_BY_PROCESS: Record<string, string> = {
  Contacto: "Contactado",
  "Habló con agente": "Habló con agente",
  "Entrevista agendada": "Cita agendada",
  "Asistió a entrevista": "Entrevista realizada",
  "Día de observación / DDO": "Día de observación / DDO",
  "Bienvenida 1er día": "Bienvenida 1er día",
  "Inventario y materiales": "Inventario y materiales",
  "Seguimiento y bienestar": "Seguimiento y bienestar",
  Contratado: "Contratado"
};

const TRACKED_PIPELINE_STAGES = Object.values(PIPELINE_STAGE_BY_PROCESS);
const PROCESS_STAGE_BY_PIPELINE = Object.fromEntries(
  Object.entries(PIPELINE_STAGE_BY_PROCESS).map(([processStage, pipelineStage]) => [pipelineStage, processStage])
);

const MATERIALS = [
  { key: "inventoryDelivered", label: "Inventario", icon: Package },
  { key: "materialsDelivered", label: "Material", icon: ClipboardCheck },
  { key: "uniformDelivered", label: "Uniforme", icon: Shirt },
  { key: "folderDelivered", label: "Carpeta", icon: Folder }
];

const defaultOnboarding = (candidate: any) => ({
  processStage: candidate.onboarding?.processStage || PROCESS_STAGE_BY_PIPELINE[candidate.stage] || (PROCESS_STAGES.includes(candidate.stage) ? candidate.stage : "Contacto"),
  ddoDate: candidate.onboarding?.ddoDate || "",
  firstDayDate: candidate.onboarding?.firstDayDate || "",
  inventoryDelivered: Boolean(candidate.onboarding?.inventoryDelivered),
  materialsDelivered: Boolean(candidate.onboarding?.materialsDelivered),
  uniformDelivered: Boolean(candidate.onboarding?.uniformDelivered),
  folderDelivered: Boolean(candidate.onboarding?.folderDelivered),
  salesCount: Number(candidate.onboarding?.salesCount || 0),
  attendanceCount: Number(candidate.onboarding?.attendanceCount || 0),
  wellbeingScore: Number(candidate.onboarding?.wellbeingScore || 3),
  followUpNotes: candidate.onboarding?.followUpNotes || ""
});

const stageIndex = (stage: string) => {
  const index = PROCESS_STAGES.indexOf(stage);
  return index === -1 ? 0 : index;
};

const isMaterialComplete = (onboarding: ReturnType<typeof defaultOnboarding>) =>
  MATERIALS.every(item => Boolean(onboarding[item.key as keyof typeof onboarding]));

export function WelcomeTracking() {
  const { candidates, updateCandidate, loading } = useDb();
  const { triggerEvent } = useNotifications();

  const trackedCandidates = candidates
    .filter(candidate => candidate.onboarding || PROCESS_STAGES.includes(candidate.stage) || TRACKED_PIPELINE_STAGES.includes(candidate.stage))
    .sort((a, b) => stageIndex(defaultOnboarding(b).processStage) - stageIndex(defaultOnboarding(a).processStage));

  const stats = {
    contact: trackedCandidates.filter(candidate => ["Contacto", "Habló con agente"].includes(defaultOnboarding(candidate).processStage)).length,
    interviews: trackedCandidates.filter(candidate => ["Entrevista agendada", "Asistió a entrevista"].includes(defaultOnboarding(candidate).processStage)).length,
    ddo: trackedCandidates.filter(candidate => defaultOnboarding(candidate).processStage === "Día de observación / DDO").length,
    pendingInventory: trackedCandidates.filter(candidate => !isMaterialComplete(defaultOnboarding(candidate))).length,
    avgWellbeing: trackedCandidates.length
      ? (trackedCandidates.reduce((sum, candidate) => sum + defaultOnboarding(candidate).wellbeingScore, 0) / trackedCandidates.length).toFixed(1)
      : "0.0"
  };

  const updateOnboarding = async (candidate: any, patch: Record<string, any>, notify = false) => {
    const nextOnboarding = {
      ...defaultOnboarding(candidate),
      ...patch,
      lastFollowUpAt: Date.now()
    };
    const nextStage = patch.processStage ? PIPELINE_STAGE_BY_PROCESS[patch.processStage] : undefined;

    await updateCandidate(candidate.id, {
      onboarding: nextOnboarding,
      ...(nextStage ? { stage: nextStage } : {})
    });

    if (notify) {
      triggerEvent("sync", {
        title: "Seguimiento actualizado",
        message: `${candidate.name} quedó en ${nextOnboarding.processStage}.`,
        type: "success"
      });
    }
  };

  const updateVisitReason = async (candidate: any, visitReason: string) => {
    await updateCandidate(candidate.id, { visitReason });
  };

  return (
    <div className="flex h-full flex-col gap-6 pb-8">
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <UserCheck className="h-6 w-6 icon-lime" />
            Bienvenidas y Seguimiento
          </h1>
          <p className="mt-1 text-sm font-light text-slate-400">Recepción, DDO, primer día, materiales, ventas, asistencia y bienestar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROCESS_STAGES.slice(0, 5).map(stage => (
            <span key={stage} className="rounded-md border border-white/10 bg-slate-900/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
              {stage}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Contacto", value: stats.contact, icon: MessageCircle, color: "icon-emerald" },
          { label: "Entrevistas", value: stats.interviews, icon: Calendar, color: "icon-amber" },
          { label: "DDO", value: stats.ddo, icon: Users, color: "icon-sky" },
          { label: "Inventario pendiente", value: stats.pendingInventory, icon: Package, color: "icon-lime" },
          { label: "Bienestar prom.", value: stats.avgWellbeing, icon: Heart, color: "icon-rose" }
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-panel rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/70">
                  <Icon className={cn("h-5 w-5", item.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel rounded-2xl border border-slate-700/50 p-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-9">
          {PROCESS_STAGES.map((stage, index) => {
            const count = trackedCandidates.filter(candidate => defaultOnboarding(candidate).processStage === stage).length;
            return (
              <div key={stage} className="rounded-lg border border-white/5 bg-slate-950/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-500/20 bg-zinc-500/10 text-[10px] font-bold text-zinc-300">{index + 1}</span>
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
                <p className="text-[10px] font-bold uppercase leading-snug tracking-widest text-slate-400">{stage}</p>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl border border-slate-700/50 p-8 text-center text-sm text-slate-400">Cargando seguimiento...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {trackedCandidates.map(candidate => {
            const onboarding = defaultOnboarding(candidate);
            const completedMaterials = MATERIALS.filter(item => Boolean(onboarding[item.key as keyof typeof onboarding])).length;
            const wellbeingColor = onboarding.wellbeingScore >= 4 ? "text-emerald-400" : onboarding.wellbeingScore === 3 ? "text-amber-400" : "text-rose-400";

            return (
              <article key={candidate.id} className="glass-panel rounded-2xl border border-slate-700/50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-500/20 bg-zinc-500/10 text-lg font-bold text-zinc-300">
                        {candidate.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-white">{candidate.name}</h2>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span className="truncate">{candidate.role}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {deriveCandidateTags(candidate).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-zinc-500/15 bg-zinc-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Material</p>
                    <p className="mt-1 text-sm font-semibold text-white">{completedMaterials}/{MATERIALS.length}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Etapa del proceso</label>
                    <select
                      value={onboarding.processStage}
                      onChange={(event) => updateOnboarding(candidate, { processStage: event.target.value }, true)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-zinc-500/50"
                    >
                      {PROCESS_STAGES.map(stage => (
                        <option key={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Motivo de visita</label>
                    <input
                      defaultValue={inferVisitReason(candidate)}
                      onBlur={(event) => updateVisitReason(candidate, event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-zinc-500/50"
                      placeholder="Entrevista, DDO, bienvenida..."
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Día de observación / DDO</label>
                    <input
                      type="date"
                      value={onboarding.ddoDate}
                      onChange={(event) => updateOnboarding(candidate, { ddoDate: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-zinc-500/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Bienvenida 1er día</label>
                    <input
                      type="date"
                      value={onboarding.firstDayDate}
                      onChange={(event) => updateOnboarding(candidate, { firstDayDate: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-zinc-500/50"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {MATERIALS.map(item => {
                    const Icon = item.icon;
                    const isChecked = Boolean(onboarding[item.key as keyof typeof onboarding]);
                    return (
                      <button
                        key={item.key}
                        onClick={() => updateOnboarding(candidate, { [item.key]: !isChecked })}
                        className={cn(
                          "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                          isChecked
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-slate-950/30 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {isChecked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/5 bg-slate-950/30 p-3">
                    <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Ventas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={onboarding.salesCount}
                      onChange={(event) => updateOnboarding(candidate, { salesCount: Number(event.target.value) })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-zinc-500/50"
                    />
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/30 p-3">
                    <label className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Activity className="h-3.5 w-3.5" />
                      Asistencia
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={onboarding.attendanceCount}
                      onChange={(event) => updateOnboarding(candidate, { attendanceCount: Number(event.target.value) })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none focus:border-zinc-500/50"
                    />
                  </div>
                  <div className="rounded-lg border border-white/5 bg-slate-950/30 p-3">
                    <label className="mb-2 flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5" />
                        Bienestar
                      </span>
                      <span className={cn("text-xs", wellbeingColor)}>{onboarding.wellbeingScore}/5</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={onboarding.wellbeingScore}
                      onChange={(event) => updateOnboarding(candidate, { wellbeingScore: Number(event.target.value) })}
                      className="w-full accent-zinc-400"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Seguimiento y bienestar</label>
                  <textarea
                    defaultValue={onboarding.followUpNotes}
                    onBlur={(event) => updateOnboarding(candidate, { followUpNotes: event.target.value }, true)}
                    className="min-h-20 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-zinc-500/50"
                    placeholder="Notas breves del día, estado de ánimo, pendientes y acuerdos..."
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
