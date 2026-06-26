"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";
import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

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
      {
        label: "Total employees",
        value: String(values.totalEmployees || 0),
        detail: `${values.activeEmployees || 0} active employees`,
        icon: UsersIcon,
        gradient: "from-purple-500 to-pink-500",
        iconBg: "bg-gradient-to-br from-purple-50 to-pink-50",
        iconColor: "text-purple-600",
      },
      {
        label: "New hires",
        value: String(values.newHires || 0),
        detail: "Created or hired this month",
        icon: UserPlusIcon,
        gradient: "from-emerald-500 to-teal-500",
        iconBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
        iconColor: "text-emerald-600",
      },
      {
        label: "Exits",
        value: String(values.exits || 0),
        detail: "Terminated or exited this month",
        icon: UserMinusIcon,
        gradient: "from-red-500 to-pink-500",
        iconBg: "bg-gradient-to-br from-red-50 to-pink-50",
        iconColor: "text-red-600",
      },
      {
        label: "Departments",
        value: String(values.departments || 0),
        detail: "Departments with employees",
        icon: BuildingOfficeIcon,
        gradient: "from-blue-500 to-cyan-500",
        iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
        iconColor: "text-blue-600",
      },
    ];
  }, [data.metrics]);

  const movementRows = data.departments || [];

  return (
    <div className="page-shell">
      <section className="hero-panel relative overflow-hidden">
        {/* Gradient background decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 opacity-50 blur-3xl" />

        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <p className="eyebrow">People report</p>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Headcount movement
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Track hiring, exits, and department-level workforce growth from Supabase employee records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/employees"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Open employees
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
            <p className="text-sm font-semibold text-slate-600">Loading headcount movement from Supabase...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <article
              key={metric.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${metric.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />

              <div className="relative flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${metric.iconBg} shadow-sm transition-all group-hover:scale-110`}>
                  <IconComponent className={`h-6 w-6 ${metric.iconColor}`} />
                </div>
              </div>

              <p className="relative mt-4 text-sm font-bold text-slate-500">{metric.label}</p>
              <p className="relative mt-2 break-words text-3xl font-black text-slate-950">{metric.value}</p>
              <p className="relative mt-2 text-sm font-semibold text-slate-500">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="section-card relative overflow-hidden">
        {/* Gradient decoration */}
        <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 opacity-30 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
              <ChartBarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="eyebrow">Movement table</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Department movement</h3>
            </div>
          </div>

          {!loading && movementRows.length === 0 && (
            <p className="mt-6 text-sm text-slate-500">No employee records found in Supabase yet.</p>
          )}

          {movementRows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="soft-table">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <th>Department</th>
                      <th>Start</th>
                      <th>Hired</th>
                      <th>Exited</th>
                      <th>Ending</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {movementRows.map((row) => (
                      <tr key={row.department} className="transition-colors hover:bg-gradient-to-r hover:from-slate-50 hover:to-white">
                        <td className="font-black text-slate-950">{row.department}</td>
                        <td className="font-semibold text-slate-600">{row.start}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1 text-sm font-black text-emerald-700">
                            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                            +{row.hired}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-50 to-pink-50 px-3 py-1 text-sm font-black text-red-600">
                            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                            -{row.exited}
                          </span>
                        </td>
                        <td className="font-black text-slate-950">{row.ending}</td>
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
