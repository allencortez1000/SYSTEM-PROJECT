"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNotification } from "../components/notification";

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
  sssAmount?: number | null;
  pagIbigAmount?: number | null;
  philHealthAmount?: number | null;
  sssLoanAmount?: number | null;
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
  const [workerSssAmount, setWorkerSssAmount] = useState("");
  const [workerPagIbigAmount, setWorkerPagIbigAmount] = useState("");
  const [workerPhilHealthAmount, setWorkerPhilHealthAmount] = useState("");
  const [workerSssLoanAmount, setWorkerSssLoanAmount] = useState("");
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
    return employees.filter((emp) =>
      emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const paginatedEmployees = useMemo(() => {
    const start = (employeePage - 1) * employeesPerPage;
    return filteredEmployees.slice(start, start + employeesPerPage);
  }, [filteredEmployees, employeePage]);

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  async function loadData() {
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
  }

  useEffect(() => {
    loadData();
  }, []);

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
      if (!workerFullName.trim() || !workerEmail.trim()) {
        throw new Error("Worker full name and email are required.");
      }
      if (!workerProjectSite.trim()) {
        throw new Error("Project site is required.");
      }

      const payload = {
        fullName: workerFullName,
        email: workerEmail,
        department: workerDepartment || "Unassigned",
        position: workerPosition || "Worker",
        salary: Number(workerSalary) || 0,
        salaryBasis: workerSalaryBasis,
        status: workerStatus,
        hasSss: workerHasSss,
        hasPagIbig: workerHasPagIbig,
        hasPhilHealth: workerHasPhilHealth,
        sssAmount: workerSssAmount === "" ? null : Number(workerSssAmount),
        pagIbigAmount: workerPagIbigAmount === "" ? null : Number(workerPagIbigAmount),
        philHealthAmount: workerPhilHealthAmount === "" ? null : Number(workerPhilHealthAmount),
        sssLoanAmount: workerSssLoanAmount === "" ? null : Number(workerSssLoanAmount),
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
      setWorkerSssAmount("");
      setWorkerPagIbigAmount("");
      setWorkerPhilHealthAmount("");
      setWorkerSssLoanAmount("");
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
    setWorkerSssAmount(employee.sssAmount == null ? "" : String(employee.sssAmount));
    setWorkerPagIbigAmount(employee.pagIbigAmount == null ? "" : String(employee.pagIbigAmount));
    setWorkerPhilHealthAmount(employee.philHealthAmount == null ? "" : String(employee.philHealthAmount));
    setWorkerSssLoanAmount(employee.sssLoanAmount == null ? "" : String(employee.sssLoanAmount));
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
        <section className="section-card">
          <p className="eyebrow">Restricted</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Access Denied</h2>
          <p className="mt-3 text-slate-600">You do not have permission to access this page.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">System administration</p>
        <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Admin Access Control
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          Create and manage sub-admins and department-head admins. Assign specific permissions and department access as needed.
        </p>
      </section>

      {loading && <p className="section-card text-sm font-semibold text-slate-600">Loading admin data...</p>}
      {error && <p className="section-card text-sm font-semibold text-red-700">Error: {error}</p>}

      {/* Sub-Admin Creation Section */}
      {canCreateAdmins && (
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="section-card min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Create account</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Add sub-admin</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Super Admin Action
              </span>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="juan.admin"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="minimum 4 characters"
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="juan@company.com"
                    required
                  />
                </label>
              </div>

              <div className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-600">Permissions</span>
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {selectedPermissions.length === PERMISSION_OPTIONS.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(option.id)}
                          onChange={() => togglePermission(option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || loading || selectedPermissions.length === 0}
                className="primary-button w-full"
              >
                {saving ? "Creating..." : "Create sub-admin"}
              </button>
            </form>
          </article>

          {/* Department Head Creation Section */}
          <article className="section-card min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Workforce</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Add worker</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Super Admin Action
              </span>
            </div>

            <form onSubmit={handleCreateWorker} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Full name</span>
                  <input
                    value={workerFullName}
                    onChange={(event) => setWorkerFullName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Maria Santos"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Email</span>
                  <input
                    type="email"
                    value={workerEmail}
                    onChange={(event) => setWorkerEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="maria@company.com"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Salary amount</span>
                  <input
                    type="number"
                    min="0"
                    value={workerSalary}
                    onChange={(event) => setWorkerSalary(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="32000"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Salary basis</span>
                  <select
                    value={workerSalaryBasis}
                    onChange={(event) => setWorkerSalaryBasis(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="monthly">Per month</option>
                    <option value="daily">Per day</option>
                  </select>
                </label>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-3">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={workerHasSss} onChange={(event) => setWorkerHasSss(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    SSS
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={workerHasPagIbig} onChange={(event) => setWorkerHasPagIbig(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Pag-IBIG
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={workerHasPhilHealth} onChange={(event) => setWorkerHasPhilHealth(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    PhilHealth
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Department</span>
                  <input
                    list="worker-departments"
                    value={workerDepartment}
                    onChange={(event) => setWorkerDepartment(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Select or type department"
                  />
                  <datalist id="worker-departments">
                    {departmentOptions.map((option) => (
                      <option key={option.value} value={option.label} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Position</span>
                  <input
                    value={workerPosition}
                    onChange={(event) => setWorkerPosition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Worker"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Project site</span>
                  <input
                    list="worker-project-sites"
                    value={workerProjectSite}
                    onChange={(event) => setWorkerProjectSite(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                <span className="text-sm font-bold text-slate-600">Status</span>
                <select
                  value={workerStatus}
                  onChange={(event) => setWorkerStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
                className="primary-button w-full"
              >
                {saving ? "Creating..." : "Create worker"}
              </button>
            </form>
          </article>
        </section>
      )}

      {/* Admin Users List */}
      {canViewAdmins && (
        <section className="section-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Access list</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Current admin users</h3>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {users.length} user{users.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {users.length === 0 && !loading && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No admin users found.
              </div>
            )}

            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {user.username} · {user.email}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{roleLabel(user.role)}</p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      user.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Sub-admin permissions display */}
                {user.role === "sub-admin" && user.permissions && user.permissions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Permissions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Department head department assignment */}
                {user.role === "department-head-admin" && (
                  <>
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Department assignment
                        </p>
                        <p className="text-xs text-slate-500">
                          {(assignmentDrafts[user.id] || []).length} selected
                        </p>
                      </div>

                      <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {departmentOptions.map((option) => (
                            <label
                              key={`${user.id}-${option.value}`}
                              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-white"
                            >
                              <input
                                type="checkbox"
                                checked={(assignmentDrafts[user.id] || []).includes(option.value)}
                                onChange={() => toggleDraftDepartment(user.id, option.value)}
                              />
                              <span className="truncate">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={assignmentSavingUserId === user.id}
                        onClick={() => saveAssignments(user.id)}
                      >
                        {assignmentSavingUserId === user.id
                          ? "Saving..."
                          : "Save assignments"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worker Management Section */}
      {canViewAdmins && (
        <section className="section-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Workforce</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Employee Management</h3>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
              {employees.length} employee{employees.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Employee Search */}
          <div className="mt-6">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Search employees</span>
              <input
                type="text"
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setEmployeePage(1);
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                placeholder="Search by name or email..."
              />
            </label>
          </div>

          {/* Employee List with Pagination */}
          <div className="mt-6 space-y-3">
            {filteredEmployees.length === 0 && !loading && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {employeeSearch ? "No employees match your search." : "No employees found."}
              </div>
            )}

            {paginatedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">{employee.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{employee.email}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-semibold">{employee.position}</span> • {employee.department}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Salary: {employee.salaryBasis === "daily" ? "Per day" : "Per month"} • {employee.salary ?? 0}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEditWorker(employee)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                    onClick={() => deleteWorker(employee.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">
                Showing {paginatedEmployees.length > 0 ? (employeePage - 1) * employeesPerPage + 1 : 0} to{" "}
                {Math.min(employeePage * employeesPerPage, filteredEmployees.length)} of{" "}
                {filteredEmployees.length}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setEmployeePage((p) => Math.max(1, p - 1))}
                  disabled={employeePage === 1}
                  className="secondary-button"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setEmployeePage(page)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        page === employeePage
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setEmployeePage((p) => Math.min(totalPages, p + 1))}
                  disabled={employeePage === totalPages}
                  className="secondary-button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
