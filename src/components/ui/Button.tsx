import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--neon-teal)] hover:bg-[var(--neon-cyan)] text-[var(--panel-dark)] font-semibold " +
    "shadow-[0_0_16px_rgba(1,238,238,0.35)] hover:shadow-[0_0_26px_rgba(1,238,238,0.55)]",
  secondary:
    "bg-white/5 hover:bg-white/10 text-white border border-[var(--neon-teal)]/40 " +
    "hover:border-[var(--neon-teal)]/80 hover:shadow-[0_0_14px_rgba(1,238,238,0.18)]",
  ghost:
    "text-slate-300 hover:text-white hover:bg-white/5",
  danger:
    "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-teal)]/60",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {children}
    </button>
  );
}
