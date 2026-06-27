"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSupabaseTableRefresh } from "../lib/supabaseRealtime";

const API_BASE = "/api";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  status: string;
  salary: number;
};

type AttendanceRecord = {
  id: string;
  employeeName: string;
  date: string;
  status: string;
};

const deptColors = [
  "from-blue-600 to-cyan-400",
  "from-cyan-500 to-blue-500",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-emerald-600",
  "from-slate-700 to-slate-900",
  "from-cyan-400 to-blue-600",
];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function pesos(value: number) {
  return pesoFormatter.format(value || 0);
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (employees.length === 0) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("hr_token");
      const fetchOptions = token
        ? ({ headers: { Authorization: `Bearer ${token}` } } as const)
        : undefined;

      const [empRes, attRes] = await Promise.all([
        fetch(`${API_BASE}/employees`, fetchOptions),
        fetch(`${API_BASE}/attendance`, fetchOptions),
      ]);

      if (!empRes.ok) {
        const details = await empRes.json().catch(() => null);
        if (empRes.status === 401) {
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_user");
          window.location.reload();
          return;
        }
        throw new Error(details?.error || details?.message || "Failed to load employees from Supabase");
      }

      const empData = await empRes.json();
      setEmployees(empData.employees || []);

      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.attendance || []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 30000);

    const onFocus = () => {
      void load();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useSupabaseTableRefresh(["employees", "attendance_records"].map((table) => ({ table })), () => {
    void load();
  });

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
      (e) => (e.status || "Active").toLowerCase() === "active",
    ).length;
    const payrollCost = employees
      .filter((e) => String(e.status || "").toLowerCase() === "active" || String(e.status || "") === "")
      .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const presentToday = attendance.filter(
      (r) => r.date === today && r.status === "Present",
    ).length;
    const onLeave = attendance.filter((r) => r.date === today && r.status === "Leave").length;

    const deptMap = new Map<string, number>();
    employees.forEach((e) => {
      const dept = e.department || "Unassigned";
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    const departments = Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], index) => ({
        name,
        count,
        value: Math.round((count / Math.max(1, totalEmployees)) * 100),
        color: deptColors[index % deptColors.length],
      }));

    return { totalEmployees, activeEmployees, payrollCost, presentToday, onLeave, departments };
  }, [employees, attendance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-lg shadow-slate-900/20 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                Live Dashboard
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                HR Command Center
              </h1>
              <p className="mt-4 text-lg text-slate-300">
                Manage payroll, people operations, and compliance with real-time workforce data from Supabase.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/employees"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Manage Employees
                </Link>
                <Link
                  href="/payroll/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Create Payroll
                </Link>
              </div>
            </div>

            {/* Live Stats Widget */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-6 shadow-xl shadow-black/20 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">Workforce Overview</h3>
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
                </span>
              </div>
              <div className="mt-4 text-5xl font-black text-white">{stats.totalEmployees}</div>
              <p className="mt-1 text-sm text-slate-300">Total Employees</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold text-white">{stats.activeEmployees}</div>
                  <div className="mt-1 text-xs text-slate-300">Active</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold text-white">{stats.presentToday}</div>
                  <div className="mt-1 text-xs text-slate-300">Present</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl font-bold text-white">{stats.onLeave}</div>
                  <div className="mt-1 text-xs text-slate-300">On Leave</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="mb-8 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error loading dashboard</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Employees */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Employees</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalEmployees}</p>
                <p className="mt-1 text-sm font-medium text-green-600">{stats.activeEmployees} active</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Monthly Payroll */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Monthly Payroll</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{pesos(stats.payrollCost)}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">Total cost</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Present Today */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Present Today</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats.presentToday}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">Attendance records</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* On Leave */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">On Leave</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stats.onLeave}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">Leave entries</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-3">
                <svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Department Analytics & Latest Employees */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Department Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Department Distribution</h3>
                <p className="mt-1 text-sm text-slate-600">Headcount by department</p>
              </div>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-slate-50"
              >
                <span>Reports</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {stats.departments.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-600">No departments yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add employees to see distribution</p>
                </div>
              )}
              {stats.departments.map((department, index) => (
                <div key={department.name} className="group">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${department.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                        {department.count}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{department.name}</p>
                        <p className="text-sm text-slate-500">{department.value}% of staff</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-400">{department.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${department.color} transition-all duration-500`}
                      style={{ width: `${department.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest Employees */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Employees</h3>
                <p className="mt-1 text-sm text-slate-600">Latest additions</p>
              </div>
              <Link
                href="/employees"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {[...employees]
                .sort((a, b) => new Date((b as any).createdAt || (b as any).created_at || 0).getTime() - new Date((a as any).createdAt || (a as any).created_at || 0).getTime())
                .slice(0, 5)
                .map((employee) => {
                const initials = employee.fullName
                  .split(" ")
                  .map((n: string) => n?.[0] ?? "")
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("");
                const isActive = (employee.status || "Active").toLowerCase() === "active";
                return (
                  <Link
                    key={employee.id}
                    href={`/employees/${employee.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-blue-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 group-hover:text-blue-600">
                        {employee.fullName}
                      </p>
                      <p className="truncate text-sm text-slate-600">
                        {employee.position} · {employee.department}
                      </p>
                    </div>
                    <div className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                      isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {employee.status || "Active"}
                    </div>
                  </Link>
                );
              })}
              {employees.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-600">No employees yet</p>
                  <Link href="/employees/new" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Add your first employee →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
