interface TimelineEvent {
  id: string;
  action: string;
  status: string;
  agentId?: string;
  timestamp: string;
  error?: string;
}

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  running: "🔄",
  needs_approval: "⚠️",
  completed: "✅",
  failed: "❌",
  cancelled: "⏹️",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-slate-400",
  running: "text-blue-400",
  needs_approval: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
  cancelled: "text-slate-500",
};

interface Props {
  events: TimelineEvent[];
  emptyMessage?: string;
}

export function AgentTaskTimeline({ events, emptyMessage = "Sin actividad reciente" }: Props) {
  if (events.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">{emptyMessage}</p>;
  }

  return (
    <ol className="relative border-l border-slate-700 space-y-4 ml-3">
      {events.map((event) => (
        <li key={event.id} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-sm">
            {STATUS_ICONS[event.status] ?? "•"}
          </span>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${STATUS_COLORS[event.status] ?? "text-slate-300"}`}>
                {event.action}
              </span>
              <time className="text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
            {event.agentId && (
              <p className="text-xs text-slate-500">Agente: {event.agentId}</p>
            )}
            {event.error && (
              <p className="text-xs text-red-400 mt-1">{event.error}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
