import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "lg" | "xl" | "2xl";
}

const PADDING = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

const ROUNDED = {
  lg:  "rounded-lg",
  xl:  "rounded-xl",
  "2xl": "rounded-2xl",
};

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
  rounded = "2xl",
}: CardProps) {
  return (
    <div
      className={cn(
        "glass-panel border border-[var(--neon-teal)]",
        ROUNDED[rounded],
        PADDING[padding],
        hover && "glass-panel-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div>
        <h3 className="font-semibold text-white text-base leading-tight">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
