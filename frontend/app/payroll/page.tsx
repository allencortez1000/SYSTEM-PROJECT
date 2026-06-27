"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FilterBar from "../components/filter-bar";
import { filterInputClassName } from "../components/filter-config";

const API_BASE = "/api";

type Row = Record<string, unknown>;

type Department = { id: string; name: string };
type ProjectSite = { id: string; name: string };
type SortMode = "recent" | "oldest" | "period" | "run";

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
  const [modalDepartment, setModalDepartment] = useState("");
  const [modalProjectSite, setModalProjectSite] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  const filteredRuns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = runs.filter((run) => {
      const values = [
        pick(run, ["run_code"]),
        pick(run, ["period_start", "start_date"]),
        pick(run, ["period_end", "end_date"]),
        pick(run, ["department_name", "department"]),
        pick(run, ["project_site_name", "project_site"]),
        pick(run, ["status"]),
      ].join(" ").toLowerCase();

      const departmentMatch = !selectedDepartment || pick(run, ["department_name", "department"]) === selectedDepartment;
      const projectMatch = !selectedProjectSite || pick(run, ["project_site_name", "project_site"]) === selectedProjectSite;
      const searchMatch = !query || values.includes(query);

      return departmentMatch && projectMatch && searchMatch;
    });

    return filtered.sort((a, b) => {
      const aRun = pick(a, ["run_code"]);
      const bRun = pick(b, ["run_code"]);
      const aStart = pick(a, ["period_start", "pay_period_start", "start_date"]);
      const bStart = pick(b, ["period_start", "pay_period_start", "start_date"]);
      const aEnd = pick(a, ["period_end", "end_date"]);
      const bEnd = pick(b, ["period_end", "end_date"]);
      const aPeriod = `${aStart} ${aEnd}`;
      const bPeriod = `${bStart} ${bEnd}`;

      switch (sortMode) {
        case "oldest":
          return aStart.localeCompare(bStart) || aRun.localeCompare(bRun);
        case "period":
          return aPeriod.localeCompare(bPeriod) || aRun.localeCompare(bRun);
        case "run":
          return aRun.localeCompare(bRun);
        case "recent":
        default:
          return bStart.localeCompare(aStart) || bRun.localeCompare(aRun);
      }
    });
  }, [runs, searchQuery, selectedDepartment, selectedProjectSite, sortMode]);

  const stats = useMemo(
    () => [
      {
        label: "Total Payroll",
        value: pesos(payrollCost),
        detail: "Sum of all employee salaries",
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
        bgGradient: "from-emerald-500 to-emerald-600",
        bgLight: "from-emerald-50 to-white",
        borderColor: "border-emerald-200",
        iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600"
      },
      {
        label: "Active Employees",
        value: String(employeeCount),
        detail: "On payroll system",
        icon: (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        ),
        bgGradient: "from-blue-600 to-cyan-500",
        bgLight: "from-blue-50 to-white",
        borderColor: "border-blue-200",
        iconBg: "bg-gradient-to-br from-blue-600 to-cyan-500"
      },
      {
        label: "Payroll Runs",
        value: String(runs.length),
        detail: "Payment history records",
        icon: (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        ),
        bgGradient: "from-slate-700 to-slate-900",
        bgLight: "from-slate-50 to-white",
        borderColor: "border-slate-200",
        iconBg: "bg-gradient-to-br from-slate-700 to-slate-900"
      },
    ],
    [payrollCost, employeeCount, runs],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 shadow-lg transition-transform hover:scale-105">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Payroll Center
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Manage Philippine payroll with automated deductions
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm transition-all hover:shadow-md">
            <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">{error}</p>
              <p className="mt-1 text-xs text-red-700">Make sure the backend is running on port 4000</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`group relative overflow-hidden rounded-2xl border ${stat.borderColor} bg-gradient-to-br ${stat.bgLight} p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-2xl font-black text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {stat.detail}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main CTA Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-6 w-6 text-blue-200" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    Estimated Monthly
                  </span>
                </div>
                <h2 className="text-2xl font-black sm:text-3xl">
                  Total Payroll Cost
                </h2>
                <p className="mt-3 text-3xl font-black sm:text-5xl">
                  {pesos(payrollCost)}
                </p>
                <p className="mt-3 text-sm font-semibold text-blue-100">
                  Computed from {employeeCount} employee salary records
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => { setModalDepartment(""); setModalProjectSite(""); setCalculatorOpen(true); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  type="button"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Start Payroll
                </button>
                <Link
                  href="/reports"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-6 py-3.5 text-sm font-black text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  View Reports
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Runs Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-sm">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment History</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">Recent payroll runs and releases</p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-6">
            <FilterBar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search payroll runs..."
              summary={
                <div className="text-sm font-semibold text-slate-600">
                  Showing <span className="text-slate-900">{filteredRuns.length}</span> payroll run{filteredRuns.length !== 1 ? "s" : ""}
                </div>
              }
              onClearFilters={() => {
                setSearchQuery("");
                setSelectedDepartment("");
                setSelectedProjectSite("");
                setSortMode("recent");
              }}
              clearLabel="Clear filters"
            >
              <div>
                <label className="text-sm font-semibold text-slate-700">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={filterInputClassName}
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.name}>{department.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Project Site</label>
                <select
                  value={selectedProjectSite}
                  onChange={(e) => setSelectedProjectSite(e.target.value)}
                  className={filterInputClassName}
                >
                  <option value="">All project sites</option>
                  {projectSites.map((projectSite) => (
                    <option key={projectSite.id} value={projectSite.name}>{projectSite.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Sort by</label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className={filterInputClassName}
                >
                  <option value="recent">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="period">Period</option>
                  <option value="run">Run code</option>
                </select>
              </div>
            </FilterBar>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                  <p className="text-sm font-semibold text-slate-600">Loading payroll runs...</p>
                </div>
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                  <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                  </svg>
                </div>
                <h4 className="text-lg font-black text-slate-900">No payroll runs yet</h4>
                <p className="mt-2 max-w-sm text-sm font-semibold text-slate-600">
                  Start your first payroll calculation to see payment history here
                </p>
                <button
                  onClick={() => { setModalDepartment(""); setModalProjectSite(""); setCalculatorOpen(true); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create First Payroll
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-700">Run Code</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-700">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-700">Payout Date</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-700">Net Pay</th>
                      <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRuns.map((run, index) => (
                      <tr key={String(pick(run, ["id", "run_code", "run_id"]) ?? index)} className="group transition-all duration-200 hover:bg-slate-50">
                        <td className="px-4 py-4"><span className="font-black text-slate-900">{pick(run, ["run_code"])}</span></td>
                        <td className="px-4 py-4 text-sm text-slate-600"><div className="flex items-center gap-2"><svg className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg><span className="font-semibold">{pick(run, ["period_start", "pay_period_start", "start_date"])} → {pick(run, ["period_end", "pay_period_end", "end_date"])}</span></div></td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-600">{pick(run, ["payout_date"])}</td>
                        <td className="px-4 py-4 text-right"><span className="text-base font-black text-emerald-700">{pesos(Number(run["total_net_pay"] ?? 0))}</span></td>
                        <td className="px-4 py-4 text-center"><span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm"><svg className="h-3 w-3" fill="currentColor" viewBox="0 0 8 8"><circle cx={4} cy={4} r={3} /></svg>{pick(run, ["status"])}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Modal for Starting Payroll */}
      {calculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-lg transition-all duration-300">
            <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Start Payroll</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-600">Select department and project site</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setCalculatorOpen(false)}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="grid gap-5">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                    </svg>
                    Department
                  </span>
                  <select
                    value={modalDepartment}
                    onChange={(event) => setModalDepartment(event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    Project Site
                  </span>
                  <select
                    value={modalProjectSite}
                    onChange={(event) => setModalProjectSite(event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select project site</option>
                    {projectSites.map((project) => (
                      <option key={project.id} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(!modalDepartment || !modalProjectSite) && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 shadow-sm">
                  <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm font-bold text-amber-900">
                    Both fields are required before proceeding
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                onClick={() => setCalculatorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                disabled={!modalDepartment || !modalProjectSite}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("department", modalDepartment);
                  params.set("projectSite", modalProjectSite);
                  router.push(`/payroll/new?${params.toString()}`);
                }}
              >
                Continue to Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
