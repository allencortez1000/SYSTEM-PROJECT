"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotification } from "../../../components/notification";
import { triggerAppDataRefresh } from "../../../../lib/supabaseRealtime";
import { EmployeeSelectField, EmployeeTextField } from "../../employeeFormFields";
import { EMPLOYEE_BENEFITS_OPTIONS } from "../../employeeBenefitsOptions";
import { EMPLOYEE_SALARY_BASIS_OPTIONS, EMPLOYEE_STATUS_OPTIONS } from "../../employeeFormOptions";

const API_BASE = "/api";
const TextField = EmployeeTextField;
const SelectField = EmployeeSelectField;

type EmployeeFormState = {
  fullName: string;
  email: string;
  department: string;
  projectSite: string;
  position: string;
  salary: number;
  salaryBasis: string;
  status: string;
  employeeId: string;
  hasSss: boolean;
  hasPagIbig: boolean;
  hasPhilHealth: boolean;
  hasSssLoan: boolean;
  hasTax: boolean;
  hasAdditionalDeduction: boolean;
  sssNo: string;
  tinNo: string;
  philHealthNo: string;
  pagIbigNo: string;
  sssAmount: number;
  pagIbigAmount: number;
  philHealthAmount: number;
  sssLoanAmount: number;
  taxAmount: number;
  additionalDeductionAmount: number;
};

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");
  const { notify } = useNotification();

  const [form, setForm] = useState<EmployeeFormState>({
    fullName: "",
    email: "",
    department: "",
    projectSite: "",
    position: "Employee",
    salary: 0,
    salaryBasis: "monthly",
    status: "Active",
    employeeId: "",
    hasSss: true,
    hasPagIbig: true,
    hasPhilHealth: true,
    hasSssLoan: true,
    hasTax: true,
    hasAdditionalDeduction: true,
    sssNo: "",
    tinNo: "",
    philHealthNo: "",
    pagIbigNo: "",
    sssAmount: 0,
    pagIbigAmount: 0,
    philHealthAmount: 0,
    sssLoanAmount: 0,
    taxAmount: 0,
    additionalDeductionAmount: 0,
  });
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [projectSiteOptions, setProjectSiteOptions] = useState<string[]>([]);
  const [newProjectSite, setNewProjectSite] = useState("");
  const [creatingProjectSite, setCreatingProjectSite] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setOptionsLoading(true);
      try {
        const token = localStorage.getItem("hr_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [employeeRes, deptRes, projectRes] = await Promise.all([
          fetch(`${API_BASE}/employees/${id}`, { headers }),
          fetch(`${API_BASE}/admin-users/departments`, { headers }),
          fetch(`${API_BASE}/attendance/projects`, { headers }),
        ]);

        const [employeeData, deptData, projectData] = await Promise.all([
          employeeRes.json().catch(() => ({})),
          deptRes.json().catch(() => ({})),
          projectRes.json().catch(() => ({})),
        ]);

        if (!employeeRes.ok) throw new Error(employeeData?.error || employeeData?.message || "Employee not found");

        const employee = employeeData.employee || employeeData;
        setForm({
          fullName: employee?.fullName || "",
          email: employee?.email || "",
          department: employee?.department || "",
          projectSite: employee?.projectSite || "",
          position: employee?.position || "Employee",
          salary: Number(employee?.salary || 0),
          salaryBasis: employee?.salaryBasis || "monthly",
          status: employee?.status || "Active",
          employeeId: employee?.employeeId || "",
          hasSss: employee?.hasSss ?? true,
          hasPagIbig: employee?.hasPagIbig ?? true,
          hasPhilHealth: employee?.hasPhilHealth ?? true,
          hasSssLoan: employee?.hasSssLoan ?? true,
          hasTax: employee?.hasTax ?? true,
          hasAdditionalDeduction: employee?.hasAdditionalDeduction ?? true,
          sssNo: employee?.sssNo || "",
          tinNo: employee?.tinNo || "",
          philHealthNo: employee?.philHealthNo || "",
          pagIbigNo: employee?.pagIbigNo || "",
          sssAmount: Number(employee?.sssAmount || 0),
          pagIbigAmount: Number(employee?.pagIbigAmount || 0),
          philHealthAmount: Number(employee?.philHealthAmount || 0),
          sssLoanAmount: Number(employee?.sssLoanAmount || 0),
          taxAmount: Number(employee?.taxAmount || 0),
          additionalDeductionAmount: Number(employee?.additionalDeductionAmount || 0),
        });

        if (deptRes.ok && Array.isArray(deptData?.departments)) {
          const nextDepartments: string[] = Array.from(
            new Set(
              deptData.departments
                .map((d: { name: string }) => String(d.name || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setDepartmentOptions(nextDepartments);
        }
        if (projectRes.ok && Array.isArray(projectData?.projects)) {
          const nextProjects: string[] = Array.from(
            new Set(
              projectData.projects
                .map((p: { name: string }) => String(p.name || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setProjectSiteOptions(nextProjects);
          if (!employee?.projectSite && nextProjects.length > 0) {
            setForm((prev) => ({ ...prev, projectSite: prev.projectSite || String(nextProjects[0] || "") }));
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setOptionsLoading(false);
        setLoading(false);
      }
    };

    if (id) void load();
  }, [id]);

  const statusOptions = useMemo(() => [...EMPLOYEE_STATUS_OPTIONS], []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    if (!form.fullName.trim()) {
      setFieldErrors({ fullName: "Full name is required" });
      setError("Please fix the highlighted fields");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/employees/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
          return;
        }
        throw new Error(data?.message || data?.error || "Failed to update employee");
      }

      notify("Employee updated");
      triggerAppDataRefresh(["employees", "attendance_records", "employee_project_deployments"]);
      router.push(`/employees/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

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
      setForm((prev) => ({ ...prev, projectSite: createdName }));
      setNewProjectSite("");
      notify("Project site added");
      triggerAppDataRefresh(["employees", "attendance_records", "employee_project_deployments"]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingProjectSite(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <p className="eyebrow">Edit Employee</p>
          <h1 className="page-title mt-1">Update Profile</h1>
          <p className="page-subtitle">Modify employee details and save the updated record.</p>
          <span className="badge-active-only mt-3 inline-flex items-center gap-2">
            <span className="badge-dot" />
            Active employees only
          </span>
        </div>
        <Link href={`/employees/${id}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to details
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="section-card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="eyebrow">Employee profile</p>
          <h2 className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-400">Employee Details</h2>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <EmployeeTextField id="fullName" label="Full name" value={form.fullName} onValueChange={(value) => {
            setForm((prev) => ({ ...prev, fullName: value }));
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
          }} error={fieldErrors?.fullName} required disabled={saving || loading} />
          <EmployeeTextField id="employeeId" label="Employee ID" value={form.employeeId} onValueChange={(value) => {
            setForm((prev) => ({ ...prev, employeeId: value }));
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
          }} error={fieldErrors?.employeeId} disabled={saving || loading} />
          <EmployeeTextField id="email" label="Email" type="email" value={form.email} onValueChange={(value) => {
            setForm((prev) => ({ ...prev, email: value }));
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
          }} error={fieldErrors?.email} disabled={saving || loading} />
          <EmployeeSelectField id="department" label="Department" value={form.department} onValueChange={(value) => setForm((prev) => ({ ...prev, department: value }))} options={departmentOptions} disabled={optionsLoading} />
          <EmployeeTextField id="position" label="Position" value={form.position} onValueChange={(value) => setForm((prev) => ({ ...prev, position: value }))} />
          <div className="space-y-2 min-w-0">
            <EmployeeSelectField id="projectSite" label="Change project site" value={form.projectSite} onValueChange={(value) => {
              setForm((prev) => ({ ...prev, projectSite: value }));
              if (error === "Project site already exists") {
                setError(null);
              }
            }} options={projectSiteOptions} disabled={optionsLoading} />
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
          <EmployeeSelectField id="status" label="Status" value={form.status} onValueChange={(value) => {
            setForm((prev) => ({ ...prev, status: value }));
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
          }} options={statusOptions} error={fieldErrors?.status} />
          <EmployeeSelectField id="salaryBasis" label="Salary basis" value={form.salaryBasis} onValueChange={(value) => {
            setForm((prev) => ({ ...prev, salaryBasis: value }));
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
          }} options={[...EMPLOYEE_SALARY_BASIS_OPTIONS]} error={fieldErrors?.salaryBasis} />
          <EmployeeTextField id="sssNo" label="SSS number" value={form.sssNo} onValueChange={(value) => setForm((prev) => ({ ...prev, sssNo: value }))} />
          <EmployeeTextField id="tinNo" label="TIN number" value={form.tinNo} onValueChange={(value) => setForm((prev) => ({ ...prev, tinNo: value }))} />
          <EmployeeTextField id="philhealthNo" label="PhilHealth number" value={form.philHealthNo} onValueChange={(value) => setForm((prev) => ({ ...prev, philHealthNo: value }))} />
          <EmployeeTextField id="pagibigNo" label="Pag-IBIG number" value={form.pagIbigNo} onValueChange={(value) => setForm((prev) => ({ ...prev, pagIbigNo: value }))} />
          <label className="block min-w-0">
            <span className="block text-sm font-semibold text-slate-700 mb-1.5">{form.salaryBasis === "daily" ? "Daily rate" : "Monthly salary"}</span>
            <input id="salary" type="number" min="0" step="0.01" value={form.salary} onChange={(e) => {
              setForm((prev) => ({ ...prev, salary: Math.max(0, Number(e.target.value)) }));
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
            }} className={"w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 " + (fieldErrors?.salary ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")} aria-invalid={fieldErrors?.salary ? "true" : "false"} aria-describedby={fieldErrors?.salary ? "salary-error" : undefined} />
            {fieldErrors?.salary && <p id="salary-error" className="mt-2 text-sm font-semibold text-red-600">{fieldErrors.salary}</p>}
          </label>

          <div className="sm:col-span-2 rounded-[0.875rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Benefits & deductions</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EMPLOYEE_BENEFITS_OPTIONS.map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={
                      key === "hasSss"
                        ? form.hasSss
                        : key === "hasPagIbig"
                          ? form.hasPagIbig
                          : key === "hasPhilHealth"
                            ? form.hasPhilHealth
                            : key === "hasSssLoan"
                              ? form.hasSssLoan
                              : key === "hasTax"
                                ? form.hasTax
                                : form.hasAdditionalDeduction
                    }
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        [key]: nextChecked,
                      } as EmployeeFormState));
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <TextField id="sssAmount" label="SSS amount" type="number" value={String(form.sssAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, sssAmount: Math.max(0, Number(value)) }))} />
              <TextField id="pagIbigAmount" label="Pag-IBIG amount" type="number" value={String(form.pagIbigAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, pagIbigAmount: Math.max(0, Number(value)) }))} />
              <TextField id="philHealthAmount" label="PhilHealth amount" type="number" value={String(form.philHealthAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, philHealthAmount: Math.max(0, Number(value)) }))} />
              <TextField id="sssLoanAmount" label="SSS loan amount" type="number" value={String(form.sssLoanAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, sssLoanAmount: Math.max(0, Number(value)) }))} />
              <TextField id="taxAmount" label="Tax amount" type="number" value={String(form.taxAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, taxAmount: Math.max(0, Number(value)) }))} />
              <TextField id="additionalDeductionAmount" label="Additional deduction" type="number" value={String(form.additionalDeductionAmount)} onValueChange={(value) => setForm((prev) => ({ ...prev, additionalDeductionAmount: Math.max(0, Number(value)) }))} />
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-[0.875rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button type="submit" disabled={saving || optionsLoading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : optionsLoading ? "Loading options..." : "Save changes"}
          </button>
          <Link href={`/employees/${id}`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </Link>
        </div>
        </div>
      </form>
    </div>
  );
}


