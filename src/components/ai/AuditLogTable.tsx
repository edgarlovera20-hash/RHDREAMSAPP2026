import { useState, useEffect } from "react";
import { aiGateway } from "../../lib/ai-gateway.ts";

const ACTION_COLORS: Record<string, string> = {
  "agent.run": "text-cyan-400",
  "task.approved": "text-emerald-400",
  "task.rejected": "text-red-400",
  "memory.save": "text-purple-400",
  "document.analyze": "text-blue-400",
};

export function AuditLogTable() {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiGateway.getAuditLog()
      .then((r) => setLogs(r.logs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-slate-800 rounded-xl" />;
  }

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="font-semibold text-white">Log de Auditoría IA</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-2">Acción</th>
              <th className="text-left px-4 py-2">Agente</th>
              <th className="text-left px-4 py-2">Módulo</th>
              <th className="text-left px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(logs as Array<Record<string, unknown>>).map((log, i) => (
              <tr key={String(log.id ?? i)} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className={`px-4 py-2 font-medium ${ACTION_COLORS[String(log.action)] ?? "text-slate-300"}`}>
                  {String(log.action)}
                </td>
                <td className="px-4 py-2 text-slate-400">{String(log.agent_id ?? log.agentId ?? "—")}</td>
                <td className="px-4 py-2 text-slate-400">{String(log.module ?? "—")}</td>
                <td className="px-4 py-2 text-slate-500">
                  {log.created_at
                    ? new Date(String(log.created_at)).toLocaleString("es-MX")
                    : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
