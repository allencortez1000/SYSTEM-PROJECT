"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

  // Department head form state
  const [departmentHeadFullName, setDepartmentHeadFullName] = useState("");
  const [departmentHeadUsername, setDepartmentHeadUsername] = useState("");
  const [departmentHeadEmail, setDepartmentHeadEmail] = useState("");
  const [departmentHeadPassword, setDepartmentHeadPassword] = useState("");
  const [departmentHeadDepartmentIds, setDepartmentHeadDepartmentIds] = useState<string[]>([]);

  // Department assignment state
  const [assignmentSavingUserId, setAssignmentSavingUserId] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({});

  // Employee management state
  const [employees, setEmployees] = useState<Employee[]>([]);
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
      const [usersRes, departmentsRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE}/admin-users`, { headers }),
        fetch(`${API_BASE}/admin-users/departments`, { headers }),
        fetch(`${API_BASE}/employees`, { headers }),
      ]);

      const usersData = await usersRes.json().catch(() => ({}));
      const departmentsData = await departmentsRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));

      if (!usersRes.ok) {
        throw new Error(usersData?.error || usersData?.message || "Failed to load admin users");
      }

      if (!departmentsRes.ok) {
        throw new Error(departmentsData?.error || departmentsData?.message || "Failed to load departments");
      }

      const nextUsers = usersData.users || [];
      const nextDepartments = departmentsData.departments || [];
      const nextEmployees = employeesData.employees || [];

      setUsers(nextUsers);
      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setAssignmentDrafts(
        nextUsers.reduce((map: Record<string, string[]>, user: AdminUser) => {
          map[user.id] = user.departmentIds || [];
          return map;
        }, {}),
      );

      if (selectedDepartmentIds.length === 0 && nextDepartments.length > 0) {
        setSelectedDepartmentIds([String(nextDepartments[0].id)]);
      }
      if (departmentHeadDepartmentIds.length === 0 && nextDepartments.length > 0) {
        setDepartmentHeadDepartmentIds([String(nextDepartments[0].id)]);
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

  function toggleDepartmentHeadDepartment(departmentId: string) {
    setDepartmentHeadDepartmentIds((current) =>
      current.includes(departmentId)
        ? current.filter((value) => value !== departmentId)
        : [...current, departmentId],
    );
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

  async function handleCreateDepartmentHead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");
      if (departmentHeadDepartmentIds.length === 0) {
        throw new Error("Select at least one department.");
      }

      const response = await fetch(`${API_BASE}/admin-users/department-head`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: departmentHeadFullName,
          username: departmentHeadUsername,
          email: departmentHeadEmail,
          password: departmentHeadPassword,
          departmentIds: departmentHeadDepartmentIds,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to create department head admin");
      }

      setDepartmentHeadFullName("");
      setDepartmentHeadUsername("");
      setDepartmentHeadEmail("");
      setDepartmentHeadPassword("");
      setDepartmentHeadDepartmentIds([]);

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
                <p className="eyebrow">Create account</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Add department-head admin</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Super Admin Action
              </span>
            </div>

            <form onSubmit={handleCreateDepartmentHead} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Full name</span>
                  <input
                    value={departmentHeadFullName}
                    onChange={(event) => setDepartmentHeadFullName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="Maria Santos"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Username</span>
                  <input
                    value={departmentHeadUsername}
                    onChange={(event) => setDepartmentHeadUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="maria.head"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Password</span>
                  <input
                    type="password"
                    value={departmentHeadPassword}
                    onChange={(event) => setDepartmentHeadPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="minimum 4 characters"
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Email</span>
                  <input
                    type="email"
                    value={departmentHeadEmail}
                    onChange={(event) => setDepartmentHeadEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="maria@company.com"
                    required
                  />
                </label>
              </div>

              <div className="block">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-600">Departments (multi-select)</span>
                  <span className="text-xs font-semibold text-slate-500">
                    Selected: {departmentHeadDepartmentIds.length}
                  </span>
                </div>

                <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {departmentOptions.length === 0 && (
                      <p className="text-sm text-slate-500">No departments found</p>
                    )}
                    {departmentOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={departmentHeadDepartmentIds.includes(option.value)}
                          onChange={() => toggleDepartmentHeadDepartment(option.value)}
                        />
                        <span className="truncate">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || loading || departmentHeadDepartmentIds.length === 0}
                className="primary-button w-full"
              >
                {saving ? "Creating..." : "Create department-head admin"}
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
