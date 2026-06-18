import Link from "next/link";

const payrollStats = [
  { label: "Gross payroll", value: "₱24,750,000", detail: "Current monthly estimate", tone: "bg-blue-50 text-blue-700" },
  { label: "Net payout", value: "₱20,420,200", detail: "After statutory deductions", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Government contributions", value: "₱2,315,400", detail: "SSS, Pag-IBIG, PhilHealth", tone: "bg-amber-50 text-amber-700" },
  { label: "Pending approvals", value: "6", detail: "Managers still reviewing", tone: "bg-violet-50 text-violet-700" },
];

const checklist = [
  { title: "Attendance and hours locked", status: "Complete", done: true },
  { title: "Overtime verified", status: "Complete", done: true },
  { title: "SSS, Pag-IBIG, PhilHealth auto-computed", status: "Ready", done: true },
  { title: "Final payroll approval", status: "Pending", done: false },
];

const recentRuns = [
  { period: "April 2026", employees: 1248, gross: "₱24,314,400", status: "Paid" },
  { period: "March 2026", employees: 1217, gross: "₱23,932,800", status: "Paid" },
  { period: "February 2026", employees: 1192, gross: "₱23,190,000", status: "Paid" },
];

export default function PayrollIndex() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Payroll center</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Prepare Philippine payroll with hourly pay and automatic deductions.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-600">
              Review hourly earnings, overtime, SSS, Pag-IBIG, PhilHealth, and final net pay before releasing payroll.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/payroll/new" className="primary-button">
                Start payroll calculation
              </Link>
              <Link href="/reports" className="secondary-button">
                View payroll reports
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">May payroll readiness</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                On track
              </span>
            </div>
            <p className="mt-5 text-5xl font-black sm:text-6xl">94%</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Employee hours, overtime, and statutory contributions are nearly ready for final review.
            </p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {payrollStats.map((stat) => (
          <article key={stat.label} className="metric-card">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                <p className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{stat.detail}</p>
              </div>
              <span className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${stat.tone}`}>
                PHP
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="section-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Run checklist</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Before you pay</h3>
            </div>
            <Link href="/payroll/new" className="secondary-button">
              Calculate
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {checklist.map((item) => (
              <div key={item.title} className="flex min-w-0 items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black " +
                      (item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
                    }
                  >
                    {item.done ? "✓" : "!"}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-black text-slate-950">{item.title}</p>
                    <p className="text-sm font-semibold text-slate-500">{item.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div>
            <p className="eyebrow">Recent payroll runs</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Payment history</h3>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Employees</th>
                  <th>Gross payroll</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {recentRuns.map((run) => (
                  <tr key={run.period} className="hover:bg-slate-50">
                    <td className="font-black text-slate-950">{run.period}</td>
                    <td className="text-slate-600">{run.employees}</td>
                    <td className="font-bold text-slate-700">{run.gross}</td>
                    <td>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
