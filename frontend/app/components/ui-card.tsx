"use client";

import type { ReactNode } from "react";

type UICardProps = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
};

export function UICard({ title, subtitle, icon, children, className = "", headerActions }: UICardProps) {
  return (
    <section className={`min-w-0 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg ${className}`}>
      {(title || subtitle || icon || headerActions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon ? <div className="shrink-0">{icon}</div> : null}
            <div className="min-w-0">
              {title ? <h3 className="break-words text-base font-black leading-tight text-slate-900 sm:text-lg">{title}</h3> : null}
              {subtitle ? <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-600">{subtitle}</p> : null}
            </div>
          </div>
          {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">{children}</div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: ReactNode;
  toneClassName?: string;
};

export function StatCard({
  label,
  value,
  detail,
  icon,
  toneClassName = "bg-gradient-to-br from-blue-600 to-cyan-500",
}: StatCardProps) {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3 p-4 sm:p-5 lg:p-6">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:tracking-[0.14em]">{label}</p>
          <div className="mt-2 break-words text-xl font-black leading-none text-slate-950 sm:text-2xl lg:text-[1.75rem]">{value}</div>
          {detail ? <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-500">{detail}</p> : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:h-12 sm:w-12 ${toneClassName}`}>
          {icon}
        </div>
      </div>
    </section>
  );
}
