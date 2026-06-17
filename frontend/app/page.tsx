'use client';

import Link from 'next/link';

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.title} className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{metric.title}</p>
                  <p className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 shadow-sm">📈</div>
              </div>
              <p className="mt-4 text-sm text-slate-500">{metric.change} vs last month</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          {dashboardPanels.map((panel) => (
            <div key={panel.title} className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{panel.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{panel.description}</p>
                </div>
                <span className="inline-flex h-9 items-center rounded-full bg-emerald-100 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Live</span>
              </div>
              <div className="mt-6 h-40 rounded-[24px] bg-slate-50 p-4 text-slate-500 shadow-inner">Chart placeholder</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between gap-4">
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
  );
}
