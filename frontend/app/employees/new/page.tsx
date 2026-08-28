"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "../../components/notification";
import { triggerAppDataRefresh } from "../../../lib/supabaseRealtime";
import { EmployeeSelectField, EmployeeTextField } from "../employeeFormFields";
import { EMPLOYEE_BENEFITS_OPTIONS } from "../employeeBenefitsOptions";
import { EMPLOYEE_SALARY_BASIS_OPTIONS, EMPLOYEE_STATUS_OPTIONS } from "../employeeFormOptions";

const API_BASE = "/api";

const TextField = EmployeeTextField;
const SelectField = EmployeeSelectField;

export default function NewEmployeePage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [projectSiteOptions, setProjectSiteOptions] = useState<string[]>([]);
  const [newProjectSite, setNewProjectSite] = useState("");
  const [creatingProjectSite, setCreatingProjectSite] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      setOptionsLoading(true);
      try {
        const token = localStorage.getItem("hr_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [deptRes, projRes] = await Promise.all([
          fetch(`${API_BASE}/admin-users/departments`, { headers }),
          fetch(`${API_BASE}/attendance/projects`, { headers }),
        ]);

        const [deptData, projData] = await Promise.all([
          deptRes.json().catch(() => ({})),
          projRes.json().catch(() => ({})),
        ]);

        if (deptRes.ok && Array.isArray(deptData?.departments)) {
          const nextDepartments = Array.from(
            new Set(
              deptData.departments
                .map((department: { name: string }) => String(department.name || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setDepartmentOptions(nextDepartments);
        }

        if (projRes.ok && Array.isArray(projData?.projects)) {
          const nextProjects = Array.from(
            new Set(
              projData.projects
                .map((project: { name: string }) => String(project.name || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setProjectSiteOptions(nextProjects);
          setProjectSite((current) => current || String(nextProjects[0] || ""));
        }
      } catch {
        // keep the form usable even if option lookups fail
      } finally {
        setOptionsLoading(false);
      }
    }

    void loadOptions();
  }, []);

  const [department, setDepartment] = useState("");
  const [projectSite, setProjectSite] = useState("");
  const [position, setPosition] = useState("Employee");
  const [salary, setSalary] = useState(0);
  const [salaryBasis, setSalaryBasis] = useState("monthly");
  const [status, setStatus] = useState("Active");
  const [employeeId, setEmployeeId] = useState("");
  const [hasSss, setHasSss] = useState(true);
  const [hasPagIbig, setHasPagIbig] = useState(true);
  const [hasPhilHealth, setHasPhilHealth] = useState(true);
  const [hasSssLoan, setHasSssLoan] = useState(true);
  const [hasTax, setHasTax] = useState(true);
  const [hasAdditionalDeduction, setHasAdditionalDeduction] = useState(true);
  const [sssAmount, setSssAmount] = useState(0);
  const [pagIbigAmount, setPagIbigAmount] = useState(0);
  const [philHealthAmount, setPhilHealthAmount] = useState(0);
  const [sssLoanAmount, setSssLoanAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [additionalDeductionAmount, setAdditionalDeductionAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  async function createProjectSite() {
    const trimmed = newProjectSite.trim();
    if (!trimmed) return;
    if (projectSiteOptions.some((option) => option.toLowerCase() === trimmed.toLowerCase())) {
      setError("Project site already exists");
      return;
    }

    setCreatingProjectSite(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/attendance/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save project site");
      }

      const createdName = data?.project?.name || trimmed;
      setProjectSiteOptions((current) => Array.from(new Set([...current, createdName])));
      setProjectSite(createdName);
      setNewProjectSite("");
      notify("Project site added");
      triggerAppDataRefresh(["employees", "attendance_records", "employee_project_deployments"]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingProjectSite(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    if (!fullName.trim()) {
      setFieldErrors({ fullName: "Full name is required" });
      setError("Please fix the highlighted fields");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName,
          email: email.trim() || null,
          department,
          projectSite,
          position,
          salary,
          salaryBasis,
          status,
          employeeId: employeeId.trim() || null,
          hasSss,
          hasPagIbig,
          hasPhilHealth,
          hasSssLoan,
          hasTax,
          hasAdditionalDeduction,
          sssAmount,
          pagIbigAmount,
          philHealthAmount,
          sssLoanAmount,
          taxAmount,
          additionalDeductionAmount,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && data && data.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
          return;
        }

        throw new Error(data?.message || "Failed to create employee");
      }

      notify("Worker / Employee created");
      triggerAppDataRefresh(["employees", "attendance_records", "employee_project_deployments"]);
      router.push("/employees");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <p className="eyebrow">New Employee</p>
          <h1 className="page-title mt-1">Add Worker or Employee</h1>
          <p className="page-subtitle">Create a new employee profile with compensation details.</p>
        </div>
        <Link href="/employees" className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to employees
        </Link>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="section-card overflow-hidden p-0">
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Employee profile</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">Employee Information</h3>
            <p className="mt-1 text-sm text-slate-600">Fill in the details below to create a new employee</p>
            <span className="badge-active-only mt-3">
                          <span className="badge-dot" />
                          Active employees only
                        </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Personal Information Section */}
          <div className="rounded-[0.875rem] bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Personal Details</h4>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="fullName"
                label="Full name"
                value={fullName}
                onChange={(value) => {
                  setFullName(value);
                  if (fieldErrors?.fullName) {
                    setFieldErrors((current) => {
                      if (!current?.fullName) return current;
                      const next = { ...current };
                      delete next.fullName;
                      return Object.keys(next).length > 0 ? next : null;
                    });
                  }
                  if (error === "Please fix the highlighted fields") {
                    setError(null);
                  }
                }}
                error={fieldErrors?.fullName}
                required
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <TextField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (fieldErrors?.email) {
                    setFieldErrors((current) => {
                      if (!current?.email) return current;
                      const next = { ...current };
                      delete next.email;
                      return Object.keys(next).length > 0 ? next : null;
                    });
                  }
                  if (error === "Please fix the highlighted fields") {
                    setError(null);
                  }
                }}
                error={fieldErrors?.email}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              <TextField
                id="employeeId"
                label="Employee ID"
                value={employeeId}
                onChange={(value) => {
                  setEmployeeId(value);
                  if (fieldErrors?.employeeId) {
                    setFieldErrors((current) => {
                      if (!current?.employeeId) return current;
                      const next = { ...current };
                      delete next.employeeId;
                      return Object.keys(next).length > 0 ? next : null;
                    });
                  }
                  if (error === "Please fix the highlighted fields") {
                    setError(null);
                  }
                }}
                error={fieldErrors?.employeeId}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 4.5h9A1.5 1.5 0 0118 6v12a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18V6a1.5 1.5 0 011.5-1.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8.25h6M9 12h6M9 15.75h3" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Job Information Section */}
          <div className="rounded-[0.875rem] bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Job Details</h4>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                id="department"
                label="Department"
                value={department}
                onChange={setDepartment}
                options={departmentOptions}
                disabled={optionsLoading}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />

              <TextField
                id="position"
                label="Position"
                value={position}
                onChange={setPosition}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />

              <div className="space-y-2 min-w-0">
                <SelectField
                  id="projectSite"
                  label="Project site"
                  value={projectSite}
                  onChange={(value) => {
                    setProjectSite(value);
                    if (error === "Project site already exists") {
                      setError(null);
                    }
                  }}
                  options={projectSiteOptions}
                  disabled={optionsLoading}
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="block min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Or create a new site</span>
                    <input
                      value={newProjectSite}
                      onChange={(event) => {
                        setNewProjectSite(event.target.value);
                        if (error === "Project site already exists") {
                          setError(null);
                        }
                      }}
                      placeholder="e.g. Hermosa Site"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={createProjectSite}
                    disabled={optionsLoading || creatingProjectSite || !newProjectSite.trim()}
                    className="mt-auto inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingProjectSite ? "Adding..." : "Add site"}
                  </button>
                </div>
              </div>

              <label className="block min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {salaryBasis === "daily" ? "Daily rate" : "Monthly salary"}
                </span>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-bold text-slate-400">
                    ₱
                  </span>
                  <input
                    id="salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salary}
                    onChange={(event) => {
                      setSalary(Math.max(0, Number(event.target.value)));
                      if (fieldErrors?.salary) {
                        setFieldErrors((current) => {
                          if (!current?.salary) return current;
                          const next = { ...current };
                          delete next.salary;
                          return Object.keys(next).length > 0 ? next : null;
                        });
                      }
                      if (error === "Please fix the highlighted fields") {
                        setError(null);
                      }
                    }}
        className={
          "w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 " +
                      (fieldErrors?.salary ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")
                    }
                    aria-invalid={fieldErrors?.salary ? "true" : "false"}
                    aria-describedby={fieldErrors?.salary ? "salary-error" : undefined}
                  />
                </div>
                {fieldErrors?.salary && (
                  <p id="salary-error" role="alert" className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.salary}
                  </p>
                )}
              </label>


              <SelectField
                id="status"
                label="Status"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  if (fieldErrors?.status) {
                    setFieldErrors((current) => {
                      if (!current?.status) return current;
                      const next = { ...current };
                      delete next.status;
                      return Object.keys(next).length > 0 ? next : null;
                    });
                  }
                  if (error === "Please fix the highlighted fields") {
                    setError(null);
                  }
                }}
                options={[...EMPLOYEE_STATUS_OPTIONS]}
                error={fieldErrors?.status}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <SelectField
                id="salaryBasis"
                label="Salary basis"
                value={salaryBasis}
                onChange={(value) => {
                  setSalaryBasis(value);
                  if (fieldErrors?.salaryBasis) {
                    setFieldErrors((current) => {
                      if (!current?.salaryBasis) return current;
                      const next = { ...current };
                      delete next.salaryBasis;
                      return Object.keys(next).length > 0 ? next : null;
                    });
                  }
                  if (error === "Please fix the highlighted fields") {
                    setError(null);
                  }
                }}
                options={[...EMPLOYEE_SALARY_BASIS_OPTIONS]}
                error={fieldErrors?.salaryBasis}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          <div className="rounded-[0.875rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Benefits & deductions</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EMPLOYEE_BENEFITS_OPTIONS.map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={
                      key === "hasSss"
                        ? hasSss
                        : key === "hasPagIbig"
                          ? hasPagIbig
                          : key === "hasPhilHealth"
                            ? hasPhilHealth
                            : key === "hasSssLoan"
                              ? hasSssLoan
                              : key === "hasTax"
                                ? hasTax
                                : hasAdditionalDeduction
                    }
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      if (key === "hasSss") setHasSss(nextChecked);
                      else if (key === "hasPagIbig") setHasPagIbig(nextChecked);
                      else if (key === "hasPhilHealth") setHasPhilHealth(nextChecked);
                      else if (key === "hasSssLoan") setHasSssLoan(nextChecked);
                      else if (key === "hasTax") setHasTax(nextChecked);
                      else setHasAdditionalDeduction(nextChecked);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <TextField id="sssAmount" label="SSS amount" type="number" value={String(sssAmount)} onChange={(value) => setSssAmount(Math.max(0, Number(value)))} />
              <TextField id="pagIbigAmount" label="Pag-IBIG amount" type="number" value={String(pagIbigAmount)} onChange={(value) => setPagIbigAmount(Math.max(0, Number(value)))} />
              <TextField id="philHealthAmount" label="PhilHealth amount" type="number" value={String(philHealthAmount)} onChange={(value) => setPhilHealthAmount(Math.max(0, Number(value)))} />
              <TextField id="sssLoanAmount" label="SSS loan amount" type="number" value={String(sssLoanAmount)} onChange={(value) => setSssLoanAmount(Math.max(0, Number(value)))} />
              <TextField id="taxAmount" label="Tax amount" type="number" value={String(taxAmount)} onChange={(value) => setTaxAmount(Math.max(0, Number(value)))} />
              <TextField id="additionalDeductionAmount" label="Additional deduction" type="number" value={String(additionalDeductionAmount)} onChange={(value) => setAdditionalDeductionAmount(Math.max(0, Number(value)))} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-[0.875rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 px-6 pt-5 pb-6 sm:flex-row">
          <button
            type="submit"
            disabled={loading || optionsLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : optionsLoading ? (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Loading options...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create employee
              </>
            )}
          </button>
          <Link href="/employees" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}


