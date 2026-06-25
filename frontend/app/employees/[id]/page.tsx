"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";

type Employee = {
  id: number;
  fullName: string;
  email?: string;
  department?: string;
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
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Employee profile</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {employee?.fullName || "Employee details"}
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Review employee role, department, manager, and Philippine Peso salary information.
            </p>
          </div>

          <Link href="/employees" className="secondary-button">
            Back to employees
          </Link>
        </div>
      </section>

      <section className="section-card">
        {loading && <p className="text-slate-600">Loading employee...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error}</p>}

        {employee && (
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-2xl font-black">
                {employee.fullName.split(" ").map((name) => name[0]).slice(0, 2).join("")}
              </div>
              <h3 className="mt-5 break-words text-2xl font-black">{employee.fullName}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-300">{employee.position || "Employee"}</p>
              <span className="mt-5 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-300">
                {employee.status || "Active"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="Email" value={employee.email || "Not provided"} />
              <InfoCard label="Department" value={employee.department || "Unassigned"} />
              <InfoCard label="Manager" value={employee.manager || "Not assigned"} />
              <InfoCard label="Salary" value={formatCurrency(employee.salary)} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
