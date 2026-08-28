"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatusBadge from "./components/status-badge";
import SummaryMetricCard from "./components/summary-metric-card";
import { filterInputClassName } from "./components/filter-config";

import { canonicalDepartmentName, useSupabaseTableRefresh } from "../lib/supabaseRealtime";

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

type DataHealthMetrics = {
  activeEmployees: number;
  employeesMissingSalary: number;
  employeesMissingProjectSite: number;
  attendanceMissingProjectSite: number;
  attendanceUnlinkedEmployees: number;
  overrideIssues: number;
  totalIssues: number;
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
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dataHealth, setDataHealth] = useState<DataHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("All");

  const load = useCallback(async () => {
    if (employees.length === 0) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("hr_token");
      const fetchOptions = token
        ? ({ headers: { Authorization: `Bearer ${token}` } } as const)
        : undefined;

      const [empRes, attRes, healthRes] = await Promise.all([
        fetch(`${API_BASE}/employees?limit=0`, fetchOptions),
        fetch(`${API_BASE}/attendance`, fetchOptions),
        fetch(`${API_BASE}/data/health`, fetchOptions),
      ]);

      if (!empRes.ok) {
        const details = await empRes.json().catch(() => null);
        if (empRes.status === 401) {
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_user");
          router.replace("/login");
          return;
        }
        throw new Error(details?.error || details?.message || "Failed to load employees from Supabase");
      }

      const empData = await empRes.json();
      setEmployees(empData.employees || []);
      setEmployeeCount(Number(empData.count ?? empData.employees?.length ?? 0));

      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.attendance || []);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setDataHealth(healthData.metrics || null);
      } else {
        setDataHealth(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEmployees = useMemo(() => {
    if (employeeStatusFilter === "All") return employees;
    return employees.filter((employee) => String(employee.status || "").toLowerCase() === employeeStatusFilter.toLowerCase());
  }, [employees, employeeStatusFilter]);

  const stats = useMemo(() => {
    const totalEmployees = employeeCount || employees.length;
    const activeEmployees = filteredEmployees.filter(
      (e) => (e.status || "Active").toLowerCase() === "active",
    ).length;
    const payrollCost = filteredEmployees
      .filter((e) => String(e.status || "").toLowerCase() === "active" || String(e.status || "") === "")
      .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const presentToday = attendance.filter(
      (r) => r.date === today && r.status === "Present",
    ).length;
    const onLeave = attendance.filter((r) => r.date === today && r.status === "Leave").length;

    const deptMap = new Map<string, number>();
    filteredEmployees.forEach((e) => {
      const dept = e.department || "Unassigned";
      const canonicalDept = canonicalDepartmentName(dept);
      deptMap.set(canonicalDept, (deptMap.get(canonicalDept) || 0) + 1);
    });
    const departments = Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], index) => ({
        name,
        count,
        value: Math.round((count / Math.max(1, filteredEmployees.length)) * 100),
        color: deptColors[index % deptColors.length],
      }));

    return { totalEmployees, activeEmployees, payrollCost, presentToday, onLeave, departments };
  }, [employees, filteredEmployees, attendance]);

  const lastUpdated = useMemo(() => new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }), [employees, attendance, employeeStatusFilter, dataHealth]);

  const actionWidgets = useMemo(() => {
    const health = dataHealth || {
      activeEmployees: 0,
      employeesMissingSalary: 0,
      employeesMissingProjectSite: 0,
      attendanceMissingProjectSite: 0,
      attendanceUnlinkedEmployees: 0,
      overrideIssues: 0,
      totalIssues: 0,
    };

    return [
      {
        title: "Fix salary gaps",
        value: health.employeesMissingSalary,
        detail: health.employeesMissingSalary === 0 ? "All active employees have salary values saved." : "Active employees need salary values before payroll is finalized.",
        href: "/data-health",
        action: "Open Data Health",
        tone: health.employeesMissingSalary > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50",
        badge: health.employeesMissingSalary > 0 ? "Needs action" : "Clear",
      },
      {
        title: "Assign project sites",
        value: health.employeesMissingProjectSite + health.attendanceMissingProjectSite,
        detail: health.employeesMissingProjectSite + health.attendanceMissingProjectSite === 0 ? "Project-site assignments and attendance locations look complete." : "Employee or attendance records are missing project-site data.",
        href: "/data-health",
        action: "Review site issues",
        tone: health.employeesMissingProjectSite + health.attendanceMissingProjectSite > 0 ? "border-cyan-200 bg-cyan-50" : "border-emerald-200 bg-emerald-50",
        badge: health.employeesMissingProjectSite + health.attendanceMissingProjectSite > 0 ? "Review" : "Clear",
      },
      {
        title: "Resolve override issues",
        value: health.overrideIssues,
        detail: health.overrideIssues === 0 ? "Saved payroll overrides look complete." : "Incomplete or stale override rows should be checked before reuse.",
        href: "/data-health",
        action: "Review overrides",
        tone: health.overrideIssues > 0 ? "border-violet-200 bg-violet-50" : "border-emerald-200 bg-emerald-50",
        badge: health.overrideIssues > 0 ? "Attention" : "Clear",
      },
      {
        title: "Clean attendance links",
        value: health.attendanceUnlinkedEmployees,
        detail: health.attendanceUnlinkedEmployees === 0 ? "Attendance records are linked to employee records." : "Some attendance entries are not linked to any employee.",
        href: "/attendance",
        action: "Open attendance",
        tone: health.attendanceUnlinkedEmployees > 0 ? "border-slate-300 bg-slate-50" : "border-emerald-200 bg-emerald-50",
        badge: health.attendanceUnlinkedEmployees > 0 ? "Fix now" : "Clear",
      },
    ];
  }, [dataHealth]);

  return (
    <div className="page-shell">
        {/* Hero Section */}
        <div className="hero-panel mb-2">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Live Dashboard</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Rabino Home Builders Corporation</h1>
              <p className="mt-1 text-sm text-slate-200">Real-time workforce data · {stats.totalEmployees} employees</p>
              <p className="mt-2 text-sm text-slate-300">Workforce, payroll, and compliance visibility in one dashboard.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {stats.activeEmployees} active employees
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  {stats.departments.length} departments tracked
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <svg className="h-3.5 w-3.5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Updated {lastUpdated}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/employees" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Manage Employees
              </Link>
              <Link href="/payroll/new" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create Payroll
              </Link>
              <Link href="/data-health" className="inline-flex h-11 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/15">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Open Data Health
              </Link>
            </div>
          </div>
        </div>

        {/* Company Purpose */}
        <section className="mb-2 grid gap-4 lg:grid-cols-3">
          <div className="stat-card accent-blue flex min-h-[180px] flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Our Vision</p>
            <h2 className="mt-2 text-base font-black tracking-tight text-slate-950">Building lasting possibilities</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              To be a trusted leader in homebuilding and community development, transforming the dreams of Filipino families into lasting possibilities through innovative, quality, and sustainable homes.
            </p>
          </div>

          <div className="stat-card accent-cyan flex min-h-[180px] flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Our Mission</p>
            <h2 className="mt-2 text-base font-black tracking-tight text-slate-950">Turning dreams into possibilities</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Rabino Home Builders Corporation is committed to providing quality homes, innovative construction solutions, and exceptional customer service while building communities that inspire growth and lasting value.
            </p>
          </div>

          <div className="stat-card accent-slate flex min-h-[180px] flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Core Message</p>
            <h2 className="mt-2 text-base font-black tracking-tight text-slate-950">One home, one family, one community</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Every family deserves a place to call home. Through integrity, excellence, and innovation, we turn dreams into possibilities — one home, one family, and one community at a time.
            </p>
          </div>
        </section>

        {/* Loading & Error States */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        )}

        {error && (
          <div className="rounded-[0.875rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <section className="section-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Action center</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Items needing action today</h2>
              <p className="mt-1 text-sm text-slate-500">Focus first on the records most likely to block payroll accuracy and attendance reporting.</p>
            </div>
            <Link href="/data-health" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              Open Data Health
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {actionWidgets.map((widget) => (
              <Link
                key={widget.title}
                href={widget.href}
                className={`rounded-[1.25rem] border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${widget.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Action widget</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">{widget.title}</h3>
                  </div>
                  <StatusBadge tone="white" size="md">{widget.badge}</StatusBadge>
                </div>
                <p className="mt-4 text-3xl font-black text-slate-950">{widget.value}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{widget.detail}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-700">
                  {widget.action}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
          <SummaryMetricCard
            label="Total Employees"
            value={stats.totalEmployees}
            detail={<div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-emerald-600">{stats.activeEmployees} active team members</p><StatusBadge tone="emerald" size="md">Workforce stable</StatusBadge></div>}
            accentClassName="accent-blue"
          />
          <SummaryMetricCard
            label="Monthly Payroll"
            value={pesos(stats.payrollCost)}
            detail={<div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-600">Estimated active payroll cost</p><StatusBadge tone="emerald" size="md">Budget view</StatusBadge></div>}
            accentClassName="accent-emerald"
          />
          <SummaryMetricCard
            label="Present Today"
            value={stats.presentToday}
            detail={<div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-600">{stats.presentToday === 0 ? "No attendance records logged yet today" : "Employees logged as present today"}</p><StatusBadge tone={stats.presentToday === 0 ? "slate" : "cyan"} size="md">{stats.presentToday === 0 ? "Awaiting logs" : "Live today"}</StatusBadge></div>}
            accentClassName="accent-cyan"
          />
          <SummaryMetricCard
            label="On Leave"
            value={stats.onLeave}
            detail={<div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-600">{stats.onLeave === 0 ? "No employees currently recorded on leave" : "Employees currently marked on leave"}</p><StatusBadge tone={stats.onLeave === 0 ? "emerald" : "slate"} size="md">{stats.onLeave === 0 ? "Clear" : "Monitor"}</StatusBadge></div>}
            accentClassName="accent-slate"
          />
        </div>

        {/* Department Analytics & Latest Employees */}
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          {/* Department Chart */}
          <div className="section-card p-0 overflow-hidden">
            <div className="card-header">
              <div>
                <p className="eyebrow">Analytics</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">Department Distribution</h3>
                <p className="mt-1 text-sm text-slate-600">Headcount by department</p>
              </div>
              <Link
                href="/reports"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span>Reports</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="card-body space-y-4">
                          {stats.departments.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-600">No department distribution yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add employee records with assigned departments to populate this summary.</p>
                </div>
              )}
              {stats.departments.map((department, index) => (
                <div key={department.name} className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${department.color} text-sm font-bold text-white shadow-lg`}>
                        {department.count}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{department.name}</p>
                        <p className="text-xs text-slate-500">{department.value}% of staff</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{department.value}%</span>
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
          <div className="section-card p-0 overflow-hidden">
            <div className="card-header">
              <div>
                <p className="eyebrow">Workforce</p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">Recent Employees</h3>
                <p className="mt-1 text-sm text-slate-600">Latest additions</p>
              </div>
              <Link
                href="/employees"
                className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            <div className="card-body">
              <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <label htmlFor="home-employee-status-filter" className="text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                id="home-employee-status-filter"
                value={employeeStatusFilter}
                onChange={(event) => setEmployeeStatusFilter(event.target.value)}
                className={filterInputClassName}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
              </div>

              <div className="mt-4 space-y-3">
                      {[...filteredEmployees]
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
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600">
                        {employee.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {employee.position} · {employee.department}
                      </p>
                    </div>
                    <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {employee.status || "Active"}
                    </div>
                  </Link>
                );
              })}
              {filteredEmployees.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-600">No recent employees found</p>
                  <p className="mt-1 text-sm text-slate-500">Try changing the status filter or add a new employee record to get started.</p>
                  <Link href="/employees/new" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
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
