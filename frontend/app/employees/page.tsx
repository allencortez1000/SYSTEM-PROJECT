"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNotification } from "../components/notification";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email?: string | null;
  department: string;
  position: string;
  status: string;
  salary: number;
  salaryBasis?: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotification();

  const employeeList = employees ?? [];
  const stats = useMemo(() => {
    const activeStaff = employeeList.filter((employee) => String(employee.status || "").toLowerCase() === "active").length;
    const departments = new Set(employeeList.map((employee) => employee.department).filter(Boolean)).size;

    return {
      activeStaff,
      departments,
      totalRecords: employeeList.length,
    };
  }, [employeeList]);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("hr_token");
        const res = await fetch("/api/employees", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || data?.message || "Failed to fetch employees");
        }

        setEmployees(data.employees || []);
        setError(null);
        notify("Employees loaded");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [notify]);

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
          ["Active staff", stats.activeStaff],
          ["Departments", stats.departments],
          ["Records loaded", stats.totalRecords],
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
            const displayName = employee.fullName || "Unnamed employee";
            const initials = displayName
              .split(" ")
              .map((name) => name[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("");
            const status = String(employee.status || "");
            const isActive = status.toLowerCase() === "active";
            const salaryBasis = employee.salaryBasis || "Not set";
            const salaryLabel = Number.isFinite(employee.salary) && employee.salary > 0
              ? `₱${employee.salary.toLocaleString()}`
              : "Salary not set";

            return (
              <Link
                key={employee.id}
                href={`/employees/${employee.id}`}
                className="group rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 font-black text-white">
                    {initials || "?"}
                  </div>
                  <div>
                    <p className="font-black text-slate-950 group-hover:text-blue-700">{displayName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{employee.position || "No position set"}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{employee.department || "No department set"}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-500">Employee No:</span> {employee.employeeId || "Not assigned"}</p>
                  <p><span className="font-semibold text-slate-500">Email:</span> {employee.email || "No email on file"}</p>
                  <p><span className="font-semibold text-slate-500">Salary basis:</span> {salaryBasis}</p>
                  <p><span className="font-semibold text-slate-500">Salary:</span> {salaryLabel}</p>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className={`rounded-full px-3 py-1 font-bold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {status || "Unknown"}
                  </span>
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
