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
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
    const token = localStorage.getItem("hr_token");
    void fetch(`/api/employees/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {}).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok) setEmployee(data.employee || null);
    });
  });

  return (
    <div className="page-shell">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white shadow-sm">
            {employee?.fullName?.split(" ").map((name) => name?.[0] ?? "").filter(Boolean).slice(0, 2).join("") || "?"}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee Profile</p>
            <h1 className="text-xl font-black tracking-tight text-slate-950">{employee?.fullName || "Employee details"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/employees" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to employees
          </Link>
          <Link href={`/employees/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Employee
          </Link>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-6 0h6" />
            </svg>
            {deleting ? "Deleting..." : "Delete Employee"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-[0.875rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-md rounded-[0.875rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h18.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-950">Delete employee?</h3>
                <p className="mt-2 text-sm text-slate-600">This action can only be performed by the super admin and cannot be undone.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    const token = localStorage.getItem("hr_token");
                    const res = await fetch(`/api/employees/${id}`, {
                      method: "DELETE",
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data?.message || data?.error || "Failed to delete employee");
                    }
                    setDeleteModalOpen(false);
                    window.location.href = "/employees";
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details */}
      {employee && (
        <div className="rounded-[0.875rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[0.6fr_1.4fr]">
            {/* Profile Card */}
            <div className="rounded-[0.875rem] border border-slate-100 bg-slate-50 p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-600 text-2xl font-black text-white shadow-sm">
                {employee.fullName.split(" ").map((name) => name?.[0] ?? "").filter(Boolean).slice(0, 2).join("")}
              </div>
              <h3 className="mt-4 break-words text-xl font-black text-slate-950">{employee.fullName}</h3>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {employee.position || "Employee"}
              </p>
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${/^(active)$/i.test(employee.status || "") ? "bg-emerald-100 text-emerald-700" : /^(inactive|terminated)$/i.test(employee.status || "") ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${/^(active)$/i.test(employee.status || "") ? "bg-emerald-500" : /^(inactive|terminated)$/i.test(employee.status || "") ? "bg-red-500" : "bg-slate-400"}`}></span>
                  {employee.status || "Active"}
                </span>
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
    <div className={`group relative min-w-0 overflow-hidden rounded-[0.875rem] border ${highlight ? "md:col-span-2 border-slate-200" : "border-slate-100"} bg-white p-5 shadow-sm transition hover:shadow-md`}>
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-slate-50 to-blue-50 blur-2xl opacity-50 transition group-hover:opacity-100"></div>
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
            {icon}
          </div>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`mt-2 break-words font-black text-slate-950 ${highlight ? "text-2xl" : "text-xl"}`}>{value}</p>
      </div>
    </div>
  );
}
