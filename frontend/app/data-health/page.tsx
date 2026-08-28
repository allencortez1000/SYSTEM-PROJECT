"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BreakdownCard from "../components/breakdown-card";
import StatusBadge from "../components/status-badge";
import SummaryMetricCard from "../components/summary-metric-card";

const API_BASE = "/api";

const numberFormatter = new Intl.NumberFormat("en-PH");
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

type EmployeeIssue = {
  id: string;
  employeeNo: string;
  name: string;
  department: string;
  status: string;
  salary?: number;
  projectSite?: string;
};

type AttendanceIssue = {
  id: string;
  employeeId?: string;
  date: string;
  status: string;
  overtimeHours?: number;
  projectSite?: string;
};

type OverrideIssue = {
  employeeId: string;
  projectSite: string;
  periodStart: string;
  periodEnd: string;
  remarks: string;
  problems: string[];
};

type DepartmentHealth = {
  department: string;
  missingSalary: number;
  missingProjectSite: number;
  totalFlags: number;
};

type HealthResponse = {
  metrics: {
    activeEmployees: number;
    employeesMissingSalary: number;
    employeesMissingProjectSite: number;
    attendanceMissingProjectSite: number;
    attendanceUnlinkedEmployees: number;
    overrideIssues: number;
    totalIssues: number;
  };
  issuesByDepartment: DepartmentHealth[];
  missingSalaryEmployees: EmployeeIssue[];
  missingProjectSiteEmployees: EmployeeIssue[];
  attendanceMissingProjectSite: AttendanceIssue[];
  attendanceUnlinkedEmployees: AttendanceIssue[];
  overrideIssues: OverrideIssue[];
  recommendations: string[];
  error?: string | null;
};

function formatShortDate(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return text;
  return dateFormatter.format(date);
}

