"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import FilterBar from "../components/filter-bar";
import { filterInputClassName, filterSelectCompactClassName } from "../components/filter-config";
import { useNotification } from "../components/notification";
import { triggerAppDataRefresh, useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

const statusOptions = ["Present", "Halfday", "Absent", "Leave", "Remote"] as const;
type AttendanceStatus = (typeof statusOptions)[number];
type PeriodMode = "weekly" | "semi-monthly";
type OvertimeMode = "auto" | "manual";

type AttendanceRecord = {
  id: string | number;
  employeeId?: string;
  employeeName: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  projectSite?: string;
  periodMode?: string;
  workedHours?: number;
  overtimeHours?: number;
  overtimeMode?: OvertimeMode;
};

type Employee = {
  id: string;
  fullName: string;
  department?: string;
  position?: string;
  salary?: number;
  status?: string;
};

type ProjectAssignmentMap = Record<string, string>;

type DepartmentRow = {
  id: string;
  name: string;
};

type ProjectSiteRow = {
  id: string;
  name: string;
};

type DraftEntry = {
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  overtimeHours: string;
  overtimeMode: OvertimeMode;
};

type DraftMap = Record<string, DraftEntry>;

type ActiveCell = {
  employeeId: string;
  date: string;
} | null;

type DeleteTarget = {
  employeeId: string;
  date: string;
} | null;

const defaultProjects: string[] = [];
const defaultDepartments: string[] = [];
const defaultDraftEntry: DraftEntry = {
  status: "Present",
  checkIn: "07:00",
  checkOut: "16:00",
  notes: "",
  overtimeHours: "0",
  overtimeMode: "manual",
};

const statusClass: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700",
  Halfday: "bg-cyan-50 text-cyan-700",
  Absent: "bg-red-50 text-red-700",
  Leave: "bg-amber-50 text-amber-700",
  Remote: "bg-blue-50 text-blue-700",
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatDateLabel(value: string) {
  return parseIsoDate(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    weekday: "short",
  });
}

function formatWeekdayLabel(value: string) {
  return parseIsoDate(value).toLocaleDateString("en-PH", {
    weekday: "short",
  });
}

function formatDateFull(value: string) {
  return parseIsoDate(value).toLocaleDateString("en-PH", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    weekday: "long",
  });
}

function weekStart(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function periodStartDate(anchorDate: string, periodMode: PeriodMode) {
  const anchor = parseIsoDate(anchorDate);
  if (periodMode === "weekly") {
    return isoDate(weekStart(anchor));
  }
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const day = anchor.getDate();
  return isoDate(new Date(year, month, day <= 15 ? 1 : 16));
}

function getPeriodDates(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (end < start) return [isoDate(start)];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function describePeriod(dates: string[], mode: PeriodMode) {
  if (dates.length === 0) return "";
  const first = parseIsoDate(dates[0]).toLocaleDateString("en-PH", { month: "long", day: "2-digit", year: "numeric" });
  const last = parseIsoDate(dates[dates.length - 1]).toLocaleDateString("en-PH", { month: "long", day: "2-digit", year: "numeric" });
  return `${mode === "weekly" ? "Weekly" : "Semi-monthly"} period: ${first} - ${last}`;
}

function getDraftKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

function parseTimeToMinutes(value: string) {
  if (!value) return null;

  const trimmed = value.trim();
  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const meridiem = meridiemMatch[3].toLowerCase();
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours === 12) hours = 0;
    if (meridiem === "pm") hours += 12;
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!twentyFourHourMatch) return null;

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function computeWorkedHours(checkIn: string, checkOut: string) {
  const start = parseTimeToMinutes(checkIn);
  const end = parseTimeToMinutes(checkOut);
  if (start === null || end === null || end <= start) return 0;
  const grossHours = (end - start) / 60;
  const breakHours = grossHours >= 1 ? 1 : 0;
  return Math.max(0, Math.round((grossHours - breakHours) * 100) / 100);
}

function computeAutoOvertime(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((computeWorkedHours(checkIn, checkOut) - 8) * 100) / 100);
}

