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
      <section className="hero-panel relative overflow-hidden">
        {/* Gradient background decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-tr from-cyan-100 to-blue-100 opacity-50 blur-3xl" />

        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <p className="eyebrow">Reports studio</p>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Choose a report section
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Open individual HR, payroll, attendance, and compliance reports connected to the rest of the system.
            </p>
          </div>

          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid min-w-0 gap-6 md:grid-cols-2">
        {reportCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />

              {/* Icon */}
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBg} shadow-sm transition-all group-hover:scale-110 group-hover:shadow-md`}>
                <IconComponent className={`h-7 w-7 ${card.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="relative mt-6 break-words text-xl font-black text-slate-950 transition-colors group-hover:bg-gradient-to-r group-hover:from-slate-950 group-hover:to-slate-700 group-hover:bg-clip-text group-hover:text-transparent">
                {card.title}
              </h3>

              <p className="relative mt-3 text-sm leading-6 text-slate-600">
                {card.description}
              </p>

              {/* Action button */}
              <div className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all group-hover:bg-gradient-to-r group-hover:from-slate-100 group-hover:to-slate-50">
                {card.action}
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
