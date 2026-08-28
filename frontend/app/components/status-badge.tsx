import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "slate" | "blue" | "cyan" | "emerald" | "amber" | "violet" | "red" | "white";
  size?: "sm" | "md";
  uppercase?: boolean;
  className?: string;
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  red: "bg-red-100 text-red-700",
  white: "bg-white/80 text-slate-900",
};

const sizeClasses: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export default function StatusBadge({
  children,
  tone = "slate",
  size = "md",
  uppercase = false,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-black",
        uppercase ? "uppercase tracking-[0.14em]" : "",
        toneClasses[tone],
        sizeClasses[size],
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </span>
  );
}
