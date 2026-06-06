import { Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type MetaModule = {
  id: string;
  label: string;
  requirement: string;
  connected: boolean;
};

interface MetaCoveragePanelProps {
  metaIntegrationStatus: MetaModule[];
  metaConnectedCount: number;
  metaCoveragePct: number;
  totalModules: number;
}

export function MetaCoveragePanel({
  metaIntegrationStatus,
  metaConnectedCount,
  metaCoveragePct,
  totalModules,
}: MetaCoveragePanelProps) {
  return (
    <div className="glass-panel rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            <Shield className="h-4 w-4" />
            Meta Suite
          </div>
          <h2 className="mt-2 text-lg font-bold text-white">Cobertura Meta {metaCoveragePct}%</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {metaConnectedCount}/{totalModules} modulos listos para WhatsApp Cloud, Facebook, Messenger, Instagram y webhook oficial.
          </p>
        </div>
        <div className="grid min-w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:min-w-[620px] xl:grid-cols-5">
          {metaIntegrationStatus.map((module) => (
            <div
              key={module.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                module.connected
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : "border-slate-700/70 bg-slate-950/45"
              )}
            >
              <div className="flex items-center gap-2">
                {module.connected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />
                )}
                <p className="text-xs font-bold text-white">{module.label}</p>
              </div>
              <p className="mt-2 truncate font-mono text-[10px] text-slate-400">{module.requirement}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
