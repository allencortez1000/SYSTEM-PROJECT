import type { ReactNode } from "react";

type SummaryMetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accentClassName?: string;
  badge?: ReactNode;
  className?: string;
};

export default function SummaryMetricCard({
  label,
  value,
  detail,
  accentClassName = "accent-blue",
  badge,
  className = "",
}: SummaryMetricCardProps) {
  return (
    <article className={["stat-card min-h-[128px]", accentClassName, className].filter(Boolean).join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 break-words text-3xl font-black text-slate-950">{value}</p>
          {detail ? <div className="mt-2 text-sm font-semibold text-slate-600">{detail}</div> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
    </article>
  );
}
