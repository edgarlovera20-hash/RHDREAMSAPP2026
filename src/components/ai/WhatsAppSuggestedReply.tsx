import { useState } from "react";
import { aiGateway } from "../../lib/ai-gateway.ts";

interface Props {
  candidateInfo: string;
  candidateName: string;
  onApproved?: (message: string) => void;
}

export function WhatsAppSuggestedReply({ candidateInfo, candidateName, onApproved }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [approved, setApproved] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const task = await aiGateway.suggestWhatsApp(candidateInfo);
      setTaskId(task.taskId);
      const output = task.output as { message?: string; content?: string } | undefined;
      const text = output?.message ?? output?.content ?? "";
      setMessage(typeof text === "string" ? text : JSON.stringify(text));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!taskId) return;
    try {
      await aiGateway.approveTask(taskId);
      setApproved(true);
      onApproved?.(message);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h4 className="font-semibold text-white">WhatsApp Sugerido para {candidateName}</h4>
      </div>

      {!message && !loading && (
        <button
          onClick={generate}
          className="w-full py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
        >
          Generar mensaje sugerido
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          Generando...
        </div>
      )}

      {message && !approved && (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm p-3 resize-none focus:outline-none focus:border-green-500"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              onClick={approve}
              className="flex-1 py-2 rounded-lg bg-green-500 text-slate-900 font-semibold text-sm hover:bg-green-400 transition-colors"
            >
              ✅ Aprobar y copiar
            </button>
            <button
              onClick={() => { setMessage(""); setTaskId(""); }}
              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
            >
              ❌
            </button>
          </div>
          <p className="text-xs text-amber-400">⚠️ Este mensaje requiere tu aprobación antes de enviarse.</p>
        </>
      )}

      {approved && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <span>✅</span>
          <span>Mensaje aprobado y copiado al portapapeles</span>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
