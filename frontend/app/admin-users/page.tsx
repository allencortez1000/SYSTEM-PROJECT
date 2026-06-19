"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SessionUser = {
  role?: string;
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
};

const API_BASE = "http://localhost:4000/api";

function roleLabel(role: string) {
  if (role === "super-admin") return "Super Admin";
  if (role === "department-head-admin") return "Department Head Admin";
  return role;
}

export default function AdminUsersPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

  const [assignmentSavingUserId, setAssignmentSavingUserId] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({});

  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department.id, label: department.name })),
    [departments],
  );

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");

      const rawUser = localStorage.getItem("hr_user");
      const sessionUser: SessionUser | null = rawUser ? JSON.parse(rawUser) : null;
      if (sessionUser?.role !== "super-admin") {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, departmentsRes] = await Promise.all([
        fetch(`${API_BASE}/admin-users`, { headers }),
        fetch(`${API_BASE}/admin-users/departments`, { headers }),
      ]);

      const usersData = await usersRes.json().catch(() => ({}));
      const departmentsData = await departmentsRes.json().catch(() => ({}));

      if (!usersRes.ok) {
        throw new Error(usersData?.error || usersData?.message || "Failed to load admin users");
      }

      if (!departmentsRes.ok) {
        throw new Error(departmentsData?.error || departmentsData?.message || "Failed to load departments");
      }

      const nextUsers = usersData.users || [];
      const nextDepartments = departmentsData.departments || [];

      setUsers(nextUsers);
      setDepartments(nextDepartments);
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

  function toggleCreateDepartment(departmentId: string) {
    setSelectedDepartmentIds((current) =>
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

  async function handleCreateDepartmentHead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      if (!token) throw new Error("Missing login token. Please sign in again.");
      if (selectedDepartmentIds.length === 0) {
        throw new Error("Select at least one department.");
      }

      const response = await fetch(`${API_BASE}/admin-users/department-head`, {
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
          departmentIds: selectedDepartmentIds,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to create department head admin");
      }

      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");

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

  if (!loading && !authorized) {
    return (
      <div className="page-shell">
        <section className="section-card">
          <p className="eyebrow">Restricted</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Super admin only</h2>
          <p className="mt-3 text-slate-600">This page is only available to the super admin account.</p>
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
          Create and manage department-head admins. Each department head can only track employees in assigned departments.
        </p>
      </section>

      {loading && <p className="section-card text-sm font-semibold text-slate-600">Loading admin data...</p>}
      {error && <p className="section-card text-sm font-semibold text-red-700">Error: {error}</p>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
                  placeholder="juan.head"
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
                <span className="text-sm font-bold text-slate-600">Departments (multi-select)</span>
                <span className="text-xs font-semibold text-slate-500">
                  Selected: {selectedDepartmentIds.length}
                </span>
              </div>

              <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {departmentOptions.length === 0 && <p className="text-sm text-slate-500">No departments found</p>}
                  {departmentOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedDepartmentIds.includes(option.value)}
                        onChange={() => toggleCreateDepartment(option.value)}
                      />
                      <span className="truncate">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving || loading || selectedDepartmentIds.length === 0} className="primary-button w-full">
              {saving ? "Creating..." : "Create department-head admin"}
            </button>
          </form>
        </article>

        <article className="section-card min-w-0">
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
                    <p className="truncate text-xs text-slate-500">{user.username} · {user.email}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{roleLabel(user.role)}</p>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {user.role === "department-head-admin" && (
                  <>
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Department assignment</p>
                        <p className="text-xs text-slate-500">
                          {(assignmentDrafts[user.id] || []).length} selected
                        </p>
                      </div>

                      <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {departmentOptions.map((option) => (
                            <label key={`${user.id}-${option.value}`} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-white">
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
                        {assignmentSavingUserId === user.id ? "Saving..." : "Save assignments"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
