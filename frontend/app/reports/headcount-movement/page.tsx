"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";

const API_BASE = "/api";

type HeadcountResponse = {
  metrics?: {
    totalEmployees?: number;
    activeEmployees?: number;
    newHires?: number;
    exits?: number;
    departments?: number;
  };
  departments?: Array<{
    department: string;
    start: number;
    hired: number;
    exited: number;
    ending: number;
  }>;
  error?: string | null;
};

export default function HeadcountMovementReportPage() {
  const [data, setData] = useState<HeadcountResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/data/reports/headcount-movement`, { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to load headcount report from Supabase");
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

  useSupabaseTableRefresh([{ table: "employees" }, { table: "employee_project_deployments" }], () => {
    void fetch(`${API_BASE}/data/reports/headcount-movement`, { cache: "no-store" }).then(async (res) => {
      const payload = await res.json();
      if (res.ok) setData(payload);
    });
  });

  const metrics = useMemo(() => {
    const values = data.metrics || {};
    return [
      { label: "Total employees", value: String(values.totalEmployees || 0), detail: `${values.activeEmployees || 0} active employees` },
      { label: "New hires", value: String(values.newHires || 0), detail: "Created or hired this month" },
      { label: "Exits", value: String(values.exits || 0), detail: "Terminated or exited this month" },
      { label: "Departments", value: String(values.departments || 0), detail: "Departments with employees" },
    ];
  }, [data.metrics]);

  const movementRows = data.departments || [];

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
              Track hiring, exits, and department-level workforce growth from Supabase employee records.
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

      {loading && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading headcount movement from Supabase...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

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

        {!loading && movementRows.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No employee records found in Supabase yet.</p>
        )}

        {movementRows.length > 0 && (
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
        )}
      </section>
    </div>
  );
}
