import type { ReactNode } from 'react';
import Link from 'next/link';

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-r-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-slate-100 shadow-soft xl:sticky xl:top-0 xl:min-h-screen">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HR & Payroll</p>
            <h2 className="mt-4 text-2xl font-semibold">Enterprise Suite</h2>
            <p className="mt-1 text-sm text-slate-400">HR · Payroll · Reports</p>
          </div>

          <nav className="space-y-2 text-sm">
            <Link href="/" className="block rounded-2xl bg-brand-600 px-4 py-3 font-semibold text-white">Dashboard</Link>
            <Link href="/employees" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Employees</Link>
            <Link href="#" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Attendance</Link>
            <Link href="/payroll/new" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Payroll</Link>
            <Link href="#" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Leave</Link>
            <Link href="#" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Recruitment</Link>
            <Link href="#" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Reports</Link>
            <Link href="#" className="block rounded-2xl px-4 py-3 text-slate-300 hover:bg-slate-800">Compliance</Link>
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-400">
            <p>Version 0.1.0</p>
            <p className="mt-2">Ready · <span className="text-emerald-400">Online</span></p>
          </div>
        </aside>

        <main className="min-h-screen"> 
          <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-200">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button className="hidden xl:inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow">☰ Menu</button>
                <div className="rounded-md bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-white font-semibold">HR Dashboard</div>
                <div className="hidden md:block">
                  <input placeholder="Search employees, payroll, reports..." className="w-96 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button aria-label="Notifications" className="rounded-md p-2 hover:bg-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.5 14.5V11a6.5 6.5 0 10-13 0v3.5c0 .53-.21 1.04-.595 1.414L3 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-rose-400 to-purple-500 flex items-center justify-center text-white font-semibold">AH</div>
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
