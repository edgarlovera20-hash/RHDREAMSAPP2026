import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "active"
  | "draft"
  | "teal";

const VARIANTS: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error:   "bg-rose-500/15 text-rose-400 border-rose-500/30",
  info:    "bg-sky-500/15 text-sky-400 border-sky-500/30",
  neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  active:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  draft:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
  teal:    "bg-[var(--neon-teal)]/10 text-[var(--neon-teal)] border-[var(--neon-teal)]/30",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  uppercase?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  className,
  uppercase = true,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
        uppercase && "uppercase tracking-widest",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