export default function DataHealthPage() {
  const router = useRouter();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      const response = await fetch(`${API_BASE}/data/health`, token ? {
        headers: { Authorization: `Bearer ${token}` },
      } : undefined);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_user");
          router.replace("/login");
          return;
        }
        throw new Error(payload?.error || payload?.message || "Failed to load data health summary");
      }

      setData(payload);
      if (payload?.error) {
        setError(String(payload.error));
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

  const metrics = data?.metrics;
  const cards = useMemo(() => ([
    {
      label: "Total open issues",
      value: metrics?.totalIssues ?? 0,
      detail: "Records that should be reviewed before payroll or attendance processing.",
      tone: "accent-blue",
    },
    {
      label: "Missing salary",
      value: metrics?.employeesMissingSalary ?? 0,
      detail: "Active employees with no salary amount saved.",
      tone: "accent-cyan",
    },
    {
      label: "Missing project site",
      value: (metrics?.employeesMissingProjectSite ?? 0) + (metrics?.attendanceMissingProjectSite ?? 0),
      detail: "Employee assignments or attendance records missing a project location.",
      tone: "accent-slate",
    },
    {
      label: "Override issues",
      value: metrics?.overrideIssues ?? 0,
      detail: "Payroll overrides that are incomplete or no longer match employee data.",
      tone: "accent-emerald",
    },
  ]), [metrics]);

  return (
    <div className="page-shell">
      <div className="hero-panel">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Data quality workspace</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Data Health</h1>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Review missing salary values, project-site gaps, attendance records that need cleanup, and payroll override problems before they affect payroll accuracy.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {numberFormatter.format(metrics?.activeEmployees ?? 0)} active employees checked
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                <span className="h-2 w-2 rounded-full bg-amber-300" />
                {numberFormatter.format(metrics?.totalIssues ?? 0)} issues found
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} type="button" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100">
              Refresh health scan
            </button>
            <Link href="/employees" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
              Review employees
            </Link>
            <Link href="/attendance" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
              Review attendance
            </Link>
            <Link href="/payroll/new" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15">
              Open payroll
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[0.875rem] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {cards.map((card) => (
              <SummaryMetricCard
                key={card.label}
                label={card.label}
                value={numberFormatter.format(card.value)}
                detail={card.detail}
                accentClassName={card.tone}
              />
            ))}
          </section>

          <section className="section-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow">Recommended next actions</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">What to fix first</h2>
                <p className="mt-1 text-sm text-slate-500">Work through the highest-risk data issues before finalizing attendance and payroll.</p>
              </div>
              <StatusBadge tone="amber" size="md" uppercase>Prioritized</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.recommendations.map((recommendation, index) => (
                <div key={recommendation} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Action {index + 1}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <BreakdownCard
              eyebrow="Data health"
              title="Department health overview"
              count={numberFormatter.format(data.issuesByDepartment.length)}
              description="Teams with the most missing salary and project-assignment gaps appear first."
              toneClassName="bg-blue-600 text-white border-blue-500"
            >
              <div className="space-y-3">
                {data.issuesByDepartment.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No department-level flags found.
                  </div>
                ) : (
                  data.issuesByDepartment.map((department) => (
                    <div key={department.department} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{department.department}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {department.missingSalary} missing salary • {department.missingProjectSite} missing project site
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {department.totalFlags} flag(s)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>

            <BreakdownCard
              eyebrow="Data health"
              title="Attendance records without employee links"
              count={numberFormatter.format(data.attendanceUnlinkedEmployees.length)}
              description="These rows should be connected to an employee so they can be counted accurately in reports and payroll summaries."
              toneClassName="bg-slate-900 text-white border-slate-800"
            >
              <div className="space-y-3">
                {data.attendanceUnlinkedEmployees.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    All attendance records are linked to employees.
                  </div>
                ) : (
                  data.attendanceUnlinkedEmployees.slice(0, 8).map((record) => (
                    <div key={record.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <p className="text-sm font-black text-slate-950">{formatShortDate(record.date)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">Status: {record.status || "Unknown"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Project: {record.projectSite || "Missing project site"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <BreakdownCard
              eyebrow="Data health"
              title="Employees missing salary"
              count={numberFormatter.format(data.missingSalaryEmployees.length)}
              description="Active employees in this list will produce incomplete payroll values until their salary is filled in."
              toneClassName="bg-cyan-600 text-white border-cyan-500"
            >
              <div className="space-y-3">
                {data.missingSalaryEmployees.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No active employees are missing salary values.
                  </div>
                ) : (
                  data.missingSalaryEmployees.map((employee) => (
                    <div key={employee.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{employee.name}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">{employee.department} • {employee.employeeNo || "No employee no."}</p>
                        </div>
                        <Link href="/employees" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
                          Fix in employees
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>

            <BreakdownCard
              eyebrow="Data health"
              title="Employees missing project site"
              count={numberFormatter.format(data.missingProjectSiteEmployees.length)}
              description="These active employees are not deployed to a project site, which can cause attendance and payroll mismatches."
              toneClassName="bg-amber-500 text-white border-amber-400"
            >
              <div className="space-y-3">
                {data.missingProjectSiteEmployees.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    All active employees have a project assignment.
                  </div>
                ) : (
                  data.missingProjectSiteEmployees.map((employee) => (
                    <div key={employee.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{employee.name}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">{employee.department} • {employee.employeeNo || "No employee no."}</p>
                        </div>
                        <StatusBadge tone="amber" size="md">Unassigned</StatusBadge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <BreakdownCard
              eyebrow="Data health"
              title="Attendance records missing project site"
              count={numberFormatter.format(data.attendanceMissingProjectSite.length)}
              description="Project-based attendance should include a site so payroll sync and reporting can group workers correctly."
              toneClassName="bg-slate-700 text-white border-slate-600"
            >
              <div className="space-y-3">
                {data.attendanceMissingProjectSite.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    All attendance records have a project site.
                  </div>
                ) : (
                  data.attendanceMissingProjectSite.slice(0, 12).map((record) => (
                    <div key={record.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{formatShortDate(record.date)}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">Status: {record.status || "Unknown"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Employee ID: {record.employeeId || "Missing link"}</p>
                        </div>
                        <Link href="/attendance" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
                          Review attendance
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>

            <BreakdownCard
              eyebrow="Data health"
              title="Payroll override issues"
              count={numberFormatter.format(data.overrideIssues.length)}
              description="These saved payroll override rows are incomplete or reference records that should be checked before reuse."
              toneClassName="bg-emerald-600 text-white border-emerald-500"
            >
              <div className="space-y-3">
                {data.overrideIssues.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No incomplete payroll attendance overrides found.
                  </div>
                ) : (
                  data.overrideIssues.map((issue, index) => (
                    <div key={`${issue.employeeId}-${issue.periodStart}-${index}`} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">Employee ID: {issue.employeeId || "Missing employee"}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {formatShortDate(issue.periodStart)} - {formatShortDate(issue.periodEnd)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Project: {issue.projectSite || "Missing project site"}</p>
                          {issue.remarks ? <p className="mt-1 text-xs font-semibold text-slate-500">Remarks: {issue.remarks}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {issue.problems.map((problem) => (
                            <StatusBadge key={problem} tone="red" size="md">{problem}</StatusBadge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BreakdownCard>
          </section>
        </>
      ) : null}
    </div>
  );
}
