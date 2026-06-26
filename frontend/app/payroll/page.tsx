"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

type Row = Record<string, unknown>;

type Department = { id: string; name: string };
type ProjectSite = { id: string; name: string };

function pick(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "—";
}

function pesos(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PayrollIndex() {
  const router = useRouter();
  const [runs, setRuns] = useState<Row[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [payrollCost, setPayrollCost] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProjectSite, setSelectedProjectSite] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const fetchOptions = token
        ? ({ headers: { Authorization: `Bearer ${token}` } } as const)
        : undefined;

      const [runsRes, empRes, departmentsRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/data/payroll-runs`, fetchOptions),
        fetch(`${API_BASE}/employees`, fetchOptions),
        fetch(`${API_BASE}/admin-users/departments`, fetchOptions),
        fetch(`${API_BASE}/attendance/projects`, fetchOptions),
      ]);
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.payrollRuns || []);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        const employees = empData.employees || [];
        setEmployeeCount(employees.length);
        setPayrollCost(
          employees.reduce((sum: number, e: { salary?: number }) => sum + (Number(e.salary) || 0), 0),
        );
      }
      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        const nextDepartments = departmentsData.departments || [];
        setDepartments(nextDepartments);
        setSelectedDepartment((current) => current || "");
      }
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        const nextProjects = projectsData.projects || [];
        setProjectSites(nextProjects);
        setSelectedProjectSite((current) => current || "");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const onFocus = () => {
      void load();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);



  const stats = useMemo(
    () => [
      { label: "Estimated gross payroll", value: pesos(payrollCost), detail: "Sum of all salaries", tone: "bg-blue-50 text-blue-700" },
      { label: "Employees on payroll", value: String(employeeCount), detail: "Active records in Supabase", tone: "bg-emerald-50 text-emerald-700" },
      { label: "Payroll runs", value: String(runs.length), detail: "Historical runs stored", tone: "bg-amber-50 text-amber-700" },
    ],
    [payrollCost, employeeCount, runs],
  );

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Payroll center</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Prepare Philippine payroll with hourly pay and automatic deductions.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-600">
              Review hourly earnings, overtime, SSS, Pag-IBIG, PhilHealth, and final net pay before releasing payroll.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setCalculatorOpen(true)} className="primary-button" type="button">
                Start payroll calculation
              </button>
              <Link href="/reports" className="secondary-button">
                View payroll reports
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">Estimated monthly payroll</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                Live
              </span>
            </div>
            <p className="mt-5 break-words text-4xl font-black sm:text-5xl">{pesos(payrollCost)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Computed from {employeeCount} employee salary records stored in Supabase.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}. Make sure the backend (npm run dev) is running on port 4000.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="metric-card">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                <p className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{stat.detail}</p>
              </div>
              <span className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${stat.tone}`}>
                PHP
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Recent payroll runs</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Payment history</h3>
        </div>

        {loading && <p className="mt-6 text-slate-600">Loading payroll runs...</p>}
        {!loading && runs.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No payroll runs found in Supabase yet.</p>
        )}

        {runs.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Run code</th>
                  <th>Period</th>
                  <th>Payout date</th>
                  <th>Net pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {runs.map((run, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="font-black text-slate-950">{pick(run, ["run_code"])}</td>
                    <td className="text-slate-600">
                      {pick(run, ["pay_period_start"])} → {pick(run, ["pay_period_end"])}
                    </td>
                    <td className="text-slate-600">{pick(run, ["payout_date"])}</td>
                    <td className="font-bold text-slate-700">{pesos(Number(run["total_net_pay"] ?? 0))}</td>
                    <td>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {pick(run, ["status"])}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    {calculatorOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-xl rounded-[1.75rem] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Start payroll calculation</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Choose department and project site</h3>
              <p className="mt-2 text-sm text-slate-500">Select the department and project site before opening the payroll editor.</p>
            </div>
            <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-500" onClick={() => setCalculatorOpen(false)}>✕</button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Department</span>
              <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <option value="">Select department</option>
                {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Project site</span>
              <select value={selectedProjectSite} onChange={(event) => setSelectedProjectSite(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                <option value="">Select project site</option>
                {projectSites.map((project) => <option key={project.id} value={project.name}>{project.name}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">Both fields are required before proceeding.</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={() => setCalculatorOpen(false)}>Cancel</button>
            <button
              type="button"
              className="primary-button"
              disabled={!selectedDepartment || !selectedProjectSite}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("department", selectedDepartment);
                params.set("projectSite", selectedProjectSite);
                router.push(`/payroll/new?${params.toString()}`);
              }}
            >
              Continue to payroll
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
