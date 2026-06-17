"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] p-6 text-slate-100 shadow-[0_30px_60px_rgba(15,23,42,0.18)] xl:sticky xl:top-0 xl:min-h-screen">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">HR & Payroll</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Enterprise Suite</h2>
            <p className="mt-1 text-sm text-slate-400">HR · Payroll · Reports</p>
          </div>

          <nav className="space-y-2 text-sm">
            <Link href="/" className={"block rounded-2xl px-4 py-3 font-semibold " + (isActive('/') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Dashboard</Link>
            <Link href="/employees" className={"block rounded-2xl px-4 py-3 " + (isActive('/employees') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Employees</Link>
            <Link href="/attendance" className={"block rounded-2xl px-4 py-3 " + (isActive('/attendance') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Attendance</Link>
            <Link href="/payroll" className={"block rounded-2xl px-4 py-3 " + (isActive('/payroll') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Payroll</Link>
            <Link href="/leave" className={"block rounded-2xl px-4 py-3 " + (isActive('/leave') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Leave</Link>
            <Link href="/recruitment" className={"block rounded-2xl px-4 py-3 " + (isActive('/recruitment') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Recruitment</Link>
            <Link href="/reports" className={"block rounded-2xl px-4 py-3 " + (isActive('/reports') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Reports</Link>
            <Link href="/compliance" className={"block rounded-2xl px-4 py-3 " + (isActive('/compliance') ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800')}>Compliance</Link>
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-400">
            <p>Version 0.1.0</p>
            <p className="mt-2">Ready · <span className="text-emerald-400">Online</span></p>
          </div>
        </aside>

        <main className="min-h-screen"> 
          <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Welcome back</span>
                <h1 className="text-xl font-semibold text-slate-900">HR Dashboard</h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <input placeholder="Search employees, payroll, reports..." className="w-full min-w-[260px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">🔎</span>
                </div>
                <button aria-label="Notifications" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.5 14.5V11a6.5 6.5 0 10-13 0v3.5c0 .53-.21 1.04-.595 1.414L3 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-400 to-purple-500 text-sm font-semibold text-white shadow-sm">
                  AH
                </div>
              </div>
            </div>
          </header>

          <section className="px-4 py-6 sm:px-6 lg:px-8">{children}</section>
        </main>
      </div>
    </div>
  );
}
