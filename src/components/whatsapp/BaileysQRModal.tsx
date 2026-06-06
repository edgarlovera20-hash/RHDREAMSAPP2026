import { QrCode, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type BaileysStatus = {
  id: string;
  state: "idle" | "connecting" | "qr" | "connected" | "closed" | "logged_out" | "error";
  qrDataUrl?: string | null;
  qrCreatedAt?: number;
  qrExpiresAt?: number;
  qrSecondsLeft?: number | null;
  phone?: string | null;
  lastError?: string | null;
  updatedAt?: number;
};

type Props = {
  baileysStatus: BaileysStatus | null;
  baileysError: string;
  baileysAuthExpired: boolean;
  baileysSessionId: string;
  isStartingBaileys: boolean;
  onRegenerate: () => void;
  onGoToLogin: () => void;
};

export function BaileysQRModal({
  baileysStatus,
  baileysError,
  baileysAuthExpired,
  baileysSessionId,
  isStartingBaileys,
  onRegenerate,
  onGoToLogin,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-7 text-center">
      <h3 className="text-xl font-bold text-white mb-2">Escanea el código QR de Baileys</h3>
      <p className="text-sm text-slate-400 mb-8 max-w-[300px]">Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este QR real para enlazar la sesión local.</p>

      <div className="bg-white p-4 rounded-2xl mb-6 relative min-h-[224px] min-w-[224px] flex items-center justify-center shadow-[0_0_35px_rgba(34,211,238,0.18)] ring-1 ring-cyan-200/70">
        {baileysStatus?.qrDataUrl ? (
          <img src={baileysStatus.qrDataUrl} alt="QR Baileys" className="w-56 h-56" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-900">
            <QrCode className="w-24 h-24" />
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {baileysStatus?.qrDataUrl && (
          <div className="absolute left-0 top-0 h-1 w-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.95)] animate-[scan_2s_ease-in-out_infinite]" />
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-cyan-300 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        {baileysStatus?.state === "qr"
          ? "Esperando escaneo desde tu dispositivo móvil..."
          : baileysStatus?.state === "logged_out"
            ? "QR anterior vencido. Preparando uno nuevo..."
            : "Preparando sesión Baileys..."}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">
        Sesión: {baileysStatus?.id || baileysSessionId || "default"} · Estado: {baileysStatus?.state || "connecting"}
      </p>
      {baileysStatus?.state === "qr" && typeof baileysStatus.qrSecondsLeft === "number" && (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
          QR activo por {baileysStatus.qrSecondsLeft}s
        </p>
      )}
      {baileysError && (
        <div className={cn(
          "mt-4 rounded-xl border px-4 py-3 text-xs",
          baileysAuthExpired
            ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
            : baileysStatus?.state === "logged_out"
              ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
              : "border-rose-400/35 bg-rose-500/10 text-rose-100"
        )}>
          {baileysError}
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {baileysAuthExpired ? (
          <button
            onClick={onGoToLogin}
            className="rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-100 hover:bg-amber-400/25"
          >
            Iniciar sesion
          </button>
        ) : (
          <button
            onClick={onRegenerate}
            disabled={isStartingBaileys}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50"
          >
            {isStartingBaileys ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Regenerar QR
          </button>
        )}
      </div>
    </div>
  );
}
