"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNotification } from "../components/notification";
import { useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

type SessionUser = {
  role?: string;
  permissions?: string[];
};

type Department = {
  id: string;
  name: string;
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  isActive: boolean;
  departmentIds: string[];
  departments: string[];
  permissions?: string[];
};

type Employee = {
  id: string;
  fullName: string;
  email: string;
  position: string;
  department: string;
  salary?: number;
  salaryBasis?: string;
  hasSss?: boolean;
  hasPagIbig?: boolean;
  hasPhilHealth?: boolean;
  hasSssLoan?: boolean;
  hasTax?: boolean;
  hasAdditionalDeduction?: boolean;
  sssAmount?: number | null;
  pagIbigAmount?: number | null;
  philHealthAmount?: number | null;
  sssLoanAmount?: number | null;
  taxAmount?: number | null;
  additionalDeductionAmount?: number | null;
};

type ProjectSite = {
  id: string;
  name: string;
};

const API_BASE = "/api";
const PERMISSION_OPTIONS = [
  { id: "payroll", label: "Payroll Management" },
  { id: "attendance", label: "Attendance Tracking" },
  { id: "reports", label: "Reports" },
  { id: "employees", label: "Employee Management" },
  { id: "departments", label: "Department Management" },
];

function roleLabel(role: string) {
  if (role === "super-admin") return "Super Admin";
  if (role === "department-head-admin") return "Department Head Admin";
  if (role === "sub-admin") return "Sub Admin";
  return role;
}

export default function AdminUsersPage() {
  const { notify } = useNotification();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  // Admin users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Sub-admin form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

  // Worker form state
  const [workerFullName, setWorkerFullName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerDepartment, setWorkerDepartment] = useState("");
  const [workerPosition, setWorkerPosition] = useState("");
  const [workerSalary, setWorkerSalary] = useState("");
  const [workerSalaryBasis, setWorkerSalaryBasis] = useState("monthly");
  const [workerProjectSite, setWorkerProjectSite] = useState("");
  const [workerStatus, setWorkerStatus] = useState("Active");
  const [workerHasSss, setWorkerHasSss] = useState(true);
  const [workerHasPagIbig, setWorkerHasPagIbig] = useState(true);
  const [workerHasPhilHealth, setWorkerHasPhilHealth] = useState(true);
  const [workerHasSssLoan, setWorkerHasSssLoan] = useState(true);
  const [workerHasTax, setWorkerHasTax] = useState(true);
  const [workerHasAdditionalDeduction, setWorkerHasAdditionalDeduction] = useState(true);
  const [workerSssAmount, setWorkerSssAmount] = useState("0");
  const [workerPagIbigAmount, setWorkerPagIbigAmount] = useState("0");
  const [workerPhilHealthAmount, setWorkerPhilHealthAmount] = useState("0");
  const [workerSssLoanAmount, setWorkerSssLoanAmount] = useState("");
  const [workerTaxAmount, setWorkerTaxAmount] = useState("");
  const [workerAdditionalDeductionAmount, setWorkerAdditionalDeductionAmount] = useState("");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Department assignment state
  const [assignmentSavingUserId, setAssignmentSavingUserId] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({});

  // Employee management state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const employeesPerPage = 10;

  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department.id, label: department.name })),
    [departments],
  );

  const canCreateAdmins = sessionUser?.role === "super-admin";
  const canViewAdmins = sessionUser?.role === "super-admin" || sessionUser?.permissions?.includes("admin_access");

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.toLowerCase();
    return employees.filter((emp) => {
      const fullName = String(emp.fullName || "").toLowerCase();
      const email = String(emp.email || "").toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });
  }, [employees, employeeSearch]);

  const paginatedEmployees = useMemo(() => {
    const start = (employeePage - 1) * employeesPerPage;
    return filteredEmployees.slice(start, start + employeesPerPage);
  }, [filteredEmployees, employeePage]);

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");

      const rawUser = localStorage.getItem("hr_user");
      const user: SessionUser | null = rawUser ? JSON.parse(rawUser) : null;
      setSessionUser(user);

      if (user?.role !== "super-admin" && !user?.permissions?.includes("admin_access")) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, departmentsRes, employeesRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/admin-users`, { headers }),
        fetch(`${API_BASE}/admin-users/departments`, { headers }),
        fetch(`${API_BASE}/employees`, { headers }),
        fetch(`${API_BASE}/attendance/projects`, { headers }),
      ]);

      const usersData = await usersRes.json().catch(() => ({}));
      const departmentsData = await departmentsRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));
      const projectsData = await projectsRes.json().catch(() => ({}));

      if (!usersRes.ok) {
        throw new Error(usersData?.error || usersData?.message || "Failed to load admin users");
      }

      if (!departmentsRes.ok) {
        throw new Error(departmentsData?.error || departmentsData?.message || "Failed to load departments");
      }

      const nextUsers = usersData.users || [];
      const nextDepartments = departmentsData.departments || [];
      const nextEmployees = employeesData.employees || [];
      const nextProjects = projectsData.projects || [];

      setUsers(nextUsers);
      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setProjectSites(nextProjects);
      setWorkerDepartment((current) => current || String(nextDepartments[0]?.name || ""));
      setWorkerProjectSite((current) => current || String(nextProjects[0]?.name || ""));
      setWorkerPosition((current) => current || "Worker");
      setWorkerSalaryBasis((current) => current || "monthly");
      setWorkerHasSss((current) => current ?? true);
      setWorkerHasPagIbig((current) => current ?? true);
      setWorkerHasPhilHealth((current) => current ?? true);
      setAssignmentDrafts(
        nextUsers.reduce((map: Record<string, string[]>, user: AdminUser) => {
          map[user.id] = user.departmentIds || [];
          return map;
        }, {}),
      );

      if (selectedDepartmentIds.length === 0 && nextDepartments.length > 0) {
        setSelectedDepartmentIds([String(nextDepartments[0].id)]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartmentIds.length]);

  useEffect(() => {
    void loadData();

    const interval = window.setInterval(() => {
      void loadData();
    }, 30000);

    const onFocus = () => {
      void loadData();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadData]);

  useSupabaseTableRefresh([
    { table: "employees" },
    { table: "employee_project_deployments" },
  ], () => {
    void loadData();
  });

  function togglePermission(permission: string) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission]
    );
  }

  function toggleAllPermissions() {
    if (selectedPermissions.length === PERMISSION_OPTIONS.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(PERMISSION_OPTIONS.map((p) => p.id));
    }
  }

  function toggleSubAdminDepartment(departmentId: string) {
    setSelectedDepartmentIds((current) =>
      current.includes(departmentId)
        ? current.filter((value) => value !== departmentId)
        : [...current, departmentId],
    );
  }

  async function handleCreateWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");
      if (!workerFullName.trim()) {
        throw new Error("Worker full name is required.");
      }
      if (!workerProjectSite.trim()) {
        throw new Error("Project site is required.");
      }

      const payload = {
        fullName: workerFullName,
        email: workerEmail.trim() || null,
        department: workerDepartment || "Unassigned",
        position: workerPosition || "Worker",
        salary: Number(workerSalary) || 0,
        salaryBasis: workerSalaryBasis,
        status: workerStatus,
        hasSss: workerHasSss,
        hasPagIbig: workerHasPagIbig,
        hasPhilHealth: workerHasPhilHealth,
        hasSssLoan: workerHasSssLoan,
        hasTax: workerHasTax,
        hasAdditionalDeduction: workerHasAdditionalDeduction,
        sssAmount: workerHasSss ? (workerSssAmount === "" ? null : Number(workerSssAmount)) : 0,
        pagIbigAmount: workerHasPagIbig ? (workerPagIbigAmount === "" ? null : Number(workerPagIbigAmount)) : 0,
        philHealthAmount: workerHasPhilHealth ? (workerPhilHealthAmount === "" ? null : Number(workerPhilHealthAmount)) : 0,
        sssLoanAmount: workerHasSssLoan ? (workerSssLoanAmount === "" ? null : Number(workerSssLoanAmount)) : 0,
        taxAmount: workerHasTax ? (workerTaxAmount === "" ? null : Number(workerTaxAmount)) : 0,
        additionalDeductionAmount: workerHasAdditionalDeduction ? (workerAdditionalDeductionAmount === "" ? null : Number(workerAdditionalDeductionAmount)) : 0,
      };

      const response = editingEmployeeId
        ? await fetch(`${API_BASE}/employees/${editingEmployeeId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API_BASE}/employees`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to save worker");
      }

      const employeeId = data?.employee?.id || editingEmployeeId;
      if (employeeId) {
        const assignmentResponse = await fetch(`${API_BASE}/attendance/assignments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId,
            projectName: workerProjectSite,
          }),
        });

        const assignmentData = await assignmentResponse.json().catch(() => ({}));
        if (!assignmentResponse.ok) {
          throw new Error(assignmentData?.error || assignmentData?.message || "Worker saved, but project site assignment failed");
        }
      }

      setEditingEmployeeId(null);
      setWorkerFullName("");
      setWorkerEmail("");
      setWorkerDepartment("");
      setWorkerPosition("Worker");
      setWorkerSalary("");
      setWorkerSalaryBasis("monthly");
      setWorkerProjectSite("");
      setWorkerHasSss(true);
      setWorkerHasPagIbig(true);
      setWorkerHasPhilHealth(true);
      setWorkerHasSssLoan(true);
      setWorkerHasTax(true);
      setWorkerHasAdditionalDeduction(true);
      setWorkerSssAmount("0");
      setWorkerPagIbigAmount("0");
      setWorkerPhilHealthAmount("0");
      setWorkerSssLoanAmount("");
      setWorkerTaxAmount("");
      setWorkerAdditionalDeductionAmount("");
      setWorkerStatus("Active");

      await loadData();
      notify(editingEmployeeId ? "Worker updated successfully" : "Worker added successfully");
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      notify(`Worker save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function startEditWorker(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setWorkerFullName(employee.fullName);
    setWorkerEmail(employee.email);
    setWorkerDepartment(employee.department);
    setWorkerPosition(employee.position);
    setWorkerSalary(String(employee.salary ?? ""));
    setWorkerSalaryBasis(employee.salaryBasis || "monthly");
    setWorkerHasSss(employee.hasSss ?? true);
    setWorkerHasPagIbig(employee.hasPagIbig ?? true);
    setWorkerHasPhilHealth(employee.hasPhilHealth ?? true);
    setWorkerHasSssLoan(employee.hasSssLoan ?? true);
    setWorkerHasTax(employee.hasTax ?? true);
    setWorkerHasAdditionalDeduction(employee.hasAdditionalDeduction ?? true);
    setWorkerSssAmount(employee.sssAmount == null ? "0" : String(employee.sssAmount));
    setWorkerPagIbigAmount(employee.pagIbigAmount == null ? "0" : String(employee.pagIbigAmount));
    setWorkerPhilHealthAmount(employee.philHealthAmount == null ? "0" : String(employee.philHealthAmount));
    setWorkerSssLoanAmount(employee.sssLoanAmount == null ? "" : String(employee.sssLoanAmount));
    setWorkerTaxAmount(employee.taxAmount == null ? "" : String(employee.taxAmount));
    setWorkerAdditionalDeductionAmount(employee.additionalDeductionAmount == null ? "" : String(employee.additionalDeductionAmount));
    setWorkerStatus("Active");
    setWorkerProjectSite(workerProjectSite || projectSites[0]?.name || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteWorker(employeeId: string) {
    if (!confirm("Delete this worker? This cannot be undone.")) return;
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");

      const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to delete worker");
      }

      if (editingEmployeeId === employeeId) {
        setEditingEmployeeId(null);
      }
      await loadData();
      notify("Worker deleted successfully");
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      notify(`Worker delete failed: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleDraftDepartment(userId: string, departmentId: string) {
    setAssignmentDrafts((current) => {
      const selected = current[userId] || [];
      const next = selected.includes(departmentId)
        ? selected.filter((value) => value !== departmentId)
        : [...selected, departmentId];
      return { ...current, [userId]: next };
    });
  }

  async function handleCreateSubAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");
      if (selectedPermissions.length === 0) {
        throw new Error("Select at least one permission.");
      }

      const response = await fetch(`${API_BASE}/admin-users/sub-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password,
          permissions: selectedPermissions,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to create sub-admin");
      }

      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSelectedPermissions([]);

      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }


  async function saveAssignments(userId: string) {
    setAssignmentSavingUserId(userId);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");

      const departmentIds = assignmentDrafts[userId] || [];
      if (departmentIds.length === 0) {
        throw new Error("Select at least one department for this admin.");
      }

      const response = await fetch(`${API_BASE}/admin-users/${userId}/departments`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ departmentIds }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to update departments");
      }

      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssignmentSavingUserId(null);
    }
  }

  if (!loading && !canViewAdmins) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-pink-50 p-12 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100">
              <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-600">Restricted</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Access Denied</h2>
            <p className="mt-3 text-slate-600">You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-white/90">System administration</p>
          </div>
          <h2 className="mt-4 break-words text-3xl font-black tracking-tight sm:text-5xl">
            Admin Access Control
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-white/90">
            Create and manage sub-admins and department-head admins. Assign specific permissions and department access as needed.
          </p>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center">
              <svg className="h-12 w-12 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Loading admin data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-pink-50 p-6 shadow-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-red-900">Error</p>
            <p className="mt-1 text-sm font-semibold text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Sub-Admin & Worker Creation Section */}
      {canCreateAdmins && (
        <section className="grid gap-6 xl:grid-cols-2">
          {/* Sub-Admin Creation Card */}
          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Create account</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">Add sub-admin</h3>
                </div>
              </div>
              <span className="rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1 text-xs font-bold text-blue-700">
                Super Admin
              </span>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="juan.admin"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="minimum 4 characters"
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="juan@company.com"
                    required
                  />
                </label>
              </div>

              <div className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-700">Permissions</span>
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
                  >
                    {selectedPermissions.length === PERMISSION_OPTIONS.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 shadow-sm">
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:shadow-md"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(option.id)}
                          onChange={() => togglePermission(option.id)}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 transition focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="font-semibold">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || loading || selectedPermissions.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3.5 font-bold text-white shadow-lg transition hover:from-blue-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
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
                    Create sub-admin
                  </>
                )}
              </button>
            </form>
          </article>

          {/* Worker Creation Card */}
          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Workforce</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">Add worker</h3>
                </div>
              </div>
              <span className="rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-xs font-bold text-purple-700">
                Super Admin
              </span>
            </div>

            <form onSubmit={handleCreateWorker} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Full name</span>
                  <input
                    value={workerFullName}
                    onChange={(event) => setWorkerFullName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Maria Santos"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={workerEmail}
                    onChange={(event) => setWorkerEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="maria@company.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Salary amount</span>
                  <input
                    type="number"
                    min="0"
                    value={workerSalary}
                    onChange={(event) => setWorkerSalary(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="32000"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Salary basis</span>
                  <select
                    value={workerSalaryBasis}
                    onChange={(event) => setWorkerSalaryBasis(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  >
                    <option value="monthly">Per month</option>
                    <option value="daily">Per day</option>
                  </select>
                </label>

                {/* Deductions Section */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-purple-50/30 p-4 shadow-sm sm:col-span-2">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">Deductions</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasSss} onChange={(event) => setWorkerHasSss(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        SSS
                      </label>
                      <input type="number" value={workerSssAmount} onChange={(event) => setWorkerSssAmount(event.target.value)} disabled={!workerHasSss} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasPagIbig} onChange={(event) => setWorkerHasPagIbig(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        Pag-IBIG
                      </label>
                      <input type="number" value={workerPagIbigAmount} onChange={(event) => setWorkerPagIbigAmount(event.target.value)} disabled={!workerHasPagIbig} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasPhilHealth} onChange={(event) => setWorkerHasPhilHealth(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        PhilHealth
                      </label>
                      <input type="number" value={workerPhilHealthAmount} onChange={(event) => setWorkerPhilHealthAmount(event.target.value)} disabled={!workerHasPhilHealth} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasSssLoan} onChange={(event) => setWorkerHasSssLoan(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        SSS Loan
                      </label>
                      <input type="number" value={workerSssLoanAmount} onChange={(event) => setWorkerSssLoanAmount(event.target.value)} disabled={!workerHasSssLoan} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasTax} onChange={(event) => setWorkerHasTax(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        Tax
                      </label>
                      <input type="number" value={workerTaxAmount} onChange={(event) => setWorkerTaxAmount(event.target.value)} disabled={!workerHasTax} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={workerHasAdditionalDeduction} onChange={(event) => setWorkerHasAdditionalDeduction(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20" />
                        Additional
                      </label>
                      <input type="number" value={workerAdditionalDeductionAmount} onChange={(event) => setWorkerAdditionalDeductionAmount(event.target.value)} disabled={!workerHasAdditionalDeduction} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:bg-slate-100" placeholder="Amount (₱)" />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Department</span>
                  <input
                    list="worker-departments"
                    value={workerDepartment}
                    onChange={(event) => setWorkerDepartment(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Select or type department"
                  />
                  <datalist id="worker-departments">
                    {departmentOptions.map((option) => (
                      <option key={option.value} value={option.label} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Position</span>
                  <input
                    value={workerPosition}
                    onChange={(event) => setWorkerPosition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Worker"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Project site</span>
                  <input
                    list="worker-project-sites"
                    value={workerProjectSite}
                    onChange={(event) => setWorkerProjectSite(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                    placeholder="Select or type project site"
                  />
                  <datalist id="worker-project-sites">
                    {projectSites.map((site) => (
                      <option key={site.id} value={site.name} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Status</span>
                <select
                  value={workerStatus}
                  onChange={(event) => setWorkerStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                >
                  <option value="Active">Active</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-bold text-white shadow-lg transition hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingEmployeeId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {editingEmployeeId ? "Update worker" : "Create worker"}
                  </>
                )}
              </button>
            </form>
          </article>
        </section>
      )}

      {/* Admin Users List */}
      {canViewAdmins && (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Access list</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Current admin users</h3>
              </div>
            </div>
            <span className="rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 text-sm font-bold text-emerald-700">
              {users.length} user{users.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {users.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="mt-4 text-sm font-semibold text-slate-500">No admin users found.</p>
              </div>
            )}

            {users.map((user) => (
              <div key={user.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 shadow-lg transition hover:shadow-xl">
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-black text-slate-900">{user.fullName}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {user.username} · {user.email}
                      </p>
                      <p className="mt-2 inline-block rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1 text-xs font-bold text-blue-700">{roleLabel(user.role)}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold ${
                        user.isActive
                          ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700"
                          : "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Sub-admin permissions display */}
                  {user.role === "sub-admin" && user.permissions && user.permissions.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Permissions
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 text-xs font-bold text-white shadow-sm"
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Department head department assignment */}
                  {user.role === "department-head-admin" && (
                    <>
                      <div className="mt-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Department assignment
                          </p>
                          <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                            {(assignmentDrafts[user.id] || []).length} selected
                          </p>
                        </div>

                        <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {departmentOptions.map((option) => (
                              <label
                                key={`${user.id}-${option.value}`}
                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                              >
                                <input
                                  type="checkbox"
                                  checked={(assignmentDrafts[user.id] || []).includes(option.value)}
                                  onChange={() => toggleDraftDepartment(user.id, option.value)}
                                  className="h-4 w-4 rounded border-slate-300 text-purple-600 transition focus:ring-2 focus:ring-purple-500/20"
                                />
                                <span className="truncate font-semibold">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg transition hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={assignmentSavingUserId === user.id}
                          onClick={() => saveAssignments(user.id)}
                        >
                          {assignmentSavingUserId === user.id ? (
                            <>
                              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save assignments
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worker Management Section */}
      {canViewAdmins && (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Workforce</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Employee Management</h3>
              </div>
            </div>
            <span className="rounded-full bg-gradient-to-r from-orange-100 to-red-100 px-4 py-2 text-sm font-bold text-orange-700">
              {employees.length} employee{employees.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Employee Search */}
          <div className="mt-6">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Search employees</span>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(event) => {
                    setEmployeeSearch(event.target.value);
                    setEmployeePage(1);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  placeholder="Search by name or email..."
                />
              </div>
            </label>
          </div>

          {/* Employee List with Pagination */}
          <div className="mt-6 space-y-3">
            {filteredEmployees.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
                <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-4 text-sm font-semibold text-slate-500">
                  {employeeSearch ? "No employees match your search." : "No employees found."}
                </p>
              </div>
            )}

            {paginatedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-lg transition hover:shadow-xl"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-900">{employee.fullName}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{employee.email}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {employee.position}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {employee.department}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Salary: <span className="font-semibold">{employee.salaryBasis === "daily" ? "Per day" : "Per month"}</span> • ₱{employee.salary ?? 0}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => startEditWorker(employee)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-2.5 font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    onClick={() => deleteWorker(employee.id)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600">
                Showing {paginatedEmployees.length > 0 ? (employeePage - 1) * employeesPerPage + 1 : 0} to{" "}
                {Math.min(employeePage * employeesPerPage, filteredEmployees.length)} of{" "}
                {filteredEmployees.length}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEmployeePage((p) => Math.max(1, p - 1))}
                  disabled={employeePage === 1}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setEmployeePage(page)}
                      className={`rounded-xl px-4 py-2 font-bold shadow-sm transition ${
                        page === employeePage
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                          : "border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setEmployeePage((p) => Math.min(totalPages, p + 1))}
                  disabled={employeePage === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
