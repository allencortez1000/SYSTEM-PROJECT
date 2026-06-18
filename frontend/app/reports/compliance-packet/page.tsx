import Link from "next/link";

const metrics = [
  { label: "Labor filings", value: "Ready", detail: "Prepared for review", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Policy acknowledgements", value: "92%", detail: "Employees completed", tone: "bg-blue-50 text-blue-700" },
  { label: "Payroll evidence", value: "Updated", detail: "Latest run archived", tone: "bg-violet-50 text-violet-700" },
  { label: "Open risks", value: "3", detail: "Require HR review", tone: "bg-amber-50 text-amber-700" },
];

const checklist = [
  { item: "Monthly payroll report archived", owner: "Payroll", status: "Complete" },
  { item: "SSS, Pag-IBIG, PhilHealth summary reviewed", owner: "Finance", status: "Review" },
  { item: "Labor standards filing packet prepared", owner: "Compliance", status: "Ready" },
  { item: "Employee policy acknowledgements exported", owner: "HR", status: "In progress" },
];

export default function CompliancePacketReportPage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Compliance report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Compliance packet
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Audit-ready labor reports, statutory contribution summaries, and payroll evidence.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/compliance" className="primary-button">
              Open compliance
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
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-black ${metric.tone}`}>
              {metric.value}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Audit checklist</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Compliance packet contents</h3>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="soft-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {checklist.map((row) => (
                <tr key={row.item} className="hover:bg-slate-50">
                  <td className="font-black text-slate-950">{row.item}</td>
                  <td className="text-slate-600">{row.owner}</td>
                  <td>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
