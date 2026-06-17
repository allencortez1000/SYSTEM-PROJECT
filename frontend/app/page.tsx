'use client';

import Link from 'next/link';
import DashboardShell from './components/dashboard-shell';

const metrics = [
  { title: 'Total Employees', value: '1,248', change: '+5.2%' },
  { title: 'Monthly Payroll Cost', value: '$412,500', change: '+1.8%' },
  { title: 'Leave Requests', value: '78', change: '-4.8%' },
  { title: 'Overtime Cost', value: '$12,320', change: '+3.4%' },
];

const dashboardPanels = [
  { title: 'Headcount Trends', description: 'Balanced growth across departments and teams.' },
  { title: 'Payroll Trends', description: 'Forecast payroll spend and tax obligations.' },
  { title: 'Leave Utilization', description: 'Track approved leave and absence trends.' },
  { title: 'Department Distribution', description: 'Visualize population by HR and payroll teams.' },
];

export default function Home() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl overflow-hidden shadow-soft">
          <div className="bg-gradient-to-r from-brand-500 to-brand-700 px-8 py-10 text-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] opacity-90">HR & Payroll Management System</p>
                <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Executive Dashboard</h1>
                <p className="mt-2 max-w-2xl text-base opacity-90">Centralized HR operations, payroll insights, and compliance reporting for enterprise-ready workforce management.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/payroll/new" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8" />
                  </svg>
                  New Payroll Run
                </Link>
                <Link href="/employees/new" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-700">Add Employee</Link>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.title} className="card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{metric.title}</p>
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">📈</div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.change} vs last month</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          {dashboardPanels.map((panel) => (
            <div key={panel.title} className="card p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{panel.title}</h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
              </div>
              <p className="mt-3 text-slate-600">{panel.description}</p>
              <div className="mt-6 h-40 rounded-md bg-slate-50 p-4 text-slate-500">Chart placeholder</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Employee Directory</h2>
              <Link href="/employees" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">View all</Link>
            </div>
            <div className="mt-6 space-y-4">
              <Link href="/employees/1" className="block">
                <article className="rounded-2xl border border-slate-100 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-rose-400 to-purple-500 flex items-center justify-center text-white font-semibold">AH</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Amelia Hart</p>
                        <p className="text-sm text-slate-500">Lead HR Administrator</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Active</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-500">
                    <p>Department: Human Resources</p>
                    <p>Hire Date: Jan 15, 2024</p>
                    <p>Salary: $98,000</p>
                  </div>
                </article>
              </Link>
            </div>
          </div>

          <aside className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Alerts & Notifications</h2>
            <ul className="mt-6 space-y-4 text-slate-600">
              <li className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">Payroll run scheduled for May 28.</li>
              <li className="rounded-lg border border-amber-100 bg-amber-50 p-4">3 pending leave approvals in Marketing.</li>
              <li className="rounded-lg border border-sky-100 bg-sky-50 p-4">New compliance update available for labor reporting.</li>
            </ul>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
