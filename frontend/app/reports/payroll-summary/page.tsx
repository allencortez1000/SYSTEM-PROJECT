"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/status-badge";
import SummaryMetricCard from "../../components/summary-metric-card";

import {
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  HomeIcon,
  HeartIcon,
  ReceiptPercentIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

const API_BASE = "/api";

type PayrollSummaryResponse = {
  metrics?: {
    grossPayroll?: number;
    netPayout?: number;
    sssTotal?: number;
    pagIbigTotal?: number;
    philHealthTotal?: number;
    otherDeductions?: number;
    payrollRuns?: number;
    totalSundayRestDays?: number;
    totalSundayOtHours?: number;
    sundayPremiumRuns?: number;
  };
  departments?: Array<{
    name: string;
    employees: number;
    amount: number;
  }>;
  payrollRuns?: Array<{
    id: string;
    runCode: string;
    runType: string;
    payPeriodLabel: string;
    payoutDate: string;
    status: string;
    grossPayroll: number;
    netPayout: number;
    sundayRestDayCount: number;
    sundayOvertimeHours: number;
    hasSundayPremium: boolean;
  }>;
  error?: string | null;
};

function pesos(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PayrollSummaryReportPage() {
  const [data, setData] = useState<PayrollSummaryResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runTypeFilter, setRunTypeFilter] = useState<"all" | "PR" | "OFFICE">("all");
  const [showSundayOnly, setShowSundayOnly] = useState(false);

  async function loadReport() {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/data/reports/payroll-summary`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to load payroll summary from Supabase");
      setData(payload);
      if (payload?.error) setError(payload.error);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const metrics = useMemo(() => {
    const values = data.metrics || {};
    return [
      {
        label: "Gross payroll",
        value: pesos(values.grossPayroll || 0),
        detail: "Total earnings before deductions",
        icon: BanknotesIcon,
        gradient: "from-blue-500 to-cyan-500",
        iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
        iconColor: "text-blue-600",
      },
      {
        label: "Net payout",
        value: pesos(values.netPayout || 0),
        detail: "Final employee payout",
        icon: CreditCardIcon,
        gradient: "from-emerald-500 to-teal-500",
        iconBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
        iconColor: "text-emerald-600",
      },
      {
        label: "SSS total",
        value: pesos(values.sssTotal || 0),
        detail: "Employee statutory contributions",
        icon: ShieldCheckIcon,
        gradient: "from-blue-600 to-cyan-500",
        iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
        iconColor: "text-blue-600",
      },
      {
        label: "Pag-IBIG total",
        value: pesos(values.pagIbigTotal || 0),
        detail: "Pag-IBIG deductions",
        icon: HomeIcon,
        gradient: "from-cyan-500 to-blue-600",
        iconBg: "bg-gradient-to-br from-cyan-50 to-blue-50",
        iconColor: "text-cyan-600",
      },
      {
        label: "PhilHealth total",
        value: pesos(values.philHealthTotal || 0),
        detail: "PhilHealth deductions",
        icon: HeartIcon,
        gradient: "from-red-500 to-pink-500",
        iconBg: "bg-gradient-to-br from-red-50 to-pink-50",
        iconColor: "text-red-600",
      },
      {
        label: "Other deductions",
        value: pesos(values.otherDeductions || 0),
        detail: "Loans and adjustments",
        icon: ReceiptPercentIcon,
        gradient: "from-slate-500 to-slate-600",
        iconBg: "bg-gradient-to-br from-slate-50 to-slate-100",
        iconColor: "text-slate-600",
      },
      {
        label: "Sunday rest days",
        value: String(values.totalSundayRestDays || 0),
        detail: "Total Sunday/rest-day workdays across saved payroll runs",
        icon: CheckBadgeIcon,
        gradient: "from-amber-500 to-orange-500",
        iconBg: "bg-gradient-to-br from-amber-50 to-orange-50",
        iconColor: "text-amber-600",
      },
      {
        label: "Sunday OT hours",
        value: String(values.totalSundayOtHours || 0),
        detail: "Total Sunday overtime hours captured in payroll history",
        icon: CheckBadgeIcon,
        gradient: "from-violet-500 to-fuchsia-500",
        iconBg: "bg-gradient-to-br from-violet-50 to-fuchsia-50",
        iconColor: "text-violet-600",
      },
      {
        label: "Runs with Sunday premium",
        value: String(values.sundayPremiumRuns || 0),
        detail: "Saved payroll runs that include Sunday/rest-day premium activity",
        icon: CheckBadgeIcon,
        gradient: "from-cyan-500 to-blue-600",
        iconBg: "bg-gradient-to-br from-cyan-50 to-blue-50",
        iconColor: "text-cyan-600",
      },
    ];
  }, [data.metrics]);

  const departments = data.departments || [];
  const payrollRuns = data.payrollRuns || [];
  const filteredRuns = payrollRuns.filter((run) => {
    if (runTypeFilter !== "all" && run.runType !== runTypeFilter) return false;
    if (showSundayOnly && !run.hasSundayPremium) return false;
    return true;
  });

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
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <p className="eyebrow">Payroll report</p>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Payroll summary
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Live payroll totals, net payout, statutory deductions, and department-level payroll cost from Supabase.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadReport()}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Refresh report
            </button>
            <Link
              href="/payroll"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
            >
              Open payroll center
            </Link>
            <Link
              href="/reports"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      {loading && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            <p className="text-sm font-semibold text-slate-600">Loading payroll summary from Supabase...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((row) => {
          const IconComponent = row.icon;
          return (
            <SummaryMetricCard
              key={row.label}
              label={row.label}
              value={row.value}
              detail={row.detail}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              badge={
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${row.iconBg} shadow-sm transition-all group-hover:scale-110`}>
                  <IconComponent className={`h-6 w-6 ${row.iconColor}`} />
                </div>
              }
            />
          );
        })}
      </section>

      <section className="section-card relative overflow-hidden">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Sunday premium visibility</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">Payroll runs with Sunday/rest-day activity</h3>
            <p className="mt-2 text-sm text-slate-600">Filter the saved payroll history to focus on runs that include Sunday rest-day work or Sunday overtime.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Run type</span>
              <select value={runTypeFilter} onChange={(event) => setRunTypeFilter(event.target.value as "all" | "PR" | "OFFICE")} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <option value="all">All runs</option>
                <option value="PR">Worker payroll</option>
                <option value="OFFICE">Office payroll</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={showSundayOnly} onChange={(event) => setShowSundayOnly(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Show only Sunday-premium runs
            </label>
          </div>
        </div>

        {!loading && filteredRuns.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No payroll runs match the current Sunday/rest-day filters.</p>
        ) : null}

        {filteredRuns.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="soft-table">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <th>Run</th>
                    <th>Type</th>
                    <th>Pay period</th>
                    <th>Sunday rest days</th>
                    <th>Sunday OT hours</th>
                    <th>Gross</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredRuns.map((run) => (
                    <tr key={run.id || run.runCode} className="transition-colors hover:bg-gradient-to-r hover:from-slate-50 hover:to-white">
                      <td>
                        <div>
                          <p className="font-black text-slate-950">{run.runCode || "Saved payroll run"}</p>
                          <p className="text-xs text-slate-500">Payout: {run.payoutDate || "—"}</p>
                        </div>
                      </td>
                      <td><StatusBadge tone={run.runType === "PR" ? "blue" : "slate"} size="md">{run.runType || "Unknown"}</StatusBadge></td>
                      <td className="font-semibold text-slate-600">{run.payPeriodLabel || "—"}</td>
                      <td className="font-black text-amber-700">{run.sundayRestDayCount}</td>
                      <td className="font-black text-violet-700">{run.sundayOvertimeHours}</td>
                      <td className="font-bold text-slate-700">{pesos(run.grossPayroll || 0)}</td>
                      <td>
                        {run.hasSundayPremium ? <StatusBadge tone="amber" size="md">Sunday premium</StatusBadge> : <StatusBadge tone="emerald" size="md">No Sunday premium</StatusBadge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="section-card relative overflow-hidden">
        {/* Gradient decoration */}
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 opacity-30 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="eyebrow">Department breakdown</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Payroll by department</h3>
            </div>
          </div>

          {!loading && departments.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No department payroll data found in Supabase yet.</p>
          )}

          {departments.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="soft-table">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <th>Department</th>
                      <th>Employees</th>
                      <th>Payroll amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {departments.map((department) => (
                      <tr key={department.name} className="transition-colors hover:bg-gradient-to-r hover:from-slate-50 hover:to-white">
                        <td className="font-black text-slate-950">{department.name}</td>
                        <td className="font-semibold text-slate-600">{department.employees}</td>
                        <td className="font-bold text-slate-700">{pesos(department.amount)}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1 text-xs font-black text-emerald-700">
                            <CheckBadgeIcon className="h-3.5 w-3.5" />
                            Live
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
