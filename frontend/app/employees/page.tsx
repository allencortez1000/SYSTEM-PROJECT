"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotification } from "../components/notification";
import { useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  email?: string | null;
  department: string;
  projectSite?: string | null;
  position: string;
  status: string;
  salary: number;
  salaryBasis?: string | null;
};

type FieldView = "both" | "department" | "projectSite";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldView, setFieldView] = useState<FieldView>("both");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [selectedProjectSite, setSelectedProjectSite] = useState<string>("All");
  const { notify } = useNotification();

  const employeeList = employees ?? [];

  const departmentOptions = useMemo(() => {
    const departments = new Set(
      employeeList
        .map((emp) => emp.department)
        .filter((dept): dept is string => Boolean(dept))
    );
    return ["All", ...Array.from(departments).sort()];
  }, [employeeList]);

  const projectSiteOptions = useMemo(() => {
    const sites = new Set(
      employeeList
        .map((emp) => emp.projectSite)
        .filter((site): site is string => Boolean(site))
    );
    return ["All", ...Array.from(sites).sort()];
  }, [employeeList]);

  const filteredEmployees = useMemo(() => {
    return employeeList.filter((employee) => {
      const departmentMatch = selectedDepartment === "All" || employee.department === selectedDepartment;
      const projectSiteMatch = selectedProjectSite === "All" || employee.projectSite === selectedProjectSite;
      return departmentMatch && projectSiteMatch;
    });
  }, [employeeList, selectedDepartment, selectedProjectSite]);

  const stats = useMemo(() => {
    const activeStaff = filteredEmployees.filter((employee) => String(employee.status || "").toLowerCase() === "active").length;
    const departments = new Set(filteredEmployees.map((employee) => employee.department).filter(Boolean)).size;

    return {
      activeStaff,
      departments,
      totalRecords: filteredEmployees.length,
    };
  }, [filteredEmployees]);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch("/api/employees", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to fetch employees");
      }

      setEmployees(data.employees || []);
      setError(null);
      notify("Employees loaded");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  useSupabaseTableRefresh([{ table: "employees" }], () => {
    void load();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Employee Directory
              </h1>
              <p className="mt-2 text-base text-slate-600">
                Manage and view all employee information in one place
              </p>
            </div>
            <Link
              href="/employees/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Employees</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.activeStaff}</p>
              </div>
              <div className="rounded-xl bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Departments</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.departments}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Records</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalRecords}</p>
              </div>
              <div className="rounded-xl bg-purple-100 p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <label htmlFor="department-filter" className="text-sm font-semibold text-slate-700">
                  Department
                </label>
              </div>
              <select
                id="department-filter"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <label htmlFor="projectsite-filter" className="text-sm font-semibold text-slate-700">
                  Project Site
                </label>
              </div>
              <select
                id="projectsite-filter"
                value={selectedProjectSite}
                onChange={(e) => setSelectedProjectSite(e.target.value)}
                className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                {projectSiteOptions.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setFieldView("both")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    fieldView === "both"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => setFieldView("department")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    fieldView === "department"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Dept
                </button>
                <button
                  type="button"
                  onClick={() => setFieldView("projectSite")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    fieldView === "projectSite"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Site
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-slate-600">Loading employees...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error loading employees</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Employee Grid */}
        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((employee) => {
              const displayName = employee.fullName || "Unnamed employee";
              const initials = displayName
                .split(" ")
                .map((name) => name[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("");
              const status = String(employee.status || "");
              const isActive = status.toLowerCase() === "active";
              const salaryLabel = Number.isFinite(employee.salary) && employee.salary > 0
                ? `₱${employee.salary.toLocaleString()}`
                : "Not set";

              return (
                <Link
                  key={employee.id}
                  href={`/employees/${employee.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-600/10"
                >
                  {/* Status Badge */}
                  <div className="absolute right-4 top-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-green-600" : "bg-slate-400"
                      }`}></span>
                      {status || "Unknown"}
                    </span>
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/30">
                      {initials || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-blue-600">
                        {displayName}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {employee.position || "No position"}
                      </p>
                      {fieldView !== "projectSite" && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1">
                          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-xs font-semibold text-slate-700">
                            {employee.department || "No dept"}
                          </span>
                        </div>
                      )}
                      {fieldView !== "department" && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1">
                          <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-blue-700">
                            {employee.projectSite || "Unassigned"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-500">Employee ID</span>
                      <span className="font-semibold text-slate-900">{employee.employeeId || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-500">Email</span>
                      <span className="truncate font-medium text-slate-700">{employee.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-500">Salary</span>
                      <span className="font-bold text-blue-600">{salaryLabel}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4 flex items-center justify-end gap-2 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                    <span>View Profile</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredEmployees.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No employees found</h3>
            <p className="mt-2 text-sm text-slate-600">
              {selectedDepartment !== "All" || selectedProjectSite !== "All"
                ? "Try adjusting your filters to see more results."
                : "Get started by adding your first employee."}
            </p>
            {(selectedDepartment !== "All" || selectedProjectSite !== "All") && (
              <button
                onClick={() => {
                  setSelectedDepartment("All");
                  setSelectedProjectSite("All");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
