"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  "bg-blue-600",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

function pesos(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
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
    }

    load();
  }, []);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(
      (e) => (e.status || "Active").toLowerCase() === "active",
    ).length;
    const payrollCost = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const presentToday = attendance.filter(
      (r) => r.date === today && r.status === "Present",
    ).length;
    const onLeave = attendance.filter((r) => r.status === "Leave").length;

    const deptMap = new Map<string, number>();
    employees.forEach((e) => {
      const dept = e.department || "Unassigned";
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });
    const maxDept = Math.max(1, ...Array.from(deptMap.values()));
    const departments = Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], index) => ({
        name,
        count,
        value: Math.round((count / maxDept) * 100),
        color: deptColors[index % deptColors.length],
      }));

    return { totalEmployees, activeEmployees, payrollCost, presentToday, onLeave, departments };
  }, [employees, attendance]);

  const metrics = [
    { title: "Total Employees", value: String(stats.totalEmployees), detail: `${stats.activeEmployees} active`, icon: "👥", tone: "bg-blue-50 text-blue-700" },
    { title: "Monthly Payroll Cost", value: pesos(stats.payrollCost), detail: "Sum of all salaries", icon: "💳", tone: "bg-emerald-50 text-emerald-700" },
    { title: "Present Today", value: String(stats.presentToday), detail: "From attendance records", icon: "✅", tone: "bg-amber-50 text-amber-700" },
    { title: "On Leave", value: String(stats.onLeave), detail: "Recorded leave entries", icon: "🌴", tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Executive dashboard</p>
            <h2 className="mt-4 max-w-3xl break-words text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Run payroll, people operations, and compliance with confidence.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              A modern HR command center showing live workforce data from your Supabase database.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/employees" className="primary-button">Manage employees</Link>
              <Link href="/payroll/new" className="secondary-button">Create payroll run</Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">Workforce snapshot</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
            </div>
            <p className="mt-5 text-5xl font-black">{stats.totalEmployees}</p>
            <p className="mt-2 text-sm text-slate-400">Total employee records currently stored in Supabase.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">{stats.activeEmployees}</p>
                <p className="text-slate-400">Active</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">{stats.presentToday}</p>
                <p className="text-slate-400">Present</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-lg font-black">{stats.onLeave}</p>
                <p className="text-slate-400">On leave</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Loading live data from Supabase...
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.title} className="metric-card">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{metric.title}</p>
                <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{metric.value}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${metric.tone}`}>
                {metric.icon}
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="section-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Workforce analytics</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Headcount by department</h3>
            </div>
            <Link href="/reports" className="secondary-button">View reports</Link>
          </div>

          <div className="mt-6 space-y-5">
            {stats.departments.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No employees found yet. Add employees to see department data.</p>
            )}
            {stats.departments.map((department) => (
              <div key={department.name}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <p className="font-bold text-slate-700">{department.name}</p>
                  <p className="text-right text-slate-500">{department.count} staff</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${department.color}`} style={{ width: `${department.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="section-card">
          <p className="eyebrow">People directory</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Latest employees</h3>
          <div className="mt-6 space-y-3">
            {employees.slice(0, 5).map((employee) => {
              const initials = employee.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("");
              return (
                <Link
                  key={employee.id}
                  href={`/employees/${employee.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 transition hover:bg-white hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-sm font-black text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{employee.fullName}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{employee.position} · {employee.department}</p>
                  </div>
                </Link>
              );
            })}
            {employees.length === 0 && !loading && (
              <p className="text-sm text-slate-500">No employees found yet.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
