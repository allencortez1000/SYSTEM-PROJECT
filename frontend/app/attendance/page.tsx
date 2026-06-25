"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotification } from "../components/notification";
import { useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

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

const PROJECTS_STORAGE_KEY = "attendance_project_sites_v1";
const ASSIGNMENTS_STORAGE_KEY = "attendance_project_assignments_v1";

const defaultProjects: string[] = [];
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

function uniqueByName(employees: Employee[]) {
  const seen = new Set<string>();
  return employees.filter((employee) => {
    const key = employee.fullName.trim().toLowerCase();
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
  const [projects, setProjects] = useState<string[]>(defaultProjects);
  const [assignments, setAssignments] = useState<ProjectAssignmentMap>({});
  const [drafts, setDrafts] = useState<DraftMap>({});
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
  const anchorDateInitializedRef = useRef(false);

  useEffect(() => {
    try {
      const storedProjects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "null");
      if (Array.isArray(storedProjects) && storedProjects.length > 0) {
        const cleaned = storedProjects.map((value) => String(value).trim()).filter(Boolean);
        if (cleaned.length > 0) {
          setProjects(cleaned);
          setSelectedProject(cleaned[0]);
        }
      }

      const storedAssignments = JSON.parse(localStorage.getItem(ASSIGNMENTS_STORAGE_KEY) || "null");
      if (storedAssignments && typeof storedAssignments === "object") {
        setAssignments(storedAssignments);
      }
    } catch {
      // ignore invalid browser cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    if (!projects.includes(selectedProject)) {
      setSelectedProject(projects[0] || defaultProjects[0]);
    }
  }, [projects, selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [attendanceRes, employeesRes, projectsRes, assignmentsRes] = await Promise.all([
        fetch("/api/attendance", { headers }),
        fetch("/api/employees", { headers }),
        fetch("/api/attendance/projects", { headers }),
        fetch("/api/attendance/assignments", { headers }),
      ]);

      const attendanceData = await attendanceRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));
      const projectsData = await projectsRes.json().catch(() => ({}));
      const assignmentsData = await assignmentsRes.json().catch(() => ({}));

      if (!attendanceRes.ok) {
        throw new Error(attendanceData?.message || "Failed to load attendance");
      }

      if (!employeesRes.ok) {
        throw new Error(employeesData?.message || "Failed to load employees");
      }

      const uniqueEmployees = uniqueByName(employeesData?.employees || []);
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
      const mergedProjects = Array.from(new Set([...defaultProjects, ...dbProjects]));
      setProjects(mergedProjects);
      setSelectedProject((current) => {
        const currentMatch = mergedProjects.find((project) => project.toLowerCase() === String(current || "").toLowerCase());
        const latestMatch = latestRecordProject
          ? mergedProjects.find((project) => project.toLowerCase() === latestRecordProject.toLowerCase())
          : undefined;
        return currentMatch || latestMatch || mergedProjects[0] || "";
      });

      setAssignments((current) => {
        const dbAssignments = assignmentsData?.assignments && typeof assignmentsData.assignments === "object"
          ? (assignmentsData.assignments as ProjectAssignmentMap)
          : {};
        const next = { ...current, ...dbAssignments };
        const fallbackProject = mergedProjects[0] || defaultProjects[0];
        uniqueEmployees.forEach((employee: Employee) => {
          if (!next[employee.id] || !mergedProjects.includes(next[employee.id])) {
            next[employee.id] = fallbackProject;
          }
        });
        return next;
      });
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
    if (!selectedProject) return [];
    return employees
      .filter((employee) => assignments[employee.id] === selectedProject)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [assignments, employees, selectedProject]);

  const latestRecords = useMemo(() => {
    const selectedDateSet = new Set(periodDates);
    return records
      .filter((record) => {
        const matchesAssignedEmployee = assignedEmployees.some((employee) => {
          if (record.employeeId) return record.employeeId === employee.id;
          return employee.fullName === record.employeeName;
        });
        return matchesAssignedEmployee;
      })
      .filter((record) => selectedDateSet.has(record.date))
      .slice(0, 20);
  }, [assignedEmployees, records, periodDates]);

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

  const projectCounts = useMemo(() => {
    return projects.map((project) => ({
      project,
      count: employees.filter((employee) => assignments[employee.id] === project).length,
    }));
  }, [assignments, employees, projects]);

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
        overtimeMode: existingRecord?.overtimeHours !== undefined && existingRecord?.overtimeHours !== null ? "manual" : "manual",
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
      notify("Project site added");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assignEmployee(employeeId: string, project: string) {
    const previous = assignments[employeeId] || selectedProject || "";
    setAssignments((current) => ({ ...current, [employeeId]: project }));
    setAssignmentSavingId(employeeId);
    setError(null);

    try {
      const res = await fetch("/api/attendance/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, projectName: project }),
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
        periodDates.map((date) => {
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

      for (const payload of payloads) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || `Failed to save attendance for ${payload.employeeName}`);
      }

      const refreshed = await fetch("/api/attendance");
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

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

      const refreshed = await fetch("/api/attendance");
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

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

      const refreshed = await fetch("/api/attendance");
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setRecords(refreshedData?.attendance || []);
      }

      if (activeCell?.employeeId === employeeId && activeCell.date === date) {
        setActiveCell(null);
      }

      notify("Attendance deleted");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Attendance hub</p>
        <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Project attendance and worker deployment</h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          Choose a project site, load its worker roster without duplicate names, encode weekly or semi-monthly attendance,
          edit daily time in and time out, and rotate workers across active company projects.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projectCounts.map((item) => (
          <article key={item.project} className={`metric-card ${selectedProject === item.project ? "ring-2 ring-blue-200" : ""}`}>
            <p className="text-sm font-bold text-slate-500">{item.project}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.count}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Assigned workers</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="section-card space-y-4">
            <div>
              <p className="eyebrow">Projects</p>
              <h3 className="mt-2 break-words text-2xl font-black text-slate-950">Worker deployment control</h3>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-600">Selected project site</span>
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                {projects.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block min-w-0">
                <span className="text-sm font-bold text-slate-600">Add project site</span>
                <input
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="Example: Hermosa"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
              <button type="button" onClick={addProject} className="primary-button mt-0 sm:mt-7 sm:w-auto w-full">Add site</button>
            </div>

            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">Rotate workers between project sites</p>
              <p className="mt-2 text-sm text-slate-600">Assignments are now connected to the backend attendance project deployment records so the selected project site is saved, not just kept in the browser.</p>
            </div>
          </section>

          <section className="section-card">
            <div>
              <p className="eyebrow">Roster</p>
              <h3 className="mt-2 break-words text-2xl font-black text-slate-950">Assign workers to projects</h3>
            </div>

            <div className="mt-5 max-h-[540px] space-y-3 overflow-auto pr-1">
              {employees.map((employee) => (
                <div key={employee.id} className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{employee.fullName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {employee.position || "Employee"} · {employee.department || "Unassigned"}
                      </p>
                    </div>
                    <select
                      value={assignments[employee.id] || ""}
                      onChange={(event) => assignEmployee(employee.id, event.target.value)}
                      disabled={assignmentSavingId === employee.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {projects.map((project) => (
                        <option key={project} value={project}>{project}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="section-card space-y-4">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="eyebrow">Attendance workspace</p>
                <h3 className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">{selectedProject} attendance planner</h3>
                <p className="mt-2 text-sm text-slate-500">{describePeriod(periodDates, periodMode)} · Sunday is always rest day</p>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:max-w-5xl">
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance date</p>
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
                  <p className="mt-2 text-xs font-semibold text-slate-500">Pick the exact range you want, like June 18 to June 24, and the table below will follow it.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  <label className="block rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <span className="text-sm font-bold text-slate-600">Period type</span>
                    <select
                      value={periodMode}
                      onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="semi-monthly">Semi-monthly</option>
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button type="button" onClick={saveAttendance} disabled={saving || loading} className="primary-button w-full">
                      {saving ? "Saving..." : "Save attendance range"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {Object.entries(summary).map(([status, value]) => (
                <div key={status} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-500">{status}</p>
                  <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          </section>

          <section className="section-card overflow-hidden">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="eyebrow">Project workers</p>
                <h3 className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">Daily time and overtime entry</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Open the attendance table, then click each day card button to show all details in a dedicated popup.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap 2xl:justify-end">
                <button type="button" onClick={() => setIsWorkspaceOpen(true)} className="primary-button">
                  Open attendance table
                </button>
                <button type="button" onClick={saveAttendance} disabled={saving || loading} className="secondary-button">
                  {saving ? "Saving..." : "Save attendance"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">Current project</p>
                <p className="mt-2 text-xl font-black text-slate-950">{selectedProject}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">Visible workers</p>
                <p className="mt-2 text-xl font-black text-slate-950">{assignedEmployees.length}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Only workers assigned to the selected project appear here</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">Day columns</p>
                <p className="mt-2 text-xl font-black text-slate-950">{periodDates.length}</p>
              </div>
            </div>
          </section>

          <section className="section-card overflow-hidden">
            <div>
              <p className="eyebrow">Latest records</p>
              <h3 className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">Recent saved attendance for {selectedProject}</h3>
            </div>

            <div className="mt-6 space-y-4 xl:hidden">
              {loading ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center text-slate-500">Loading attendance...</div>
              ) : latestRecords.length === 0 ? (
                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center text-slate-500">No saved attendance records for this project yet.</div>
              ) : (
                latestRecords.map((record) => (
                  <article key={record.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-950">
                          {record.employeeName}
                          {record.employeeId ? <span className="ml-2 text-xs font-semibold text-slate-400">({record.employeeId})</span> : null}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{record.date}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass[record.status] || "bg-slate-100 text-slate-700"}`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-bold text-slate-500">Check-in</p>
                        <p className="mt-1 font-black text-slate-950">{record.checkIn || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-bold text-slate-500">Check-out</p>
                        <p className="mt-1 font-black text-slate-950">{record.checkOut || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-bold text-slate-500">Project</p>
                        <p className="mt-1 font-black text-slate-950">{record.projectSite || selectedProject}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-bold text-slate-500">OT</p>
                        <p className="mt-1 font-black text-slate-950">{record.overtimeHours !== undefined && record.overtimeHours !== null ? `${record.overtimeHours}h` : "—"}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-bold text-slate-500">Notes</p>
                      <p className="mt-1 font-semibold text-slate-700">{record.notes || "—"}</p>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-[1.5rem] border border-slate-100 xl:block">
              <table className="soft-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Project</th>
                    <th>OT</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center text-slate-500">Loading attendance...</td></tr>
                  ) : latestRecords.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-slate-500">No saved attendance records for this project yet.</td></tr>
                  ) : (
                    latestRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="font-bold text-slate-950">{record.employeeName}{record.employeeId ? <span className="ml-2 text-xs font-semibold text-slate-400">({record.employeeId})</span> : null}</td>
                        <td className="text-slate-600">{record.date}</td>
                        <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[record.status] || "bg-slate-100 text-slate-700"}`}>{record.status}</span></td>
                        <td className="text-slate-600">{record.checkIn || "—"}</td>
                        <td className="text-slate-600">{record.checkOut || "—"}</td>
                        <td className="text-slate-600">{record.projectSite || selectedProject}</td>
                        <td className="text-slate-600">{record.overtimeHours !== undefined && record.overtimeHours !== null ? `${record.overtimeHours}h` : "—"}</td>
                        <td className="text-slate-600">{record.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {isWorkspaceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 p-2 backdrop-blur-sm">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/80 px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance workspace</p>
                  <h3 className="break-words pr-2 text-base font-black text-slate-950">
                    {selectedProject} daily time and overtime table
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {assignedEmployees.length} assigned workers · {periodDates.length} day columns · Sunday is rest day
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                <table className="min-w-[1200px] border-collapse text-left text-sm">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[260px] bg-slate-950 px-4 py-3 text-xs font-black">Worker</th>
                    <th className="sticky left-[260px] z-20 min-w-[180px] bg-slate-950 px-4 py-3 text-xs font-black">Position</th>
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
                    <tr><td colSpan={periodDates.length + 2} className="px-4 py-8 text-center text-slate-500">Loading attendance workspace...</td></tr>
                  ) : assignedEmployees.length === 0 ? (
                    <tr><td colSpan={periodDates.length + 2} className="px-4 py-8 text-center text-slate-500">No workers are assigned to this project yet. Assign workers from Admin Access to start encoding attendance.</td></tr>
                  ) : (
                    assignedEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <td className="sticky left-0 z-10 min-w-[260px] bg-white px-4 py-4 font-black text-slate-950">{employee.fullName}</td>
                        <td className="sticky left-[260px] z-10 min-w-[180px] bg-white px-4 py-4 text-slate-600">{employee.position || "Employee"}</td>
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

      {deleteTarget && (() => {
        const employee = employees.find((item) => item.id === deleteTarget.employeeId);
        return employee ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-rose-50/70 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">Confirm deletion</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Delete attendance record?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {employee.fullName} · {formatDateFull(deleteTarget.date)}
                </p>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm text-slate-600">
                  This will permanently remove the saved attendance entry for this worker and date.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDeleteAttendance()}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-700"
                  >
                    Delete attendance
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {activeCell && activeEmployee && activeDraft && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Attendance details</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{activeEmployee.fullName}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{activeEmployee.position || "Employee"} · {selectedProject}</p>
                <p className="mt-1 text-sm text-slate-500">Source date: {formatDateFull(activeCell.date)}</p>
                <p className="mt-1 text-sm font-semibold text-blue-600">Editing attendance date: {activeAttendanceDate ? formatDateFull(activeAttendanceDate) : formatDateFull(activeCell.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => deleteAttendance(activeCell.employeeId, activeCell.date)}
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setActiveCell(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Attendance date</span>
                  <input
                    type="date"
                    value={activeAttendanceDate}
                    onChange={(event) => setActiveAttendanceDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-500">Choose the exact date for this attendance entry before saving.</p>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Attendance status</span>
                  <select
                    value={activeDraft.status}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { status: event.target.value as AttendanceStatus })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-500">Project site</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{selectedProject}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">This worker is currently assigned to this project for the attendance workspace.</p>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Time in</span>
                  <input
                    type="time"
                    value={activeDraft.checkIn}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { checkIn: event.target.value })}
                    disabled={activeDraft.status === "Absent" || activeDraft.status === "Leave"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Time out</span>
                  <input
                    type="time"
                    value={activeDraft.checkOut}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { checkOut: event.target.value })}
                    disabled={activeDraft.status === "Absent" || activeDraft.status === "Leave"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Worked hours</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{computeWorkedHours(activeDraft.checkIn, activeDraft.checkOut).toFixed(2)}h</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">Manual OT</p>
                      <p className="mt-2 text-2xl font-black text-emerald-700">{activeDraft.overtimeHours}h</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">Shift</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">7:00 AM - 4:00 PM</p>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Overtime mode</span>
                  <select
                    value={activeDraft.overtimeMode}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { overtimeMode: event.target.value as OvertimeMode })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    <option value="manual">Manual OT</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Overtime hours</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={activeDraft.overtimeHours}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { overtimeHours: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-bold text-slate-600">Notes</span>
                  <textarea
                    value={activeDraft.notes}
                    onChange={(event) => updateDraft(activeCell.employeeId, activeAttendanceDate || activeCell.date, { notes: event.target.value })}
                    rows={5}
                    placeholder="Add attendance notes, deployment notes, approved undertime, approved overtime, etc."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => void saveCurrentAttendance()}
                  disabled={saving || loading}
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save attendance"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
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
