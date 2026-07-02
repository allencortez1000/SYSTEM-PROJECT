import Link from "next/link";
import {
  CreditCardIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const reportCards = [
  {
    title: "Payroll summary",
    description: "Monthly payroll totals, taxes, deductions, and net pay.",
    href: "/reports/payroll-summary",
    icon: CreditCardIcon,
    gradient: "from-blue-500 to-cyan-500",
    iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
    action: "Open payroll report",
  },
  {
    title: "Headcount movement",
    description: "Hiring, exits, transfers, and department growth.",
    href: "/reports/headcount-movement",
    icon: UsersIcon,
    gradient: "from-blue-600 to-cyan-500",
    iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
    action: "Open headcount report",
  },
  {
    title: "Attendance insights",
    description: "Absence trends, remote work, overtime, and punctuality.",
    href: "/reports/attendance-insights",
    icon: ClockIcon,
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600",
    action: "Open attendance report",
  },
  {
    title: "Compliance packet",
    description: "Labor reports and audit-ready filing exports.",
    href: "/reports/compliance-packet",
    icon: ShieldCheckIcon,
    gradient: "from-cyan-500 to-blue-600",
    iconBg: "bg-gradient-to-br from-cyan-50 to-blue-50",
    iconColor: "text-cyan-600",
    action: "Open compliance report",
  },
];

export default function ReportsPage() {
  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reports studio</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Open individual HR, payroll, attendance, and compliance reports.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        {reportCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col rounded-[0.875rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:border-blue-200"
            >
              {/* Icon */}
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                <IconComponent className={`h-6 w-6 ${card.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {card.title}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {card.description}
              </p>

              {/* Action link */}
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                {card.action}
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
