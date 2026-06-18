import Link from "next/link";

const metrics = [
  { label: "Present rate", value: "94.8%", detail: "Average this month" },
  { label: "Absences", value: "38", detail: "Recorded absences" },
  { label: "Remote work", value: "214", detail: "Remote attendance entries" },
  { label: "Overtime hours", value: "1,420", detail: "Approved overtime" },
];

const attendanceRows = [
  { team: "Operations", present: "95%", absent: 12, remote: 38, overtime: 420 },
  { team: "Sales", present: "93%", absent: 14, remote: 52, overtime: 310 },
  { team: "Engineering", present: "97%", absent: 5, remote: 96, overtime: 500 },
  { team: "Finance", present: "96%", absent: 3, remote: 12, overtime: 90 },
  { team: "HR", present: "94%", absent: 4, remote: 16, overtime: 100 },
];

export default function AttendanceInsightsReportPage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Attendance report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Attendance insights
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Review presence, absence, remote work, overtime, and punctuality patterns.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/attendance" className="primary-button">
              Open attendance
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
          <p className="eyebrow">Team breakdown</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Attendance by team</h3>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="soft-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Present rate</th>
                <th>Absences</th>
                <th>Remote</th>
                <th>Overtime hrs</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {attendanceRows.map((row) => (
                <tr key={row.team} className="hover:bg-slate-50">
                  <td className="font-black text-slate-950">{row.team}</td>
                  <td className="font-bold text-emerald-700">{row.present}</td>
                  <td className="text-slate-600">{row.absent}</td>
                  <td className="text-slate-600">{row.remote}</td>
                  <td className="font-bold text-slate-700">{row.overtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
