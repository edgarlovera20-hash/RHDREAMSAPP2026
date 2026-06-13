import type { CandidateEvaluation } from "../../lib/ai-gateway.ts";

interface Props {
  evaluation: CandidateEvaluation;
  candidateName: string;
}

const PRIORITY_COLORS = {
  alta: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  media: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  baja: "text-slate-400 bg-slate-700 border-slate-600",
};

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#34d399" : score >= 45 ? "#facc15" : "#f87171";

  return (
    <div className="relative flex items-center justify-center h-24 w-24">
      <svg className="rotate-[-90deg]" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-2xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export function CandidateAIScore({ evaluation, candidateName }: Props) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={evaluation.score} />
        <div>
          <h3 className="font-semibold text-white text-lg">{candidateName}</h3>
          <p className="text-slate-400 text-sm">{evaluation.recommendedRole}</p>
          <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
            PRIORITY_COLORS[evaluation.priority] ?? PRIORITY_COLORS.baja
          }`}>
            Prioridad {evaluation.priority}
          </span>
        </div>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed">{evaluation.summary}</p>

      {evaluation.strengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">Fortalezas</p>
          <ul className="space-y-1">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-emerald-400 mt-0.5">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.risks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5">Riesgos</p>
          <ul className="space-y-1">
            {evaluation.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-red-400 mt-0.5">⚠</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.interviewQuestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide mb-1.5">Preguntas Sugeridas</p>
          <ol className="space-y-1">
            {evaluation.interviewQuestions.map((q, i) => (
              <li key={i} className="text-sm text-slate-300">
                <span className="text-cyan-400 font-medium">{i + 1}. </span>{q}
              </li>
            ))}
          </ol>
        </div>
      )}

      {evaluation.nextAction && (
        <div className="pt-2 border-t border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Próxima Acción</p>
          <p className="text-sm text-white">{evaluation.nextAction}</p>
        </div>
      )}
    </div>
  );
}
