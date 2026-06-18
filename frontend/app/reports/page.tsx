import Link from "next/link";

const reportCards = [
  {
    title: "Payroll summary",
    description: "Monthly payroll totals, taxes, deductions, and net pay.",
    href: "/reports/payroll-summary",
    icon: "💳",
    action: "Open payroll report",
  },
  {
    title: "Headcount movement",
    description: "Hiring, exits, transfers, and department growth.",
    href: "/reports/headcount-movement",
    icon: "👥",
    action: "Open headcount report",
  },
  {
    title: "Attendance insights",
    description: "Absence trends, remote work, overtime, and punctuality.",
    href: "/reports/attendance-insights",
    icon: "⏱",
    action: "Open attendance report",
  },
  {
    title: "Compliance packet",
    description: "Labor reports and audit-ready filing exports.",
    href: "/reports/compliance-packet",
    icon: "🛡",
    action: "Open compliance report",
  },
];

export default function ReportsPage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Reports studio</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Choose a report section
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Open individual HR, payroll, attendance, and compliance reports connected to the rest of the system.
            </p>
          </div>

          <Link href="/" className="secondary-button">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        {reportCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="section-card group block transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-700">
              {card.icon}
            </div>

            <h3 className="mt-6 break-words text-xl font-black text-slate-950 group-hover:text-blue-700">
              {card.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {card.description}
            </p>

            <span className="secondary-button mt-6">
              {card.action}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
