"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNotification } from "../../../components/notification";
import { triggerAppDataRefresh } from "../../../../lib/supabaseRealtime";

type EmployeeFormState = {
  fullName: string;
  email: string;
  department: string;
  projectSite: string;
  position: string;
  salary: number;
  salaryBasis: string;
  manager: string;
  status: string;
  employeeId: string;
  hasSss: boolean;
  hasPagIbig: boolean;
  hasPhilHealth: boolean;
  hasSssLoan: boolean;
  hasTax: boolean;
  hasAdditionalDeduction: boolean;
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
    manager: "",
    status: "Active",
    employeeId: "",
    hasSss: true,
    hasPagIbig: true,
    hasPhilHealth: true,
    hasSssLoan: true,
    hasTax: true,
    hasAdditionalDeduction: true,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("hr_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [employeeRes, deptRes, projectRes] = await Promise.all([
          fetch(`/api/employees/${id}`, { headers }),
          fetch("/api/admin-users/departments", { headers }),
          fetch("/api/attendance/projects", { headers }),
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
          manager: employee?.manager || "",
          status: employee?.status || "Active",
          employeeId: employee?.employeeId || "",
          hasSss: employee?.hasSss ?? true,
          hasPagIbig: employee?.hasPagIbig ?? true,
          hasPhilHealth: employee?.hasPhilHealth ?? true,
          hasSssLoan: employee?.hasSssLoan ?? true,
          hasTax: employee?.hasTax ?? true,
          hasAdditionalDeduction: employee?.hasAdditionalDeduction ?? true,
          sssAmount: Number(employee?.sssAmount || 0),
          pagIbigAmount: Number(employee?.pagIbigAmount || 0),
          philHealthAmount: Number(employee?.philHealthAmount || 0),
          sssLoanAmount: Number(employee?.sssLoanAmount || 0),
          taxAmount: Number(employee?.taxAmount || 0),
          additionalDeductionAmount: Number(employee?.additionalDeductionAmount || 0),
        });

        if (Array.isArray(deptData?.departments)) {
          const nextDepartments: string[] = Array.from(
            new Set(
              deptData.departments
                .map((d: { name: string }) => String(d.name || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setDepartmentOptions(nextDepartments);
        }
        if (Array.isArray(projectData?.projects)) {
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
        setLoading(false);
      }
    };

    if (id) void load();
  }, [id]);

  const statusOptions = useMemo(() => ["Active", "Onboarding", "On Leave", "Inactive", "Terminated"], []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSaving(true);

    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`/api/employees/${id}`, {
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
      const res = await fetch("/api/attendance/projects", {
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
      setProjectSiteOptions((current) => [...current, createdName]);
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
          <TextField id="fullName" label="Full name" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} error={fieldErrors?.fullName} required />
          <TextField id="employeeId" label="Employee ID" value={form.employeeId} onChange={(value) => setForm((prev) => ({ ...prev, employeeId: value }))} />
          <TextField id="email" label="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} error={fieldErrors?.email} />
          <SelectField id="department" label="Department" value={form.department} onChange={(value) => setForm((prev) => ({ ...prev, department: value }))} options={departmentOptions} />
          <TextField id="position" label="Position" value={form.position} onChange={(value) => setForm((prev) => ({ ...prev, position: value }))} />
          <div className="space-y-2 min-w-0">
            <SelectField id="projectSite" label="Change project site" value={form.projectSite} onChange={(value) => setForm((prev) => ({ ...prev, projectSite: value }))} options={projectSiteOptions} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="block min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Or create a new site</span>
                <input
                  value={newProjectSite}
                  onChange={(event) => setNewProjectSite(event.target.value)}
                  placeholder="e.g. Hermosa Site"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <button
                type="button"
                onClick={createProjectSite}
                disabled={creatingProjectSite}
                className="mt-auto inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {creatingProjectSite ? "Adding..." : "Add site"}
              </button>
            </div>
          </div>
          <SelectField id="status" label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={statusOptions} />
          <SelectField id="salaryBasis" label="Salary basis" value={form.salaryBasis} onChange={(value) => setForm((prev) => ({ ...prev, salaryBasis: value }))} options={["monthly", "daily"]} />
          <TextField id="manager" label="Manager" value={form.manager} onChange={(value) => setForm((prev) => ({ ...prev, manager: value }))} />
          <label className="block min-w-0">
            <span className="block text-sm font-semibold text-slate-700 mb-1.5">Salary / monthly rate</span>
            <input id="salary" type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setForm((prev) => ({ ...prev, salary: Math.max(0, Number(e.target.value)) }))} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            {fieldErrors?.salary && <p className="mt-2 text-sm font-semibold text-red-600">{fieldErrors.salary}</p>}
          </label>

          <div className="sm:col-span-2 rounded-[0.875rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Benefits & deductions</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["hasSss", "SSS", form.hasSss],
                ["hasPagIbig", "Pag-IBIG", form.hasPagIbig],
                ["hasPhilHealth", "PhilHealth", form.hasPhilHealth],
                ["hasSssLoan", "SSS Loan", form.hasSssLoan],
                ["hasTax", "Tax", form.hasTax],
                ["hasAdditionalDeduction", "Additional Deduction", form.hasAdditionalDeduction],
              ].map(([key, label, checked]) => (
                <label key={String(key)} className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key as keyof EmployeeFormState]: event.target.checked } as EmployeeFormState))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <TextField id="sssAmount" label="SSS amount" type="number" value={String(form.sssAmount)} onChange={(value) => setForm((prev) => ({ ...prev, sssAmount: Math.max(0, Number(value)) }))} />
              <TextField id="pagIbigAmount" label="Pag-IBIG amount" type="number" value={String(form.pagIbigAmount)} onChange={(value) => setForm((prev) => ({ ...prev, pagIbigAmount: Math.max(0, Number(value)) }))} />
              <TextField id="philHealthAmount" label="PhilHealth amount" type="number" value={String(form.philHealthAmount)} onChange={(value) => setForm((prev) => ({ ...prev, philHealthAmount: Math.max(0, Number(value)) }))} />
              <TextField id="sssLoanAmount" label="SSS loan amount" type="number" value={String(form.sssLoanAmount)} onChange={(value) => setForm((prev) => ({ ...prev, sssLoanAmount: Math.max(0, Number(value)) }))} />
              <TextField id="taxAmount" label="Tax amount" type="number" value={String(form.taxAmount)} onChange={(value) => setForm((prev) => ({ ...prev, taxAmount: Math.max(0, Number(value)) }))} />
              <TextField id="additionalDeductionAmount" label="Additional deduction" type="number" value={String(form.additionalDeductionAmount)} onChange={(value) => setForm((prev) => ({ ...prev, additionalDeductionAmount: Math.max(0, Number(value)) }))} />
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-[0.875rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
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

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
};

function TextField({ id, label, value, onChange, error, type = "text", required = false }: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className={"w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 " + (error ? "border-red-500" : "border-slate-200")} />
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </label>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

function SelectField({ id, label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
