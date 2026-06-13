import { AgentPanel } from "../../components/ai/AgentPanel.tsx";
import { AuditLogTable } from "../../components/ai/AuditLogTable.tsx";

export default function AiAgentsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes IA</h1>
          <p className="text-slate-400 text-sm mt-1">
            Motor IA interno Heavenly Dreams — todos los agentes requieren autenticación y respetan RBAC.
          </p>
        </div>

        <AgentPanel />

        <AuditLogTable />
      </div>
    </div>
  );
}
