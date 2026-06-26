"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";
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
  };
  departments?: Array<{
    name: string;
    employees: number;
    amount: number;
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/data/reports/payroll-summary`, { cache: "no-store" });
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

    load();
  }, []);

  useSupabaseTableRefresh([
    { table: "employees" },
    { table: "payroll_runs" },
    { table: "payroll_items" },
  ], () => {
    void fetch(`${API_BASE}/data/reports/payroll-summary`, { cache: "no-store" }).then(async (res) => {
      const payload = await res.json();
      if (res.ok) setData(payload);
    });
  });

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
        gradient: "from-purple-500 to-pink-500",
        iconBg: "bg-gradient-to-br from-purple-50 to-pink-50",
        iconColor: "text-purple-600",
      },
      {
        label: "Pag-IBIG total",
        value: pesos(values.pagIbigTotal || 0),
        detail: "Pag-IBIG deductions",
        icon: HomeIcon,
        gradient: "from-amber-500 to-orange-500",
        iconBg: "bg-gradient-to-br from-amber-50 to-orange-50",
        iconColor: "text-amber-600",
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
    ];
  }, [data.metrics]);

  const departments = data.departments || [];

  return (
    <div className="page-shell">
      <section className="hero-panel relative overflow-hidden">
        {/* Gradient background decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-tr from-cyan-100 to-blue-100 opacity-50 blur-3xl" />

        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
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
            <Link
              href="/payroll"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
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
            <article
              key={row.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${row.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${row.iconBg} shadow-sm transition-all group-hover:scale-110`}>
                  <IconComponent className={`h-6 w-6 ${row.iconColor}`} />
                </div>
              </div>

              <p className="relative mt-4 text-sm font-bold text-slate-500">{row.label}</p>
              <p className="relative mt-2 break-words text-3xl font-black text-slate-950">{row.value}</p>
              <p className="relative mt-2 text-sm font-semibold text-slate-500">{row.detail}</p>
            </article>
          );
        })}
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
