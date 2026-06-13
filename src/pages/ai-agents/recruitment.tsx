import { useState } from "react";
import { aiGateway, type CandidateEvaluation } from "../../lib/ai-gateway.ts";
import { CandidateAIScore } from "../../components/ai/CandidateAIScore.tsx";
import { WhatsAppSuggestedReply } from "../../components/ai/WhatsAppSuggestedReply.tsx";
import { AgentTaskTimeline } from "../../components/ai/AgentTaskTimeline.tsx";

interface CandidateForm {
  name: string;
  phone: string;
  position: string;
  experience: string;
  zone: string;
  notes: string;
}

const EMPTY: CandidateForm = { name: "", phone: "", position: "", experience: "", zone: "", notes: "" };

export default function RecruitmentAgentPage() {
  const [form, setForm] = useState<CandidateForm>(EMPTY);
  const [evaluation, setEvaluation] = useState<CandidateEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Array<{ id: string; action: string; status: string; timestamp: string }>>([]);

  const handleEvaluate = async () => {
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    setLoading(true);
    setError("");
    const eventId = crypto.randomUUID();
    setEvents((prev) => [{ id: eventId, action: "Evaluando candidato...", status: "running", timestamp: new Date().toISOString() }, ...prev]);
    try {
      const { task, evaluation: ev } = await aiGateway.evaluateCandidate(form);
      setEvaluation(ev ?? null);
      setEvents((prev) => prev.map((e) =>
        e.id === eventId ? { ...e, action: `Evaluación completada (${task.status})`, status: task.status } : e
      ));
      if (!ev) setError("El agente no devolvió una evaluación estructurada. Respuesta: " + JSON.stringify(task.output));
    } catch (e) {
      setError(String(e));
      setEvents((prev) => prev.map((ev) =>
        ev.id === eventId ? { ...ev, action: "Error en evaluación", status: "failed", error: String(e) } : ev
      ) as typeof events);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof CandidateForm, label: string, placeholder = "", type = "text") => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      {key === "notes" || key === "experience" ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm px-3 py-2 resize-none focus:outline-none focus:border-cyan-500"
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm px-3 py-2 focus:outline-none focus:border-cyan-500"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Evaluador de Candidatos IA</h1>
          <p className="text-slate-400 text-sm mt-1">
            El agente analiza al candidato y genera score, riesgos, fortalezas y preguntas de entrevista.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-5">
              <h2 className="font-semibold text-white mb-4">Datos del Candidato</h2>
              <div className="space-y-3">
                {field("name", "Nombre completo *", "Juan Pérez García")}
                {field("phone", "Teléfono", "55 1234 5678", "tel")}
                {field("position", "Puesto solicitado", "Técnico de campo")}
                {field("zone", "Zona / Municipio", "Ecatepec, EDOMEX")}
                {field("experience", "Experiencia laboral", "Describí la experiencia relevante...")}
                {field("notes", "Notas adicionales", "Disponibilidad, expectativa salarial, etc.")}
              </div>
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="mt-4 w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full" />
                    Analizando...
                  </span>
                ) : "⚡ Evaluar con IA"}
              </button>
            </div>

            {events.length > 0 && (
              <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                <h3 className="font-semibold text-white text-sm mb-3">Historial</h3>
                <AgentTaskTimeline events={events as Parameters<typeof AgentTaskTimeline>[0]["events"]} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {evaluation ? (
              <>
                <CandidateAIScore evaluation={evaluation} candidateName={form.name} />
                {evaluation.whatsappMessageSuggestion && (
                  <WhatsAppSuggestedReply
                    candidateInfo={JSON.stringify(form)}
                    candidateName={form.name}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-xl bg-slate-800/50 border border-dashed border-slate-700">
                <div className="text-center">
                  <p className="text-4xl mb-3">🤖</p>
                  <p className="text-slate-500 text-sm">Completa los datos y haz clic en<br />Evaluar con IA para ver el análisis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
