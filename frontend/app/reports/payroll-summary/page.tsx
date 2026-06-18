import Link from "next/link";

const payrollRows = [
  { label: "Gross payroll", value: "₱24,750,000", detail: "Total earnings before deductions" },
  { label: "Net payout", value: "₱20,420,200", detail: "Final employee payout" },
  { label: "SSS total", value: "₱1,123,500", detail: "Employee statutory contributions" },
  { label: "Pag-IBIG total", value: "₱249,600", detail: "Pag-IBIG deductions" },
  { label: "PhilHealth total", value: "₱942,300", detail: "PhilHealth deductions" },
  { label: "Other deductions", value: "₱485,000", detail: "Loans and adjustments" },
];

const departments = [
  { name: "Operations", amount: "₱6,450,000", employees: 320 },
  { name: "Sales", amount: "₱5,980,000", employees: 286 },
  { name: "Engineering", amount: "₱7,200,000", employees: 214 },
  { name: "Finance", amount: "₱2,840,000", employees: 96 },
];

export default function PayrollSummaryReportPage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Payroll report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Payroll summary
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Monthly payroll totals, net payout, statutory deductions, and department-level payroll cost.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/payroll" className="primary-button">
              Open payroll center
            </Link>
            <Link href="/reports" className="secondary-button">
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {payrollRows.map((row) => (
          <article key={row.label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{row.label}</p>
            <p className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{row.value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{row.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Department breakdown</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Payroll by department</h3>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="soft-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Employees</th>
                <th>Payroll amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {departments.map((department) => (
                <tr key={department.name} className="hover:bg-slate-50">
                  <td className="font-black text-slate-950">{department.name}</td>
                  <td className="text-slate-600">{department.employees}</td>
                  <td className="font-bold text-slate-700">{department.amount}</td>
                  <td>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      Ready
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
