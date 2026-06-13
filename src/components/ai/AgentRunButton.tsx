import { useState } from "react";
import { aiGateway, type AiTask } from "../../lib/ai-gateway.ts";

interface Props {
  agentId: string;
  instruction: string;
  context?: Record<string, unknown>;
  label?: string;
  onResult?: (task: AiTask) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function AgentRunButton({
  agentId,
  instruction,
  context,
  label = "Ejecutar Agente",
  onResult,
  onError,
  disabled,
  variant = "primary",
}: Props) {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (running || disabled) return;
    setRunning(true);
    try {
      const task = await aiGateway.runAgent(agentId, instruction, context);
      onResult?.(task);
    } catch (e) {
      onError?.(String(e));
    } finally {
      setRunning(false);
    }
  };

  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = variant === "primary"
    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900"
    : "border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10";

  return (
    <button
      className={`${base} ${styles}`}
      onClick={handleRun}
      disabled={running || disabled}
    >
      {running ? (
        <>
          <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          Procesando...
        </>
      ) : (
        <>
          <span>⚡</span>
          {label}
        </>
      )}
    </button>
  );
}
