"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";

type Employee = {
  id: number;
  fullName: string;
  email?: string;
  department?: string;
  projectSite?: string;
  position?: string;
  salary?: number;
  status?: string;
  manager?: string;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function formatCurrency(value?: number) {
  return currency.format(Number.isFinite(value) ? Number(value) : 0);
}

export default function EmployeeDetail() {
  const params = useParams();
  const id = params?.id ?? "0";
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("hr_token");
        const res = await fetch(`/api/employees/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || "Employee not found");
        setEmployee(data.employee || null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  useSupabaseTableRefresh([{ table: "employees" }], () => {
    if (!id) return;
    void fetch(`/api/employees/${id}`).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok) setEmployee(data.employee || null);
    });
  });

  return (
    <div className="page-shell">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-white/90">Employee profile</p>
            </div>
            <h2 className="mt-4 break-words text-3xl font-black tracking-tight sm:text-5xl">
              {employee?.fullName || "Employee details"}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-white/90">
              Review employee role, department, manager, and Philippine Peso salary information.
            </p>
          </div>

          <Link href="/employees" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to employees
          </Link>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center">
              <svg className="h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Loading employee details...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-pink-50 p-6 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-900">Error loading employee</p>
            <p className="mt-1 text-sm font-semibold text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Employee Details */}
      {employee && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-[0.6fr_1.4fr]">
            {/* Profile Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
              <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-400/20 blur-3xl"></div>
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-3xl font-black shadow-2xl">
                  {employee.fullName.split(" ").map((name) => name[0]).slice(0, 2).join("")}
                </div>
                <h3 className="mt-6 break-words text-3xl font-black">{employee.fullName}</h3>
                <p className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-300">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {employee.position || "Employee"}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/20 px-4 py-2 backdrop-blur-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                  <span className="text-sm font-black text-emerald-300">{employee.status || "Active"}</span>
                </div>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid gap-5 md:grid-cols-2">
              <InfoCard
                label="Email"
                value={employee.email || "Not provided"}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                gradient="from-blue-500 to-cyan-500"
              />
              <InfoCard
                label="Department"
                value={employee.department || "Unassigned"}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                gradient="from-blue-600 to-cyan-500"
              />
              <InfoCard
                label="Project site"
                value={employee.projectSite || "Unassigned"}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                gradient="from-cyan-500 to-blue-600"
              />
              <InfoCard
                label="Manager"
                value={employee.manager || "Not assigned"}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                gradient="from-teal-500 to-emerald-500"
              />
              <InfoCard
                label="Monthly Salary"
                value={formatCurrency(employee.salary)}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                gradient="from-green-500 to-lime-500"
                highlight
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  highlight?: boolean;
};

function InfoCard({ label, value, icon, gradient, highlight }: InfoCardProps) {
  return (
    <div className={`group relative min-w-0 overflow-hidden rounded-3xl border ${highlight ? "md:col-span-2 border-slate-200" : "border-slate-100"} bg-white p-6 shadow-lg transition hover:shadow-xl`}>
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-slate-50 to-blue-50 blur-2xl opacity-50 transition group-hover:opacity-100"></div>
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            {icon}
          </div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-2 break-words font-black text-slate-950 ${highlight ? "text-3xl" : "text-xl"}`}>{value}</p>
      </div>
    </div>
  );
}
