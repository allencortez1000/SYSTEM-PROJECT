"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNotification } from "../components/notification";

type Employee = {
  id: number;
  fullName: string;
  position: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotification();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:4000/api/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        setEmployees(data.employees || []);
        notify("Employees loaded");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Employee directory</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Manage your workforce</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              View employee profiles, roles, departments, and compensation information from one clean workspace.
            </p>
          </div>
          <Link href="/employees/new" className="primary-button">Add employee</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Active staff", employees?.length ?? 0],
          ["Departments", 8],
          ["Open updates", 12],
        ].map(([label, value]) => (
          <div key={label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="section-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">People</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Employee records</h3>
          </div>
          <Link href="/" className="secondary-button">Dashboard</Link>
        </div>

        {loading && <p className="mt-6 text-slate-600">Loading employees...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees?.map((employee) => {
            const initials = employee.fullName
              .split(" ")
              .map((name) => name[0])
              .slice(0, 2)
              .join("");

            return (
              <Link
                key={employee.id}
                href={`/employees/${employee.id}`}
                className="group rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 font-black text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="font-black text-slate-950 group-hover:text-blue-700">{employee.fullName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{employee.position}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">Active</span>
                  <span className="font-bold text-slate-400">View profile →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
