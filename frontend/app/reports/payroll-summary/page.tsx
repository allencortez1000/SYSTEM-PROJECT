"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";

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
      { label: "Gross payroll", value: pesos(values.grossPayroll || 0), detail: "Total earnings before deductions" },
      { label: "Net payout", value: pesos(values.netPayout || 0), detail: "Final employee payout" },
      { label: "SSS total", value: pesos(values.sssTotal || 0), detail: "Employee statutory contributions" },
      { label: "Pag-IBIG total", value: pesos(values.pagIbigTotal || 0), detail: "Pag-IBIG deductions" },
      { label: "PhilHealth total", value: pesos(values.philHealthTotal || 0), detail: "PhilHealth deductions" },
      { label: "Other deductions", value: pesos(values.otherDeductions || 0), detail: "Loans and adjustments" },
    ];
  }, [data.metrics]);

  const departments = data.departments || [];

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
              Live payroll totals, net payout, statutory deductions, and department-level payroll cost from Supabase.
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

      {loading && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading payroll summary from Supabase...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((row) => (
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

        {!loading && departments.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No department payroll data found in Supabase yet.</p>
        )}

        {departments.length > 0 && (
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
                    <td className="font-bold text-slate-700">{pesos(department.amount)}</td>
                    <td>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Live
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
