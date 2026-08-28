import type { ReactNode } from "react";

type BreakdownCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  count?: ReactNode;
  toneClassName?: string;
  children: ReactNode;
  className?: string;
};

export default function BreakdownCard({
  eyebrow,
  title,
  description,
  count,
  toneClassName = "bg-slate-900 text-white border-slate-800",
  children,
  className = "",
}: BreakdownCardProps) {
  return (
    <section className={["section-card overflow-hidden p-0", className].filter(Boolean).join(" ")}>
      <div className={["border-b px-5 py-4", toneClassName].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.16em]">{eyebrow}</p> : null}
            <h2 className="mt-1 text-lg font-black tracking-tight">{title}</h2>
            {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
          </div>
          {count !== undefined ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-slate-900">{count}</span>
          ) : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
