import Link from "next/link";

const metrics = [
  { label: "Total employees", value: "1,248", detail: "+5.2% this month" },
  { label: "New hires", value: "46", detail: "Across 7 departments" },
  { label: "Exits", value: "11", detail: "Voluntary and involuntary" },
  { label: "Transfers", value: "18", detail: "Internal movement" },
];

const movementRows = [
  { department: "Operations", start: 302, hired: 21, exited: 3, ending: 320 },
  { department: "Sales", start: 271, hired: 18, exited: 3, ending: 286 },
  { department: "Engineering", start: 207, hired: 9, exited: 2, ending: 214 },
  { department: "Finance", start: 94, hired: 3, exited: 1, ending: 96 },
  { department: "HR", start: 48, hired: 2, exited: 0, ending: 50 },
];

export default function HeadcountMovementReportPage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">People report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Headcount movement
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Track hiring, exits, transfers, and department-level workforce growth.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/employees" className="primary-button">
              Open employees
            </Link>
            <Link href="/reports" className="secondary-button">
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{metric.label}</p>
            <p className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Movement table</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Department movement</h3>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="soft-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Start</th>
                <th>Hired</th>
                <th>Exited</th>
                <th>Ending</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {movementRows.map((row) => (
                <tr key={row.department} className="hover:bg-slate-50">
                  <td className="font-black text-slate-950">{row.department}</td>
                  <td className="text-slate-600">{row.start}</td>
                  <td className="font-bold text-emerald-700">+{row.hired}</td>
                  <td className="font-bold text-red-600">-{row.exited}</td>
                  <td className="font-black text-slate-950">{row.ending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
