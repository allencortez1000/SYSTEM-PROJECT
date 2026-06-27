"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "../../components/notification";

export default function NewEmployeePage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [projectSiteOptions, setProjectSiteOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
    const token = localStorage.getItem("hr_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API_BASE}/admin-users/departments`, { headers }).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/attendance/projects`, { headers }).then((r) => r.json()).catch(() => ({})),
    ]).then(([deptData, projData]) => {
      if (Array.isArray(deptData?.departments)) {
        setDepartmentOptions(deptData.departments.map((d: { name: string }) => d.name));
      }
      if (Array.isArray(projData?.projects)) {
        setProjectSiteOptions(projData.projects.map((p: { name: string }) => p.name));
      }
    }).finally(() => setOptionsLoading(false));
  }, []);

  const [department, setDepartment] = useState("");
  const [projectSite, setProjectSite] = useState("");
  const [position, setPosition] = useState("Employee");
  const [salary, setSalary] = useState(0);
  const [manager, setManager] = useState("");
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    if (!fullName.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName, email: email.trim() || null, department, projectSite, position, salary, manager, status }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data && data.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
          return;
        }

        throw new Error(data?.message || "Failed to create employee");
      }

      notify("Employee created");
      router.push("/employees");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-white/90">New employee</p>
            </div>
            <h2 className="mt-4 break-words text-2xl font-black tracking-tight sm:text-5xl">
              Add employee record
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-white/90">
              Create a new employee profile with Philippine Peso compensation details.
            </p>
          </div>

          <Link href="/employees" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-5 py-2.5 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to employees
          </Link>
        </div>
      </section>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-950">Employee Information</h3>
            <p className="mt-1 text-sm text-slate-600">Fill in the details below to create a new employee</p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {/* Personal Information Section */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Personal Details</h4>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="fullName"
                label="Full name"
                value={fullName}
                onChange={setFullName}
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
                onChange={setEmail}
                error={fieldErrors?.email}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Job Information Section */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Job Details</h4>
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

              <SelectField
                id="projectSite"
                label="Project site"
                value={projectSite}
                onChange={setProjectSite}
                options={projectSiteOptions}
                disabled={optionsLoading}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />

              <label className="block min-w-0">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Salary / monthly rate
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
                    onChange={(event) => setSalary(Math.max(0, Number(event.target.value)))}
                    className={
                      "w-full rounded-2xl border bg-white py-3.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 " +
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

              <TextField
                id="manager"
                label="Manager"
                value={manager}
                onChange={setManager}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />

              <SelectField
                id="status"
                label="Status"
                value={status}
                onChange={setStatus}
                options={["Active", "Onboarding", "On Leave", "Inactive"]}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-3.5 font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
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
          <Link href="/employees" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-3.5 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
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

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
};

function TextField({ id, label, value, onChange, error, type = "text", required = false, icon }: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={
          "mt-2 w-full rounded-2xl border bg-white px-4 py-3.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 " +
          (error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")
        }
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </label>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon?: React.ReactNode;
  disabled?: boolean;
};

function SelectField({ id, label, value, onChange, options, icon, disabled }: SelectFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
