import { useState, useEffect } from "react";
import { aiGateway, type AiAgent } from "../../lib/ai-gateway.ts";

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-orange-400 bg-orange-400/10",
  critical: "text-red-400 bg-red-400/10",
};

const MODULE_ICONS: Record<string, string> = {
  recruitment: "👥",
  whatsapp: "💬",
  siac: "📋",
  morosidad: "💰",
  email: "📧",
  documents: "📂",
  central: "🔭",
  operations: "⚙️",
  finance: "📊",
};

export function AgentPanel() {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [health, setHealth] = useState<{ status: string; engine: string; latencyMs?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      aiGateway.listAgents().then(setAgents).catch(() => {}),
      aiGateway.health().then(setHealth).catch(() =>  setHealth({ status: "unavailable", engine: "unknown" })),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {health && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <span className={`h-2.5 w-2.5 rounded-full ${
            health.status === "healthy" ? "bg-emerald-400" :
            health.status === "degraded" ? "bg-yellow-400" : "bg-red-400"
          }`} />
          <span className="text-sm text-slate-300">
            Motor IA: <span className="font-medium text-white">{health.engine}</span>
          </span>
          {health.latencyMs && (
            <span className="ml-auto text-xs text-slate-500">{health.latencyMs}ms</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xl">{MODULE_ICONS[agent.module] ?? "🤖"}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                RISK_COLORS[agent.riskLevel] ?? "text-slate-400 bg-slate-700"
              }`}>
                {agent.riskLevel}
              </span>
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">{agent.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{agent.description}</p>
            {agent.requiresApproval && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                <span>⚠️</span>
                <span>Requiere aprobación humana</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">🤖</p>
          <p>No hay agentes disponibles para tu rol</p>
        </div>
      )}
    </div>
  );
}
