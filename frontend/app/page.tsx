"use client";

import Link from "next/link";

const metrics = [
  { title: "Total Employees", value: "1,248", change: "+5.2%", icon: "👥", tone: "bg-blue-50 text-blue-700" },
  { title: "Payroll Cost", value: "₱24.75M", change: "+1.8%", icon: "💳", tone: "bg-emerald-50 text-emerald-700" },
  { title: "Leave Requests", value: "78", change: "-4.8%", icon: "🌴", tone: "bg-amber-50 text-amber-700" },
  { title: "Overtime Cost", value: "₱738K", change: "+3.4%", icon: "⏱", tone: "bg-violet-50 text-violet-700" },
];

const departments = [
  { name: "Operations", value: 82, color: "bg-blue-600" },
  { name: "Sales", value: 68, color: "bg-cyan-500" },
  { name: "Engineering", value: 74, color: "bg-violet-500" },
  { name: "Finance", value: 52, color: "bg-emerald-500" },
];

const activities = [
  "Payroll run scheduled for May 28",
  "3 leave approvals pending in Marketing",
  "Compliance update ready for labor reporting",
  "12 new candidate profiles reviewed",
];

export default function Home() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Executive dashboard</p>
            <h2 className="mt-4 max-w-3xl break-words text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Run payroll, people operations, and compliance with confidence.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              A modern HR command center for tracking workforce health, Philippine payroll readiness,
              attendance signals, hiring velocity, and compliance tasks.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/employees" className="primary-button">Manage employees</Link>
              <Link href="/payroll/new" className="secondary-button">Create payroll run</Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">Payroll readiness</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
            </div>
            <p className="mt-5 text-5xl font-black">94%</p>
            <p className="mt-2 text-sm text-slate-400">Validated employee records, hourly rates, statutory deductions, and attendance inputs.</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">18</p>
                <p className="text-slate-400">Checks</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">4</p>
                <p className="text-slate-400">Warnings</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">0</p>
                <p className="text-slate-400">Errors</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.title} className="metric-card">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{metric.title}</p>
                <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{metric.value}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${metric.tone}`}>
                {metric.icon}
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">
              <span className={metric.change.startsWith("-") ? "text-emerald-600" : "text-blue-600"}>{metric.change}</span> vs last month
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="section-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Workforce analytics</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Department health</h3>
            </div>
            <Link href="/reports" className="secondary-button">View reports</Link>
          </div>

          <div className="mt-6 space-y-5">
            {departments.map((department) => (
              <div key={department.name}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <p className="font-bold text-slate-700">{department.name}</p>
                  <p className="text-right text-slate-500">{department.value}% capacity</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${department.color}`} style={{ width: `${department.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="section-card">
          <p className="eyebrow">Action center</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Today’s priorities</h3>
          <div className="mt-6 space-y-3">
            {activities.map((activity, index) => (
              <div key={activity} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-blue-700 shadow-sm">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-slate-700">{activity}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="section-card lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">People directory</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Featured employee</h3>
            </div>
            <Link href="/employees" className="secondary-button">View all</Link>
          </div>

          <Link href="/employees/1" className="mt-6 block rounded-[1.5rem] border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-lg font-black text-white">
                  AH
                </div>
                <div className="min-w-0">
                  <p className="break-words text-lg font-black text-slate-950">Amelia Hart</p>
                  <p className="text-sm font-semibold text-slate-500">Lead HR Administrator</p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Active</span>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <p><span className="font-bold text-slate-900">Department:</span> Human Resources</p>
              <p><span className="font-bold text-slate-900">Hire Date:</span> Jan 15, 2024</p>
              <p><span className="font-bold text-slate-900">Salary:</span> ₱98,000</p>
            </div>
          </Link>
        </div>

        <div className="section-card">
          <p className="eyebrow">Compliance</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Filing readiness</h3>
          <div className="mt-6 flex aspect-square items-center justify-center rounded-full bg-gradient-to-tr from-blue-50 to-cyan-50">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-blue-600 bg-white text-center shadow-inner">
              <div>
                <p className="text-4xl font-black text-slate-950">87%</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Ready</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