function uniqueById(employees: Employee[]) {
  const seen = new Set<string>();
  return employees.filter((employee) => {
    const key = employee.id.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSavedOvertime(notes?: string, record?: AttendanceRecord) {
  if (record?.overtimeHours !== undefined || record?.overtimeMode) {
    return {
      notes: notes || "",
      overtimeHours: String(record.overtimeHours ?? 0),
      overtimeMode: record.overtimeMode || "auto",
    } as const;
  }

  if (!notes) {
    return { notes: "", overtimeHours: "0", overtimeMode: "manual" as const };
  }

  const parts = notes.split("|").map((part) => part.trim()).filter(Boolean);
  const overtimePart = parts.find((part) => /^OT hours:\s*/i.test(part));
  const cleanNotes = parts.filter((part) => !/^OT hours:\s*/i.test(part)).join(" | ");

  if (!overtimePart) {
    return { notes: cleanNotes, overtimeHours: "0", overtimeMode: "manual" as const };
  }

  const parsed = overtimePart.replace(/^OT hours:\s*/i, "").trim();
  return {
    notes: cleanNotes,
    overtimeHours: parsed || "0",
    overtimeMode: "manual" as const,
  };
}

export default function AttendancePage() {
  const { notify } = useNotification();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>(defaultDepartments);
  const [projects, setProjects] = useState<string[]>(defaultProjects);
  const [assignments, setAssignments] = useState<ProjectAssignmentMap>({});
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProject, setSelectedProject] = useState(defaultProjects[0]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("weekly");
  const [rangeStartDate, setRangeStartDate] = useState(isoDate(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState(isoDate(new Date()));
  const [newProjectName, setNewProjectName] = useState("");
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const [activeAttendanceDate, setActiveAttendanceDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignmentSavingId, setAssignmentSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"name-asc" | "name-desc" | "date-desc" | "date-asc" | "status">("date-desc");
  const anchorDateInitializedRef = useRef(false);

  useEffect(() => {
    // Source of truth is Supabase; avoid stale browser-cached assignments/projects.
  }, []);

  useEffect(() => {
    if (!projects.includes(selectedProject)) {
      setSelectedProject(projects[0] || defaultProjects[0]);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    if (!selectedDepartment) return;

    if (selectedDepartment.toLowerCase() !== "construction") {
      if (selectedProject !== "Main Office") {
        setSelectedProject("Main Office");
      }
      return;
    }

    if (employees.length === 0 || projects.length === 0) return;

    const hasMatches = employees.some((employee) => {
      const matchesDepartment = String(employee.department || "").toLowerCase() === selectedDepartment.toLowerCase();
      const matchesProject = !selectedProject || assignments[employee.id] === selectedProject;
      return matchesDepartment && matchesProject;
    });

    if (hasMatches) return;

    const nextProject = projects.find((project) =>
      employees.some((employee) =>
        String(employee.department || "").toLowerCase() === selectedDepartment.toLowerCase() &&
        assignments[employee.id] === project,
      ),
    );

    if (nextProject && nextProject !== selectedProject) {
      setSelectedProject(nextProject);
    }
  }, [assignments, employees, projects, selectedDepartment, selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);

    try {
      const token = localStorage.getItem("hr_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [attendanceRes, employeesRes, projectsRes, assignmentsRes, departmentsRes] = await Promise.all([
        fetch("/api/attendance", { headers }),
        fetch("/api/employees?limit=0", { headers }),
        fetch("/api/attendance/projects", { headers }),
        fetch("/api/attendance/assignments", { headers }),
        fetch("/api/admin-users/departments", { headers }),
      ]);

      const attendanceData = await attendanceRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));
      const projectsData = await projectsRes.json().catch(() => ({}));
      const assignmentsData = await assignmentsRes.json().catch(() => ({}));
      const departmentsData = await departmentsRes.json().catch(() => ({}));

      if (!attendanceRes.ok) {
        throw new Error(attendanceData?.message || "Failed to load attendance");
      }

      if (!employeesRes.ok) {
        throw new Error(employeesData?.message || "Failed to load employees");
      }

      const uniqueEmployees = uniqueById(employeesData?.employees || []);
      const loadedRecords = attendanceData?.attendance || [];
      setRecords(loadedRecords);
      setEmployees(uniqueEmployees);

      const latestRecordDate = loadedRecords
        .map((record: AttendanceRecord) => record.date)
        .filter(Boolean)
        .sort((a: string, b: string) => b.localeCompare(a))[0];
      if (latestRecordDate && !anchorDateInitializedRef.current) {
        setRangeStartDate(latestRecordDate);
        setRangeEndDate(latestRecordDate);
        anchorDateInitializedRef.current = true;
      }

      const latestRecordProject = loadedRecords
        .slice()
        .sort((a: AttendanceRecord, b: AttendanceRecord) => String(b.date || "").localeCompare(String(a.date || "")))[0]?.projectSite
        ?.trim();

      const dbProjects = Array.isArray(projectsData?.projects)
        ? projectsData.projects.map((project: { name: string }) => String(project.name).trim()).filter(Boolean)
        : [];
      const dbDepartments = Array.isArray(departmentsData?.departments)
        ? departmentsData.departments.map((department: { name: string }) => String(department.name).trim()).filter(Boolean)
        : [];
      const mergedProjects = Array.from(new Set([...defaultProjects, ...dbProjects]));
      setProjects(mergedProjects);
      const mergedDepartments = Array.from(new Set([...defaultDepartments, ...dbDepartments]));
      setDepartments(mergedDepartments);
      setSelectedDepartment((current) => {
        const currentMatch = mergedDepartments.find((department) => department.toLowerCase() === String(current || "").toLowerCase());
        return currentMatch || mergedDepartments[0] || "";
      });
      setSelectedProject((current) => {
        const currentMatch = mergedProjects.find((project) => project.toLowerCase() === String(current || "").toLowerCase());
        const latestMatch = latestRecordProject
          ? mergedProjects.find((project) => project.toLowerCase() === latestRecordProject.toLowerCase())
          : undefined;
        return currentMatch || latestMatch || mergedProjects[0] || "";
      });

      const dbAssignments = assignmentsData?.assignments && typeof assignmentsData.assignments === "object"
        ? (assignmentsData.assignments as ProjectAssignmentMap)
        : {};
      const normalizedAssignments = uniqueEmployees.reduce<ProjectAssignmentMap>((accumulator, employee) => {
        const department = String(employee.department || "").toLowerCase();
        const savedProject = dbAssignments[employee.id];
        if (department === "construction") {
          accumulator[employee.id] = savedProject || mergedProjects[0] || "";
        } else {
          accumulator[employee.id] = "Main Office";
        }
        return accumulator;
      }, {});
      setAssignments(normalizedAssignments);

      const normalizationUpdates = uniqueEmployees
        .filter((employee) => {
          const department = String(employee.department || "").toLowerCase();
          const desiredProject = department === "construction" ? (dbAssignments[employee.id] || mergedProjects[0] || "") : "Main Office";
          return desiredProject && dbAssignments[employee.id] !== desiredProject;
        })
        .map((employee) => ({
          employeeId: employee.id,
          projectName: String(employee.department || "").toLowerCase() === "construction" ? (dbAssignments[employee.id] || mergedProjects[0] || "") : "Main Office",
        }));

      if (normalizationUpdates.length > 0) {
        void Promise.all(
          normalizationUpdates.map((update) =>
            fetch("/api/attendance/assignments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(update),
            }),
          ),
        ).then(() => {
          triggerAppDataRefresh(["employees", "attendance_records", "employee_project_deployments"]);
          setSyncStatus(`Department assignments synchronized (${normalizationUpdates.length})`);
        });
      } else {
        setSyncStatus("Department assignments synchronized");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    { table: "attendance_records" },
    { table: "employees" },
    { table: "employee_project_deployments" },
  ], () => {
    void loadData();
  });

  const periodDates = useMemo(() => getPeriodDates(rangeStartDate, rangeEndDate), [rangeStartDate, rangeEndDate]);

  const assignedEmployees = useMemo(() => {
    return employees
      .filter((employee) => {
        const matchesProject = !selectedProject || assignments[employee.id] === selectedProject;
        const matchesDepartment = !selectedDepartment || String(employee.department || "").toLowerCase() === selectedDepartment.toLowerCase();
        return matchesProject && matchesDepartment;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [assignments, employees, selectedDepartment, selectedProject]);

  const latestRecords = useMemo(() => {
    const selectedDateSet = new Set(periodDates);
    const query = searchQuery.trim().toLowerCase();

    const filtered = records
      .filter((record) => {
        const matchesAssignedEmployee = assignedEmployees.some((employee) => {
          if (record.employeeId) return record.employeeId === employee.id;
          return employee.fullName === record.employeeName;
        });
        if (!matchesAssignedEmployee) return false;
        if (!selectedDateSet.has(record.date)) return false;

        if (!query) return true;
        return [
          record.employeeName,
          record.status,
          record.checkIn,
          record.checkOut,
          record.notes,
          record.projectSite,
          record.date,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });

    const getEmployeeName = (record: AttendanceRecord) => record.employeeName.toLowerCase();

    return filtered.sort((a, b) => {
      switch (sortMode) {
        case "name-asc":
          return getEmployeeName(a).localeCompare(getEmployeeName(b)) || a.date.localeCompare(b.date);
        case "name-desc":
          return getEmployeeName(b).localeCompare(getEmployeeName(a)) || b.date.localeCompare(a.date);
        case "date-asc":
          return a.date.localeCompare(b.date) || getEmployeeName(a).localeCompare(getEmployeeName(b));
        case "status":
          return a.status.localeCompare(b.status) || a.date.localeCompare(b.date);
        case "date-desc":
        default:
          return b.date.localeCompare(a.date) || getEmployeeName(a).localeCompare(getEmployeeName(b));
      }
    }).slice(0, 20);
  }, [assignedEmployees, records, periodDates, searchQuery, sortMode]);

  const exportVisibleAttendance = useCallback(() => {
    if (latestRecords.length === 0) {
      notify("No attendance records to export");
      return;
    }

    const rows = latestRecords.map((record) => ({
      Worker: record.employeeName,
      Position: assignedEmployees.find((employee) => employee.id === record.employeeId)?.position || "Worker",
      Date: formatDateFull(record.date),
      Status: record.status,
      "Check In": record.checkIn || "",
      "Check Out": record.checkOut || "",
      "Project Site": record.projectSite || selectedProject,
      Notes: record.notes || "",
      "Worked Hours": typeof record.workedHours === "number" ? record.workedHours : "",
      "Overtime Hours": typeof record.overtimeHours === "number" ? record.overtimeHours : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const fileName = `attendance-${selectedProject}-${rangeStartDate}-${rangeEndDate}.xlsx`.replace(/\s+/g, "-").toLowerCase();
    XLSX.writeFile(workbook, fileName);
    notify("Attendance exported to Excel");
  }, [assignedEmployees, latestRecords, notify, rangeEndDate, rangeStartDate, selectedProject]);

  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Leave: 0, Remote: 0 };
    const selectedDateSet = new Set(periodDates);

    records.forEach((record) => {
      if (!selectedDateSet.has(record.date)) return;
      const matchesAssignedEmployee = assignedEmployees.some((employee) => {
        if (record.employeeId) return record.employeeId === employee.id;
        return employee.fullName === record.employeeName;
      });
      if (!matchesAssignedEmployee) return;
      const status = record.status as keyof typeof counts;
      if (status in counts) counts[status] += 1;
    });

    return counts;
  }, [periodDates, records, assignedEmployees]);

  const departmentCounts = useMemo(() => {
    return departments.map((department) => ({
      department,
      count: employees.filter((employee) => String(employee.department || "").toLowerCase() === department.toLowerCase()).length,
    }));
  }, [departments, employees]);

  const filteredAssignmentCount = useMemo(() => {
    return assignedEmployees.length;
  }, [assignedEmployees.length]);

  const groupedEmployees = useMemo(() => {
    const groups = new Map<string, Employee[]>();
    employees.forEach((employee) => {
      const matchesProject = !selectedProject || assignments[employee.id] === selectedProject;
      const matchesDepartment = !selectedDepartment || String(employee.department || "").toLowerCase() === selectedDepartment.toLowerCase();
      if (!matchesProject || !matchesDepartment) return;
      const key = employee.department || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(employee);
    });

    return Array.from(groups.entries()).map(([department, workers]) => ({
      department,
      workers: workers.sort((a, b) => a.fullName.localeCompare(b.fullName)),
    }));
  }, [assignments, employees, selectedDepartment, selectedProject]);

  const getFirstDepartmentProject = useCallback((departmentName: string) => {
    const normalizedDepartment = departmentName.toLowerCase();
    const departmentWorkers = employees.filter((employee) => String(employee.department || "").toLowerCase() === normalizedDepartment);

    for (const project of projects) {
      if (departmentWorkers.some((employee) => assignments[employee.id] === project)) {
        return project;
      }
    }

    return projects[0] || defaultProjects[0] || "";
  }, [assignments, employees, projects]);

  const isConstructionDepartment = selectedDepartment.toLowerCase() === "construction";
  const effectiveProject = isConstructionDepartment ? selectedProject : "Main Office";

  useEffect(() => {
    if (activeCell) {
      setActiveAttendanceDate(activeCell.date);
    } else {
      setActiveAttendanceDate("");
    }
  }, [activeCell]);

  const activeEmployee = activeCell
    ? assignedEmployees.find((employee) => employee.id === activeCell.employeeId) || employees.find((employee) => employee.id === activeCell.employeeId)
    : null;
  const activeDraft = activeCell ? ensureDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date) : null;

  function getSavedRecord(employeeId: string, date: string) {
    const employee = employees.find((item) => item.id === employeeId);
    return records.find((record) => {
      const matchesId = record.employeeId ? record.employeeId === employeeId : false;
      const matchesName = employee?.fullName ? record.employeeName === employee.fullName : false;
      return (matchesId || matchesName) && record.date === date;
    });
  }

  function ensureDraft(employeeId: string, date: string) {
    const key = getDraftKey(employeeId, date);
    const existingRecord = getSavedRecord(employeeId, date);
    const savedOvertime = extractSavedOvertime(existingRecord?.notes, existingRecord);

    return (
      drafts[key] || {
        status: (existingRecord?.status as AttendanceStatus) || "Present",
        checkIn: existingRecord?.checkIn || defaultDraftEntry.checkIn,
        checkOut: existingRecord?.checkOut || defaultDraftEntry.checkOut,
        notes: savedOvertime.notes,
        overtimeHours:
          existingRecord?.overtimeHours !== undefined && existingRecord?.overtimeHours !== null
            ? String(existingRecord.overtimeHours)
            : savedOvertime.overtimeMode === "manual"
              ? savedOvertime.overtimeHours
              : String(computeAutoOvertime(existingRecord?.checkIn || defaultDraftEntry.checkIn, existingRecord?.checkOut || defaultDraftEntry.checkOut)),
        overtimeMode: existingRecord?.overtimeHours !== undefined && existingRecord?.overtimeHours !== null ? "manual" : "auto",
      }
    );
  }

  function updateDraft(employeeId: string, date: string, patch: Partial<DraftEntry>) {
    const key = getDraftKey(employeeId, date);
    const current = ensureDraft(employeeId, date);
    const next = { ...current, ...patch };

    if (patch.overtimeHours !== undefined) {
      next.overtimeMode = "manual";
    }

    if (patch.status === "Absent" || patch.status === "Leave") {
      next.checkIn = "";
      next.checkOut = "";
      next.overtimeHours = "0";
    }

    if (patch.status === "Halfday") {
      next.checkIn = next.checkIn || "07:00";
      next.checkOut = next.checkOut || "11:00";
    }

    if (patch.status === "Present" && !next.checkIn && !next.checkOut) {
      next.checkIn = defaultDraftEntry.checkIn;
      next.checkOut = defaultDraftEntry.checkOut;
    }

    setDrafts((prev) => ({ ...prev, [key]: next }));
  }

  async function addProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    if (projects.some((project) => project.toLowerCase() === trimmed.toLowerCase())) {
      setError("Project already exists");
      return;
    }

    try {
      const res = await fetch("/api/attendance/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save project site");
      }

      const nextProjects = [...projects, trimmed];
      setProjects(nextProjects);
      setSelectedProject(trimmed);
      setNewProjectName("");
      setError(null);
      triggerAppDataRefresh(["attendance_records", "employee_project_deployments"]);
      notify("Project site added");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignEmployee(employeeId: string, project: string) {
    const employee = employees.find((item) => item.id === employeeId);
    const forcedProject = employee && String(employee.department || "").toLowerCase() !== "construction" ? "Main Office" : project;
    const previous = assignments[employeeId] || selectedProject || "";
    setAssignments((current) => ({ ...current, [employeeId]: forcedProject }));
    setAssignmentSavingId(employeeId);
    setError(null);

    try {
      const res = await fetch("/api/attendance/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, projectName: forcedProject }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save worker assignment");
      }
      notify("Worker project assignment updated");
    } catch (err) {
      setAssignments((current) => ({ ...current, [employeeId]: previous }));
      setError((err as Error).message);
    } finally {
      setAssignmentSavingId(null);
    }
  }

  async function saveAttendance() {
    setSaving(true);
    setError(null);

    try {
      const payloads = assignedEmployees.flatMap((employee) =>
        periodDates
          .filter((date) => new Date(date).getDay() !== 0)
          .map((date) => {
          const draft = ensureDraft(employee.id, date);
          const workedHours = draft.status === "Absent" || draft.status === "Leave"
            ? 0
            : draft.status === "Halfday"
              ? 4
              : computeWorkedHours(draft.checkIn, draft.checkOut);
          const overtimeHours = Number(draft.overtimeHours || 0);
          return {
            employeeId: employee.id,
            employeeName: employee.fullName,
            date,
            status: draft.status,
            checkIn: draft.status === "Absent" || draft.status === "Leave" ? "" : draft.checkIn,
            checkOut: draft.status === "Absent" || draft.status === "Leave" ? "" : draft.checkOut,
            notes: draft.notes.trim(),
            projectSite: selectedProject,
            periodMode,
            workedHours,
            overtimeHours,
            overtimeMode: draft.overtimeMode,
          };
        }),
      );

      const token = localStorage.getItem('hr_token');
      const promises = payloads.map((payload) =>
        fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return new Error(data?.message || `Failed to save attendance for ${payload.employeeName}`);
            return null;
          })
          .catch((err) => err as Error)
      );

      const results = await Promise.all(promises);
      const firstError = results.find((r) => r instanceof Error);
      if (firstError) throw firstError;

      const refreshed = await fetch("/api/attendance", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { projectSite: selectedProject } }));
      notify("Attendance period saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const saveCurrentAttendance = async () => {
    if (!activeCell) return;

    const employee = employees.find((item) => item.id === activeCell.employeeId);
    if (!employee) return;

    setSaving(true);
    setError(null);

    try {
      const targetDate = activeAttendanceDate || activeCell.date;
      const sourceDate = activeCell.date;
      const draft = ensureDraft(activeCell.employeeId, targetDate);
      const workedHours = draft.status === "Absent" || draft.status === "Leave"
        ? 0
        : draft.status === "Halfday"
          ? 4
          : computeWorkedHours(draft.checkIn, draft.checkOut);
      const overtimeHours = Number(draft.overtimeHours || 0);
      const payload = {
        employeeId: employee.id,
        employeeName: employee.fullName,
        date: targetDate,
        status: draft.status,
        checkIn: draft.status === "Absent" || draft.status === "Leave" ? "" : draft.checkIn,
        checkOut: draft.status === "Absent" || draft.status === "Leave" ? "" : draft.checkOut,
        notes: draft.notes.trim(),
        projectSite: selectedProject,
        periodMode,
        workedHours,
        overtimeHours,
        overtimeMode: draft.overtimeMode,
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Failed to save attendance for ${payload.employeeName}`);

      if (sourceDate !== targetDate) {
        await fetch("/api/attendance", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: employee.id, date: sourceDate }),
        });
      }

      const refreshed = await fetch("/api/attendance", {
        headers: { "Authorization": `Bearer ${localStorage.getItem('hr_token')}` },
      });
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { projectSite: selectedProject, date: targetDate } }));
      notify(sourceDate !== targetDate ? "Attendance date updated" : "Attendance saved");
      setActiveCell(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  async function deleteAttendance(employeeId: string, date: string) {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setDeleteTarget({ employeeId, date });
  }

  async function confirmDeleteAttendance() {
    if (!deleteTarget) return;

    const { employeeId, date } = deleteTarget;
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setDeleteTarget(null);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete attendance");
      }

      const key = getDraftKey(employeeId, date);
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });

      const refreshed = await fetch("/api/attendance", {
        headers: { "Authorization": `Bearer ${localStorage.getItem('hr_token')}` },
      });
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { projectSite: selectedProject, date } }));

      if (activeCell?.employeeId === employeeId && activeCell.date === date) {
        setActiveCell(null);
      }

      notify("Attendance deleted");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-sm font-bold uppercase tracking-wider text-blue-600">Attendance Hub</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Project Attendance & Deployment
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            Manage worker assignments, track daily attendance, and monitor project deployment across all sites.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-blue-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <span className="text-slate-600 font-medium">Loading attendance data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          {departmentCounts.map((item) => {
            const flexible = item.department.toLowerCase() === "construction";
            return (
              <button
                key={item.department}
                type="button"
                onClick={() => {
                  setSelectedDepartment(item.department);
                  setSelectedProject(getFirstDepartmentProject(item.department));
                }}
                className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  selectedDepartment === item.department
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="truncate text-sm font-bold text-slate-700">{item.department}</p>
                    </div>
                    <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{item.count}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Employees in department</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${flexible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {flexible ? "Flexible Projects" : "Main Office Only"}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 opacity-75 transition group-hover:opacity-100">Open</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Project Management Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <h3 className="text-lg font-black text-slate-900">Departments & Project Sites</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Active Department</span>
                  <select
                    value={selectedDepartment}
                    onChange={(event) => setSelectedDepartment(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments found</option>
                    ) : (
                      departments.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Active Project</span>
                  <select
                    value={effectiveProject}
                    onChange={(event) => {
                      if (isConstructionDepartment) {
                        setSelectedProject(event.target.value);
                      } else {
                        setSelectedProject("Main Office");
                      }
                    }}
                    disabled={!isConstructionDepartment}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {projects.map((project) => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2 mt-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">New Project Site</span>
                  <input
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    placeholder="e.g., Hermosa Site"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={addProject}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-95"
                >
                  Add Project Site
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <p className="mb-3 text-xs font-semibold text-purple-900">
                  Current selection: {selectedDepartment || "No department selected"} · {selectedProject || "No project selected"}
                </p>
                {syncStatus ? (
                  <p className="mb-3 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 shadow-sm">
                    {syncStatus}
                  </p>
                ) : null}
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-purple-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-xs font-medium text-purple-900">
                    Project assignments sync with the backend. Changes are saved automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Worker Roster Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <h3 className="text-lg font-black text-slate-900">Worker Assignments</h3>
                </div>
                <p className="text-xs font-semibold text-slate-500">Showing {employees.length} employees</p>
              </div>

              <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
                {employees.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p className="mt-3 text-sm font-semibold text-slate-600">No employees found</p>
                    <p className="mt-1 text-xs text-slate-500">Add employees to get started</p>
                  </div>
                ) : (
                groupedEmployees.map((group) => (
                  <div key={group.department} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{group.department}</p>
                        <p className="text-xs font-semibold text-slate-500">{group.workers.length} employees</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {group.workers.map((employee) => (
                        <div key={employee.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm">
                                {employee.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">{employee.fullName}</p>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                  {employee.position || "Employee"} · Department: {employee.department || "Unassigned"}
                                </p>
                              </div>
                            </div>
                            <select
                              value={String(employee.department || "").toLowerCase() === "construction" ? (assignments[employee.id] || "") : "Main Office"}
                              onChange={(event) => assignEmployee(employee.id, event.target.value)}
                              disabled={assignmentSavingId === employee.id || String(employee.department || "").toLowerCase() !== "construction"}
                              className={filterSelectCompactClassName}
                            >
                              {projects.map((project) => (
                                <option key={project} value={project}>{project}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="space-y-6">
            {/* Attendance Workspace Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="text-sm font-bold uppercase tracking-wider text-blue-600">Attendance Workspace</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">
                    {selectedDepartment ? `${selectedDepartment} · ` : ""}{selectedProject || "Unassigned"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{describePeriod(periodDates, periodMode)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceOpen(true)}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                      </svg>
                      Open Table
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={saveAttendance}
                    disabled={saving || loading}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save All"}
                  </button>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Date Range</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">Start Date</span>
                      <input
                        type="date"
                        value={rangeStartDate}
                        onChange={(event) => setRangeStartDate(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">End Date</span>
                      <input
                        type="date"
                        value={rangeEndDate}
                        onChange={(event) => setRangeEndDate(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-bold text-slate-700">Period Type</span>
                    <select
                      value={periodMode}
                      onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="semi-monthly">Semi-monthly</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={saveAttendance}
                      disabled={saving || loading}
                      className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Range"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition-all hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900">{summary.Present}</p>
                    <p className="text-sm font-bold text-slate-600">Present</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm transition-all hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900">{summary.Remote}</p>
                    <p className="text-sm font-bold text-slate-600">Remote</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm transition-all hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900">{summary.Leave}</p>
                    <p className="text-sm font-bold text-slate-600">Leave</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition-all hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-900">{summary.Absent}</p>
                    <p className="text-sm font-bold text-slate-600">Absent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <p className="text-sm font-bold text-slate-600">Current Project</p>
                </div>
                <p className="text-xl font-black text-slate-900">{selectedProject}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <p className="text-sm font-bold text-slate-600">Assigned Workers</p>
                </div>
                <p className="text-xl font-black text-slate-900">{assignedEmployees.length}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <p className="text-sm font-bold text-slate-600">Day Columns</p>
                </div>
                <p className="text-xl font-black text-slate-900">{periodDates.length}</p>
              </div>
            </div>

            {/* Recent Records */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-black text-slate-900">Recent Attendance Records</h3>
              </div>

              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search attendance..."
                searchLabel="Search records"
                onClearFilters={() => {
                  setSearchQuery("");
                  setSortMode("date-desc");
                }}
                summary={
                  <p className="text-sm font-semibold text-slate-600">
                    Showing <span className="text-slate-900">{latestRecords.length}</span> record{latestRecords.length !== 1 ? "s" : ""}
                  </p>
                }
              >
                <div>
                  <label htmlFor="attendance-sort" className="text-sm font-semibold text-slate-700">
                    Sort by
                  </label>
                  <select
                    id="attendance-sort"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                    className={filterInputClassName}
                  >
                    <option value="date-desc">Date newest</option>
                    <option value="date-asc">Date oldest</option>
                    <option value="name-asc">Name A → Z</option>
                    <option value="name-desc">Name Z → A</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </FilterBar>

              {loading ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600"></div>
                  <p className="mt-4 text-sm font-medium text-slate-600">Loading attendance records...</p>
                </div>
              ) : latestRecords.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  <p className="mt-4 text-sm font-semibold text-slate-600">No attendance records yet</p>
                  <p className="mt-1 text-xs text-slate-500">Start by opening the attendance table and adding entries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {latestRecords.map((record) => (
                    <div key={record.id} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold text-slate-900">{record.employeeName}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass[record.status] || "bg-slate-100 text-slate-700"}`}>
                              {record.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{formatDateFull(record.date)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="text-xs font-bold text-slate-500">Check-in</p>
                          <p className="mt-1 text-sm font-black text-slate-900">{record.checkIn || "—"}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="text-xs font-bold text-slate-500">Check-out</p>
                          <p className="mt-1 text-sm font-black text-slate-900">{record.checkOut || "—"}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="text-xs font-bold text-slate-500">Project</p>
                          <p className="mt-1 text-sm font-black text-slate-900">{record.projectSite || selectedProject}</p>
                        </div>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                          <p className="text-xs font-bold text-slate-500">Overtime</p>
                          <p className="mt-1 text-sm font-black text-emerald-700">
                            {record.overtimeHours !== undefined && record.overtimeHours !== null ? `${record.overtimeHours}h` : "0h"}
                          </p>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
                          <p className="text-xs font-bold text-slate-500">Notes</p>
                          <p className="mt-1 text-sm text-slate-700">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table Modal */}
      {isWorkspaceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-2 backdrop-blur-sm">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/80 px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance workspace</p>
                  <h3 className="break-words pr-2 text-base font-black text-slate-950">
                    {selectedDepartment ? `${selectedDepartment} · ` : ""}{selectedProject || "Unassigned"} daily time and overtime table
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {filteredAssignmentCount} assigned workers · {periodDates.length} day columns · Sunday is rest day
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={exportVisibleAttendance} disabled={latestRecords.length === 0} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                    Export Excel
                  </button>
                  <button type="button" onClick={saveAttendance} disabled={saving || loading} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? "Saving..." : "Save attendance"}
                  </button>
                  <button type="button" onClick={() => setIsWorkspaceOpen(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance range</p>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold text-slate-600">Start date</span>
                    <input
                      type="date"
                      value={rangeStartDate}
                      onChange={(event) => setRangeStartDate(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold text-slate-600">End date</span>
                    <input
                      type="date"
                      value={rangeEndDate}
                      onChange={(event) => setRangeEndDate(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRangeStartDate(periodStartDate(rangeStartDate, "weekly"));
                        setRangeEndDate(isoDate(addDays(parseIsoDate(periodStartDate(rangeStartDate, "weekly")), 6)));
                      }}
                      className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700 transition hover:bg-blue-50"
                    >
                      This week
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const start = periodStartDate(rangeStartDate, "semi-monthly");
                        const startDate = parseIsoDate(start);
                        const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() === 1 ? 15 : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate());
                        setRangeStartDate(start);
                        setRangeEndDate(isoDate(endDate));
                      }}
                      className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700 transition hover:bg-blue-50"
                    >
                      First half / Second half
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Select a custom range, or use the quick buttons to snap to a week or half-month.</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Range type</p>
                    <select
                      value={periodMode}
                      onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="weekly">Weekly range</option>
                      <option value="semi-monthly">Half-month range</option>
                    </select>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected range</p>
                    <p className="mt-2 text-sm font-bold text-slate-700">{describePeriod(periodDates, periodMode)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Project</p>
                  <select
                    value={selectedProject}
                    onChange={(event) => setSelectedProject(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700"
                  >
                    {projects.map((project) => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Workers</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{assignedEmployees.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Day columns</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{periodDates.length} (includes Sunday rest day)</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-white p-4">
              {error && <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

              <div className="space-y-4 xl:hidden">
                {loading ? (
                  <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center text-slate-500">Loading attendance workspace...</div>
                ) : assignedEmployees.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center text-slate-500">No workers are assigned to this project yet. Assign workers from Admin Access to start encoding attendance.</div>
                ) : (
                  assignedEmployees.map((employee) => (
                    <article key={employee.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-black text-slate-950">{employee.fullName}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{employee.position || "Employee"}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-400">Tap a day to edit</p>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {periodDates.map((date) => {
                          const isSunday = parseIsoDate(date).getDay() === 0;
                          const draft = ensureDraft(employee.id, date);
                          const savedRecord = getSavedRecord(employee.id, date);
                          const hasSavedRecord = Boolean(savedRecord);
                          const isPeriodRow = savedRecord?.periodMode === "payroll_period" || (!savedRecord?.checkIn && !savedRecord?.checkOut && Number(savedRecord?.workedHours || 0) > 0);
                          const periodWorkdays = periodDates.length || 1;
                          const totalWorkedHours = Number(savedRecord?.workedHours ?? 0);
                          const totalOvertimeHours = Number(savedRecord?.overtimeHours ?? 0);
                          const distributedWorkedHours = isPeriodRow && totalWorkedHours > 0 ? Math.min(8, Math.round((totalWorkedHours / periodWorkdays) * 100) / 100) : totalWorkedHours;
                          const distributedOvertimeHours = isPeriodRow && totalOvertimeHours > 0 ? Math.round((totalOvertimeHours / periodWorkdays) * 100) / 100 : totalOvertimeHours;
                          const displayStatus = savedRecord?.status || (isPeriodRow ? "Present" : "No record");
                          const displayCheckIn = savedRecord?.checkIn || (isPeriodRow ? "07:00" : "—");
                          const displayCheckOut = savedRecord?.checkOut || (isPeriodRow ? "16:00" : "—");
                          const displayWorkedHours = savedRecord?.workedHours !== undefined && savedRecord?.workedHours !== null
                            ? `${distributedWorkedHours.toFixed(2)}`
                            : hasSavedRecord
                              ? computeWorkedHours(draft.checkIn, draft.checkOut).toFixed(2)
                              : "0.00";
                          const displayOvertime = savedRecord?.overtimeHours !== undefined && savedRecord?.overtimeHours !== null
                            ? `${distributedOvertimeHours.toFixed(2)}h`
                            : hasSavedRecord
                              ? `${draft.overtimeHours}h`
                              : "0h";
                          return (
                            <button
                              key={date}
                              type="button"
                              onClick={() => setActiveCell({ employeeId: employee.id, date })}
                              className="rounded-[1.25rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClass[displayStatus] || "bg-slate-100 text-slate-700"}`}>
                                    {displayStatus}
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-slate-950">{formatDateLabel(date)}</p>
                                  <p className="mt-1 text-xs text-slate-500">Attendance date</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">{displayCheckIn} - {displayCheckOut}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Edit</span>
                                  {savedRecord?.projectSite ? <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">{savedRecord.projectSite}</span> : null}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                                <div className="rounded-xl bg-white/80 px-3 py-2">
                                  <p className="font-bold text-slate-500">Worked</p>
                                  <p className="mt-1 font-black text-slate-950">{displayWorkedHours}h</p>
                                </div>
                                <div className="rounded-xl bg-white/80 px-3 py-2">
                                  <p className="font-bold text-slate-500">OT</p>
                                  <p className="mt-1 font-black text-emerald-700">{displayOvertime}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="hidden overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm xl:block">
                <table className="min-w-[1400px] border-collapse text-left text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[260px] bg-slate-950 px-4 py-3 text-xs font-black">Worker</th>
                    <th className="sticky left-[260px] z-20 min-w-[180px] bg-slate-950 px-4 py-3 text-xs font-black">Department</th>
                    <th className="sticky left-[440px] z-20 min-w-[180px] bg-slate-950 px-4 py-3 text-xs font-black">Position</th>
                    {periodDates.map((date) => (
                      <th key={date} className="min-w-[180px] px-4 py-3 text-xs font-black">
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-white/60">{formatWeekdayLabel(date)}</span>
                        <span className="block mt-1">{formatDateLabel(date)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white align-top">
                  {loading ? (
                    <tr><td colSpan={periodDates.length + 3} className="px-4 py-8 text-center text-slate-500">Loading attendance workspace...</td></tr>
                  ) : assignedEmployees.length === 0 ? (
                    <tr><td colSpan={periodDates.length + 3} className="px-4 py-8 text-center text-slate-500">No workers are assigned to this department/project yet. Assign workers from Admin Access to start encoding attendance.</td></tr>
                  ) : (
                    assignedEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <td className="sticky left-0 z-10 min-w-[260px] bg-white px-4 py-4 font-black text-slate-950">{employee.fullName}</td>
                        <td className="sticky left-[260px] z-10 min-w-[180px] bg-white px-4 py-4 text-slate-600">{employee.department || "Unassigned"}</td>
                        <td className="sticky left-[440px] z-10 min-w-[180px] bg-white px-4 py-4 text-slate-600">{employee.position || "Employee"}</td>
                        {periodDates.map((date) => {
                          const isSunday = parseIsoDate(date).getDay() === 0;
                          const draft = ensureDraft(employee.id, date);
                          const savedRecord = getSavedRecord(employee.id, date);
                          const hasSavedRecord = Boolean(savedRecord);
                          const isPeriodRow = savedRecord?.periodMode === "payroll_period" || (!savedRecord?.checkIn && !savedRecord?.checkOut && Number(savedRecord?.workedHours || 0) > 0);
                          const periodWorkdays = periodDates.length || 1;
                          const totalWorkedHours = Number(savedRecord?.workedHours ?? 0);
                          const totalOvertimeHours = Number(savedRecord?.overtimeHours ?? 0);
                          const distributedWorkedHours = isPeriodRow && totalWorkedHours > 0 ? Math.min(8, Math.round((totalWorkedHours / periodWorkdays) * 100) / 100) : totalWorkedHours;
                          const distributedOvertimeHours = isPeriodRow && totalOvertimeHours > 0 ? Math.round((totalOvertimeHours / periodWorkdays) * 100) / 100 : totalOvertimeHours;
                          const displayStatus = savedRecord?.status || (isPeriodRow ? "Present" : "No record");
                          const displayCheckIn = savedRecord?.checkIn || (isPeriodRow ? "07:00" : "—");
                          const displayCheckOut = savedRecord?.checkOut || (isPeriodRow ? "16:00" : "—");
                          const displayWorkedHours = savedRecord?.workedHours !== undefined && savedRecord?.workedHours !== null
                            ? `${distributedWorkedHours.toFixed(2)}`
                            : hasSavedRecord
                              ? computeWorkedHours(draft.checkIn, draft.checkOut).toFixed(2)
                              : "0.00";
                          const displayOvertime = savedRecord?.overtimeHours !== undefined && savedRecord?.overtimeHours !== null
                            ? `${distributedOvertimeHours.toFixed(2)}h`
                            : hasSavedRecord
                              ? `${draft.overtimeHours}h`
                              : "0h";
                          return (
                            <td key={date} className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSunday) return;
                                  setActiveCell({ employeeId: employee.id, date });
                                }}
                                disabled={isSunday}
                                className={`rounded-[1.25rem] border bg-gradient-to-br p-4 text-left shadow-sm transition ${
                                  isSunday
                                    ? "cursor-not-allowed border-amber-200 from-amber-50 to-white opacity-80"
                                    : "border-slate-200 from-slate-50 to-white hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${isSunday ? "bg-amber-100 text-amber-800" : statusClass[displayStatus] || "bg-slate-100 text-slate-700"}`}>
                                      {isSunday ? "Rest day" : displayStatus}
                                    </p>
                                    <p className="mt-3 text-xs font-semibold text-slate-500">{formatDateLabel(date)}</p>
                                    {savedRecord?.projectSite ? <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">{savedRecord.projectSite}</p> : null}
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    {isSunday ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Rest day</span> : <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Edit</span>}
                                    {!isSunday ? <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void deleteAttendance(employee.id, date);
                                      }}
                                      className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700 transition hover:bg-rose-100"
                                    >
                                      Delete
                                    </button> : null}
                                  </div>
                                </div>
                                <div className="mt-3 space-y-1 text-xs text-slate-600">
                                  <p>Time: <span className="font-bold text-slate-950">{displayCheckIn} - {displayCheckOut}</span></p>
                                  <p>Worked: <span className="font-bold text-slate-950">{displayWorkedHours}h</span></p>
                                  <p>OT: <span className="font-bold text-emerald-700">{displayOvertime}</span></p>
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (() => {
        const employee = employees.find((item) => item.id === deleteTarget.employeeId);
        return employee ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-rose-50/70 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Confirm Deletion</span>
                </div>
                <h3 className="text-xl font-black text-slate-950">Delete Attendance Record?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {employee.fullName} · {formatDateFull(deleteTarget.date)}
                </p>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm text-slate-600">
                  This will permanently remove the saved attendance entry for this worker and date. This action cannot be undone.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDeleteAttendance()}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-rose-700 active:scale-95"
                  >
                    Delete Attendance
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Edit Attendance Modal */}
      {activeCell && activeEmployee && activeDraft && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Edit Attendance</span>
                </div>
                <h3 className="text-xl font-black text-slate-950">{activeEmployee.fullName}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{activeEmployee.position || "Employee"} · {selectedProject}</p>
                <p className="mt-1 text-sm text-slate-600">Source date: {formatDateFull(activeCell.date)}</p>
                <p className="mt-1 text-sm font-semibold text-blue-600">Editing: {activeAttendanceDate ? formatDateFull(activeAttendanceDate) : formatDateFull(activeCell.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => deleteAttendance(activeCell.employeeId, activeCell.date)}
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setActiveCell(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Attendance Date</span>
                  <input
                    type="date"
                    value={activeAttendanceDate}
                    onChange={(event) => setActiveAttendanceDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500">Choose the exact date for this attendance entry before saving.</p>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Status</span>
                  <select
                    value={activeDraft.status}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { status: event.target.value as AttendanceStatus })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                  <p className="text-sm font-bold text-slate-600">Project Site</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{selectedProject}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">Worker assigned to this project</p>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Time In</span>
                  <input
                    type="time"
                    value={activeDraft.checkIn}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { checkIn: event.target.value })}
                    disabled={activeDraft.status === "Absent" || activeDraft.status === "Leave"}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Time Out</span>
                  <input
                    type="time"
                    value={activeDraft.checkOut}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { checkOut: event.target.value })}
                    disabled={activeDraft.status === "Absent" || activeDraft.status === "Leave"}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4 md:col-span-2">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-bold text-slate-600">Worked Hours</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{computeWorkedHours(activeDraft.checkIn, activeDraft.checkOut).toFixed(2)}h</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">Overtime</p>
                      <p className="mt-2 text-2xl font-black text-emerald-700">{activeDraft.overtimeHours}h</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">Shift</p>
                      <p className="mt-2 text-lg font-black text-slate-900">7:00 AM - 4:00 PM</p>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Overtime Mode</span>
                  <select
                    value={activeDraft.overtimeMode}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { overtimeMode: event.target.value as OvertimeMode })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="manual">Manual OT</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Overtime Hours</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={activeDraft.overtimeHours}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { overtimeHours: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-slate-700">Notes</span>
                  <textarea
                    value={activeDraft.notes}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { notes: event.target.value })}
                    rows={5}
                    placeholder="Add attendance notes, deployment notes, approved undertime, approved overtime, etc."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => void saveCurrentAttendance()}
                  disabled={saving || loading}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
