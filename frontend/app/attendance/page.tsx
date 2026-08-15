"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useNotification } from "../components/notification";
import { canonicalDepartmentName, triggerAppDataRefresh, uniqueCanonicalDepartments } from "../../lib/supabaseRealtime";

type AttendanceStatus = "Present" | "Absent" | "Leave" | "Rest Day" | "Halfday" | "Canceled Work" | "Remote";
type PeriodMode = "weekly" | "semi-monthly";
type OvertimeMode = "auto" | "manual";
type ViewMode = "table" | "calendar";






type AttendanceRecord = {
  id: string;
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

type DraftEntry = {
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  overtimeHours: string;
  overtimeMode: OvertimeMode;
};

type DraftMap = Record<string, DraftEntry>;
type ProjectAssignmentMap = Record<string, string>;

type ProjectSiteRow = { id: string; name: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "").replace(/\/api$/, "") + "/api";
const STATUS_OPTIONS: AttendanceStatus[] = ["Present", "Absent", "Leave", "Rest Day", "Halfday", "Canceled Work", "Remote"];
const DEFAULT_DRAFT: DraftEntry = { status: "Present", checkIn: "07:00", checkOut: "16:00", notes: "", overtimeHours: "0", overtimeMode: "manual" };

function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function parseIsoDate(value: string) { const [y, m, d] = value.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function formatDateLabel(value: string) { return parseIsoDate(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function formatDateFull(value: string) { return parseIsoDate(value).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); }
function weekStart(date: Date) { const next = new Date(date); next.setDate(next.getDate() - ((next.getDay() + 6) % 7)); return next; }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function getPeriodDates(startDate: string, endDate: string) { const start = parseIsoDate(startDate); const end = parseIsoDate(endDate); const dates: string[] = []; const cursor = new Date(start); while (cursor <= end) { dates.push(isoDate(cursor)); cursor.setDate(cursor.getDate() + 1); } return dates; }
function parseTimeToMinutes(value: string) {
  const trimmed = String(value || "").trim();
  const meridiem = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)$/i);
  if (meridiem) {
    let hours = Number(meridiem[1]); const minutes = Number(meridiem[2]); const ampm = meridiem[3].toLowerCase(); if (hours === 12) hours = 0; if (ampm === "pm") hours += 12; return hours * 60 + minutes;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null; return Number(match[1]) * 60 + Number(match[2]);
}
function computeGrossHours(checkIn: string, checkOut: string) { const s = parseTimeToMinutes(checkIn); const e = parseTimeToMinutes(checkOut); if (s === null || e === null || e <= s) return 0; return (e - s) / 60; }
function computeWorkedHours(checkIn: string, checkOut: string, department?: string | null, projectSite?: string | null) { const gross = computeGrossHours(checkIn, checkOut); if (gross <= 0) return 0; const dept = String(department || "").trim().toLowerCase(); const site = String(projectSite || "").trim().toLowerCase(); const usesLunchDeduction = dept === "construction" || (dept === "rbac" && site === "main office"); return Math.floor(Math.max(0, usesLunchDeduction && gross >= 8 ? gross - 1 : gross)); }
function computeAutoOvertime(checkIn: string, checkOut: string, department?: string | null) {
  const grossHours = computeGrossHours(checkIn, checkOut);
  if (grossHours <= 0) return 0;

  const isConstruction = String(department || "").trim().toLowerCase() === "construction";
  const overtimeHours = isConstruction ? grossHours - 9 : grossHours - 8;
  return Math.max(0, Math.round(overtimeHours * 100) / 100);
}
function getDraftKey(employeeId: string, date: string) { return `${employeeId}__${date}`; }
function uniqueById(employees: Employee[]) { const seen = new Set<string>(); return employees.filter((e) => e.id && !seen.has(e.id) && seen.add(e.id)); }



function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: "bg-emerald-50 text-emerald-700",
    Absent: "bg-red-50 text-red-700",
    Leave: "bg-blue-50 text-blue-700",
    "Rest Day": "bg-amber-50 text-amber-700",
    Halfday: "bg-cyan-50 text-cyan-700",
    "Canceled Work": "bg-orange-50 text-orange-700",
    Remote: "bg-violet-50 text-violet-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${map[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

function isLockedAttendanceStatus(status?: string) {
  return String(status || "").toLowerCase() === "rest day";
}

function getDefaultDisplayStatus(date: string) {
  return parseIsoDate(date).getDay() === 0 ? "Rest Day" : "";
}

function getDisplayStatus(record: AttendanceRecord | null | undefined, date: string) {
  return record?.status || getDefaultDisplayStatus(date);
}

function LegendPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${tone}`}>{label}</span>;
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full text-base ${accent}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignmentMap>({});
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("weekly");
  const [rangeStartDate, setRangeStartDate] = useState(isoDate(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState(isoDate(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [assignmentSavingId, setAssignmentSavingId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ employeeId: string; date: string } | null>(null);
  const [editorAnchorRect, setEditorAnchorRect] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const [editorPosition, setEditorPosition] = useState<{ top: number; left: number } | null>(null);
  const [editorPlacement, setEditorPlacement] = useState<"left" | "right">("right");
  const [deleteTarget, setDeleteTarget] = useState<{ employeeId: string; date: string } | null>(null);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>("Present");
  const [newProjectName, setNewProjectName] = useState("");


  const getAuthHeaders = useCallback(() => { const token = localStorage.getItem("hr_token"); return token ? { Authorization: `Bearer ${token}` } : null; }, []);
  const periodDates = useMemo(() => getPeriodDates(rangeStartDate, rangeEndDate), [rangeStartDate, rangeEndDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        router.replace("/login");
        return;
      }

      const [attRes, empRes, projRes, assignRes, deptRes] = await Promise.all([
        fetch(`${API_BASE}/attendance`, { headers }),
        fetch(`${API_BASE}/employees?limit=0`, { headers }),
        fetch(`${API_BASE}/attendance/projects`, { headers }),
        fetch(`${API_BASE}/attendance/assignments`, { headers }),
        fetch(`${API_BASE}/admin-users/departments`, { headers }),
      ]);

      const att = await attRes.json().catch(() => ({}));
      const emp = await empRes.json().catch(() => ({}));
      const proj = await projRes.json().catch(() => ({}));
      const assign = await assignRes.json().catch(() => ({}));
      const dept = await deptRes.json().catch(() => ({}));

      if (!attRes.ok) throw new Error(att?.message || "Failed to load attendance");
      if (!empRes.ok) throw new Error(emp?.message || "Failed to load employees");

      const activeEmployees = uniqueById((emp?.employees || []).filter((e: Employee) => String(e.status || "").toLowerCase() === "active"));
      const loadedProjects = (proj?.projects || []).map((p: ProjectSiteRow) => p.name).filter(Boolean);
      const mergedProjects = Array.from(new Set(["Main Office", ...loadedProjects]));

      setRecords(att?.attendance || []);
      setEmployees(activeEmployees);
      setProjects(mergedProjects);

      const mergedDepts = uniqueCanonicalDepartments(
        [
          ...(dept?.departments || []),
          { id: "construction", name: canonicalDepartmentName("construction") },
        ].map((d: any) => ({ id: String(d.id || d.name || ""), name: String(d.name || d) })),
      ).map((d) => d.name);

      setDepartments(mergedDepts);
      setSelectedDepartment((current) => current || mergedDepts[0] || "");

      const dbAssignments = assign?.assignments && typeof assign.assignments === "object" ? (assign.assignments as ProjectAssignmentMap) : {};
      const normalized: ProjectAssignmentMap = {};
      activeEmployees.forEach((employee) => {
        normalized[employee.id] = String(employee.department || "").toLowerCase() === "construction" ? (dbAssignments[employee.id] || "") : "Main Office";
      });
      setAssignments(normalized);
      setSelectedProject((current) => current || mergedProjects[0] || normalized[activeEmployees[0]?.id || ""] || "Main Office");
      setSyncStatus("Attendance data synchronized");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    return undefined;
  }, [editor, deleteTarget]);

  const assignedEmployees = useMemo(() => employees.filter((employee) => {
    const deptOk = !selectedDepartment || String(employee.department || "").toLowerCase() === selectedDepartment.toLowerCase();
    const project = String(employee.department || "").toLowerCase() === "construction" ? (assignments[employee.id] || "") : "Main Office";
    const projOk = !selectedProject || project === selectedProject || (!selectedProject && project);
    return deptOk && projOk;
  }).sort((a, b) => a.fullName.localeCompare(b.fullName)), [assignments, employees, selectedDepartment, selectedProject]);

  function getSavedRecord(employeeId: string, date: string) { const employee = employees.find((e) => e.id === employeeId); return records.find((r) => r.date === date && (r.employeeId === employeeId || r.employeeName === employee?.fullName)); }
  function ensureDraft(employeeId: string, date: string) {
    const key = getDraftKey(employeeId, date); const existing = getSavedRecord(employeeId, date);
    const existingStatus = existing?.status as AttendanceStatus | undefined;
    return drafts[key] || {
      status: existingStatus || DEFAULT_DRAFT.status,
      checkIn: existing?.checkIn || DEFAULT_DRAFT.checkIn,
      checkOut: existing?.checkOut || DEFAULT_DRAFT.checkOut,
      notes: existing?.notes || "",
      overtimeHours: String(existing?.overtimeHours ?? (existing ? computeAutoOvertime(existing.checkIn || "", existing.checkOut || "", employees.find((item) => item.id === employeeId)?.department) : 0)),
      overtimeMode: "auto",
    };
  }
  function updateDraft(employeeId: string, date: string, patch: Partial<DraftEntry>) {
    const existingRecord = getSavedRecord(employeeId, date);
    if (isLockedAttendanceStatus(existingRecord?.status)) return;

    const key = getDraftKey(employeeId, date);
    const current = ensureDraft(employeeId, date);
    const next = { ...current, ...patch };

    if (patch.status && ["Absent", "Leave", "Rest Day"].includes(patch.status)) {
      next.checkIn = "";
      next.checkOut = "";
      next.overtimeHours = "0";
      next.overtimeMode = "auto";
    }


    if (patch.status === "Halfday") {
      next.checkIn = next.checkIn || "07:00";
      next.checkOut = next.checkOut || "11:00";
      next.overtimeHours = String(computeAutoOvertime(next.checkIn, next.checkOut));
      next.overtimeMode = "auto";
    }

    if (patch.checkIn !== undefined || patch.checkOut !== undefined) {
      const shouldAutoCompute = !["Absent", "Leave", "Rest Day"].includes(next.status);
      if (shouldAutoCompute) {
        const employee = employees.find((item) => item.id === employeeId);
        next.overtimeHours = String(computeAutoOvertime(next.checkIn, next.checkOut, employee?.department));
        next.overtimeMode = "auto";
      }
    }

    if (patch.overtimeHours !== undefined) next.overtimeMode = "manual";
    setDrafts((prev) => ({ ...prev, [key]: next }));
  }

  function setAutoOvertime(employeeId: string, date: string) {
    const draft = ensureDraft(employeeId, date);
    const employee = employees.find((item) => item.id === employeeId);
    updateDraft(employeeId, date, {
      overtimeHours: String(computeAutoOvertime(draft.checkIn, draft.checkOut, employee?.department)),
      overtimeMode: "auto",
    });
  }

  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Leave: 0, "Rest Day": 0, OT: 0 } as Record<string, number>;
    const dateSet = new Set(periodDates);
    records.forEach((record) => {
      if (!dateSet.has(record.date)) return;
      if (!assignedEmployees.some((e) => e.id === record.employeeId || e.fullName === record.employeeName)) return;
      const status = record.status || getDefaultDisplayStatus(record.date);
      counts[status] = (counts[status] || 0) + 1;
      counts.OT += Number(record.overtimeHours || 0);
    });
    return counts;
  }, [assignedEmployees, periodDates, records]);

  const weekLabel = useMemo(() => {
    if (periodDates.length === 0) return "";
    const first = formatDateLabel(periodDates[0]);
    const last = formatDateLabel(periodDates[periodDates.length - 1]);
    return `${first} to ${last}`;
  }, [periodDates]);

  const visibleEmployees = useMemo(() => assignedEmployees.filter((employee) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [employee.fullName, employee.position, employee.department, assignments[employee.id]].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  }), [assignedEmployees, assignments, searchQuery]);

  const visibleDates = periodDates;

  const saveAttendance = async () => {
    setSaving(true); setError(null);
    try {
      const headers = getAuthHeaders(); if (!headers) { router.replace("/login"); return; }
      const payloads = Object.entries(drafts).map(([key, draft]) => {
        const [employeeId, date] = key.split("__"); const employee = employees.find((e) => e.id === employeeId); if (!employee || !periodDates.includes(date)) return null;
        const workedHours = draft.status === "Absent" || draft.status === "Rest Day"
          ? 0
          : draft.status === "Leave"
            ? 8
            : draft.status === "Halfday"
              ? 4
              : computeWorkedHours(draft.checkIn, draft.checkOut, employee.department, selectedProject || assignments[employee.id] || "Main Office");
        return { employeeId, employeeName: employee.fullName, date, status: draft.status, checkIn: ["Absent", "Leave", "Rest Day"].includes(draft.status) ? "" : draft.checkIn, checkOut: ["Absent", "Leave", "Rest Day"].includes(draft.status) ? "" : draft.checkOut, notes: draft.notes.trim(), projectSite: selectedProject, periodMode, workedHours, overtimeHours: Number(draft.overtimeHours || 0), overtimeMode: draft.overtimeMode };
      }).filter(Boolean) as any[];
      if (payloads.length === 0) { notify("No changes to save"); return; }
      const results = await Promise.all(payloads.map((payload) => fetch(`${API_BASE}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload) }).then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || data?.error || `Failed to save ${payload.employeeName} (${res.status})`); return res; })));
      void results;
      const refreshed = await fetch(`${API_BASE}/attendance`, { headers }); const refreshedData = await refreshed.json().catch(() => ({})); if (refreshed.ok) setRecords(refreshedData?.attendance || []);
      setDrafts({}); triggerAppDataRefresh(["attendance_records"]); notify("Attendance changes saved");
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  const clampEditorPosition = useCallback((rect: { top: number; left: number; right: number; bottom: number; width: number; height: number }) => {
    if (typeof window === "undefined") return null;

    const viewportPadding = 24;
    const gap = 8;
    const popupWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
    const popupHeight = Math.min(540, window.innerHeight - viewportPadding * 2);
    const maxLeft = window.innerWidth - popupWidth - viewportPadding;

    const shouldOpenLeft = rect.right > window.innerWidth * 0.55 || rect.left + popupWidth + gap > window.innerWidth - viewportPadding;
    let left = shouldOpenLeft ? rect.left - popupWidth - gap : rect.right + gap;
    let placement: "left" | "right" = shouldOpenLeft ? "left" : "right";

    left = Math.max(viewportPadding, Math.min(left, maxLeft));
    if (left + popupWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - popupWidth - viewportPadding;
    }

    let top = rect.top - 8;
    const maxTop = window.innerHeight - popupHeight - viewportPadding;
    top = Math.max(viewportPadding, Math.min(top, maxTop));

    return { top, left, placement };
  }, []);

  const openEditor = (employeeId: string, date: string, event?: React.MouseEvent<HTMLElement>) => {
    const record = getSavedRecord(employeeId, date);
    if (isLockedAttendanceStatus(record?.status)) {
      notify("Rest day entries are locked");
      return;
    }

    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const nextAnchorRect = {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
      const positioned = clampEditorPosition(nextAnchorRect);
      setEditorAnchorRect(nextAnchorRect);
      setEditorPosition(positioned ? { top: positioned.top, left: positioned.left } : null);
      setEditorPlacement(positioned?.placement || "right");
    } else {
      setEditorAnchorRect(null);
      setEditorPosition(null);
      setEditorPlacement("right");
    }

    setEditor({ employeeId, date });
  };
  const saveSingle = async () => { if (!editor) return; const employee = employees.find((e) => e.id === editor.employeeId); if (!employee) return; setSaving(true); try { const headers = getAuthHeaders(); if (!headers) { router.replace("/login"); return; } const draft = ensureDraft(editor.employeeId, editor.date); const projectSite = (selectedProject || assignments[employee.id] || "Main Office").trim() || "Main Office"; const payload = { employeeId: employee.id, employeeName: employee.fullName, date: editor.date, status: draft.status, checkIn: ["Absent", "Leave", "Rest Day"].includes(draft.status) ? "" : draft.checkIn, checkOut: ["Absent", "Leave", "Rest Day"].includes(draft.status) ? "" : draft.checkOut, notes: draft.notes.trim(), projectSite, periodMode, workedHours: draft.status === "Absent" || draft.status === "Rest Day" ? 0 : draft.status === "Leave" ? 8 : draft.status === "Halfday" ? 4 : computeWorkedHours(draft.checkIn, draft.checkOut, employee.department), overtimeHours: Number(draft.overtimeHours || 0), overtimeMode: draft.overtimeMode }; let res = await fetch(`${API_BASE}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload) }); let data = await res.json().catch(() => ({})); if (!res.ok && data?.message === "Employee not found for attendance save") { res = await fetch(`${API_BASE}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ ...payload, employeeId: undefined }) }); data = await res.json().catch(() => ({})); } if (!res.ok) throw new Error(data?.message || data?.error || `Failed to save attendance (${res.status})`); setEditor(null); setEditorAnchorRect(null); setEditorPosition(null); await loadData(); notify("Attendance saved"); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };
  const deleteAttendance = async () => { if (!deleteTarget) return; setSaving(true); try { const headers = getAuthHeaders(); if (!headers) { router.replace("/login"); return; } const res = await fetch(`${API_BASE}/attendance`, { method: "DELETE", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(deleteTarget) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || "Failed to delete attendance"); setDeleteTarget(null); await loadData(); notify("Attendance deleted"); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };

  const exportExcel = () => {
    const rows = visibleEmployees.flatMap((employee) => visibleDates.map((date) => { const record = getSavedRecord(employee.id, date); return { Worker: employee.fullName, Department: employee.department || "", Project: assignments[employee.id] || selectedProject, Date: formatDateFull(date), Status: record?.status || "", "Check In": record?.checkIn || "", "Check Out": record?.checkOut || "", "Worked Hours": record?.workedHours ?? "", "OT Hours": record?.overtimeHours ?? "", Notes: record?.notes || "" }; }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Attendance"); XLSX.writeFile(wb, `attendance-${selectedProject || "all"}-${rangeStartDate}-${rangeEndDate}.xlsx`.replace(/\s+/g, "-").toLowerCase()); notify("Attendance exported to Excel");
  };

  async function addProject() {
    const name = newProjectName.trim(); if (!name) return; try { const headers = getAuthHeaders(); if (!headers) { router.replace("/login"); return; } const res = await fetch(`${API_BASE}/attendance/projects`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ name }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || "Failed to add project"); setNewProjectName(""); await loadData(); notify("Project site added"); } catch (e) { setError((e as Error).message); } }
  async function assignEmployee(employeeId: string, projectName: string) { const previous = assignments[employeeId] || ""; setAssignments((c) => ({ ...c, [employeeId]: projectName })); setAssignmentSavingId(employeeId); try { const headers = getAuthHeaders(); if (!headers) { router.replace("/login"); return; } const res = await fetch(`${API_BASE}/attendance/assignments`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ employeeId, projectName }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || "Failed to save assignment"); notify("Worker project assignment updated"); } catch (e) { setAssignments((c) => ({ ...c, [employeeId]: previous })); setError((e as Error).message); } finally { setAssignmentSavingId(null); } }
  function copyPreviousDay(employeeId: string, date: string) { const prev = isoDate(addDays(parseIsoDate(date), -1)); const prevRecord = getSavedRecord(employeeId, prev); if (!prevRecord || isLockedAttendanceStatus(prevRecord.status)) return; setDrafts((c) => ({ ...c, [getDraftKey(employeeId, date)]: { status: prevRecord.status as AttendanceStatus, checkIn: prevRecord.checkIn || DEFAULT_DRAFT.checkIn, checkOut: prevRecord.checkOut || DEFAULT_DRAFT.checkOut, notes: prevRecord.notes || "", overtimeHours: String(prevRecord.overtimeHours || 0), overtimeMode: prevRecord.overtimeMode || "manual" } })); notify("Copied previous day"); }
  function bulkApply(employeeIds: string[]) { setDrafts((current) => { const next = { ...current }; employeeIds.forEach((employeeId) => { const record = getSavedRecord(employeeId, rangeStartDate); if (isLockedAttendanceStatus(record?.status)) return; const key = getDraftKey(employeeId, rangeStartDate); next[key] = { ...ensureDraft(employeeId, rangeStartDate), status: bulkStatus, checkIn: bulkStatus === "Present" ? "07:00" : "", checkOut: bulkStatus === "Present" ? "16:00" : "", overtimeHours: "0" }; }); return next; }); }

  const hasUnsavedChanges = Object.keys(drafts).length > 0;

  function getLiveWorkedHours(employeeId: string, date: string) {
    const employee = employees.find((item) => item.id === employeeId);
    const draft = ensureDraft(employeeId, date);
    const projectSite = selectedProject || assignments[employeeId] || "Main Office";

    if (draft.status === "Absent" || draft.status === "Rest Day") return 0;
    if (draft.status === "Leave") return 8;
    if (draft.status === "Halfday") return 4;
    return computeWorkedHours(draft.checkIn, draft.checkOut, employee?.department, projectSite);
  }

  useEffect(() => {
    if (!editor || !editorAnchorRect) return;
    const handleResize = () => {
      const positioned = clampEditorPosition(editorAnchorRect);
      setEditorPosition(positioned ? { top: positioned.top, left: positioned.left } : null);
      setEditorPlacement(positioned?.placement || "right");
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [clampEditorPosition, editor, editorAnchorRect]);

  const editorOverlay = editor && editorPosition && typeof document !== "undefined" ? createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => { setEditor(null); setEditorAnchorRect(null); setEditorPosition(null); }} />
      <div
        className="fixed z-50 w-[320px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{
          top: editorPosition.top,
          left: editorPosition.left,
        }}
      >
        <div className={`absolute top-8 h-3 w-3 rotate-45 border border-slate-200 bg-white ${editorPlacement === "left" ? "-right-1.5" : "-left-1.5"}`} />
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Attendance editor</div>
            <div className="truncate text-base font-black text-slate-950">{employees.find((e) => e.id === editor.employeeId)?.fullName}</div>
            <div className="text-[11px] text-slate-500">{formatDateFull(editor.date)}</div>
          </div>
          <button onClick={() => { setEditor(null); setEditorAnchorRect(null); setEditorPosition(null); }} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">Close</button>
        </div>

        <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block min-w-0"><div className="text-[10px] font-bold text-slate-500">Status</div><select value={ensureDraft(editor.employeeId, editor.date).status} onChange={(e) => updateDraft(editor.employeeId, editor.date, { status: e.target.value as AttendanceStatus })} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="block min-w-0"><div className="text-[10px] font-bold text-slate-500">Project</div><select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="Main Office">Main Office</option>{projects.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label className="block min-w-0"><div className="text-[10px] font-bold text-slate-500">Time in</div><input value={ensureDraft(editor.employeeId, editor.date).checkIn} onChange={(e) => updateDraft(editor.employeeId, editor.date, { checkIn: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
            <label className="block min-w-0"><div className="text-[10px] font-bold text-slate-500">Time out</div><input value={ensureDraft(editor.employeeId, editor.date).checkOut} onChange={(e) => updateDraft(editor.employeeId, editor.date, { checkOut: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
            <label className="block min-w-0"><div className="text-[10px] font-bold text-slate-500">Worked hours</div><input value={String(getLiveWorkedHours(editor.employeeId, editor.date))} readOnly className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label>
            <label className="block min-w-0"><div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500"><span>Overtime hours</span><div className="flex items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${ensureDraft(editor.employeeId, editor.date).overtimeMode === "auto" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ensureDraft(editor.employeeId, editor.date).overtimeMode === "auto" ? "Auto" : "Manual"}</span><button type="button" onClick={() => setAutoOvertime(editor.employeeId, editor.date)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Recalc</button></div></div><input value={ensureDraft(editor.employeeId, editor.date).overtimeHours} onChange={(e) => updateDraft(editor.employeeId, editor.date, { overtimeHours: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
            <label className="block min-w-0 sm:col-span-2"><div className="text-[10px] font-bold text-slate-500">Notes</div><textarea value={ensureDraft(editor.employeeId, editor.date).notes} onChange={(e) => updateDraft(editor.employeeId, editor.date, { notes: e.target.value })} rows={4} className="mt-1 w-full min-w-0 min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => copyPreviousDay(editor.employeeId, editor.date)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Copy previous day</button>
            <button onClick={() => setDeleteTarget(editor)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button>
          </div>
        </div>

        <div className="sticky bottom-0 border-t bg-white px-4 py-4 sm:px-5">
          <div className="flex justify-end gap-3">
            <button onClick={() => { setEditor(null); setEditorAnchorRect(null); setEditorPosition(null); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button>
            <button onClick={saveSingle} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Save Changes</button>
          </div>
        </div>
      </div>
    </>, document.body
  ) : null;

  return <div className="space-y-4 p-4 md:p-6">
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Attendance management</div>
          <h1 className="mt-2 text-2xl font-black md:text-3xl">Attendance Management</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">Daan Pari Project · Weekly View</p>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Spreadsheet-style attendance controls for HR/Admin teams, with fast search, bulk updates, and Excel export.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadData} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">Import</button>
          <button onClick={exportExcel} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white">Export Excel</button>
          <button onClick={() => bulkApply(visibleEmployees.map((e) => e.id))} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white">Bulk Edit</button>
          <button onClick={saveAttendance} disabled={!hasUnsavedChanges || saving} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">{hasUnsavedChanges ? <span className="rounded-full bg-amber-500/20 px-3 py-1 font-semibold text-amber-200">Unsaved changes</span> : <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">All changes saved</span>} {syncStatus && <span className="rounded-full bg-white/10 px-3 py-1">{syncStatus}</span>}</div>
    </div>

    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</div>}

    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard label="Total Workers" value={visibleEmployees.length} icon="👥" accent="bg-blue-50 text-blue-700" />
      <SummaryCard label="Present" value={summary.Present || 0} icon="✓" accent="bg-emerald-50 text-emerald-700" />
      <SummaryCard label="Absent" value={summary.Absent || 0} icon="✕" accent="bg-red-50 text-red-700" />
      <SummaryCard label="Rest Day" value={summary["Rest Day"] || 0} icon="RD" accent="bg-amber-50 text-amber-700" />
      <SummaryCard label="On Leave" value={summary.Leave || 0} icon="L" accent="bg-blue-50 text-blue-700" />
      <SummaryCard label="Total OT" value={summary.OT.toFixed(2)} icon="⏱" accent="bg-violet-50 text-violet-700" />
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.3fr_0.95fr_0.95fr_0.9fr_0.8fr] xl:items-end">
        <label className="block"><div className="text-xs font-bold text-slate-500">Search by name, position or ID</div><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search by name, position or ID" /></label>
        <label className="block"><div className="text-xs font-bold text-slate-500">Project / Department</div><select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <label className="block"><div className="text-xs font-bold text-slate-500">Project site</div><select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All projects</option><option value="Main Office">Main Office</option>{projects.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label className="block"><div className="text-xs font-bold text-slate-500">View</div><div className="mt-1 flex rounded-xl border border-slate-200 p-1"><button onClick={() => setViewMode("table")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${viewMode === "table" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Table View</button><button onClick={() => setViewMode("calendar")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${viewMode === "calendar" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Calendar View</button></div></label>
        <div className="grid grid-cols-2 gap-2"><label className="block"><div className="text-xs font-bold text-slate-500">Start</div><input type="date" value={rangeStartDate} onChange={(e) => setRangeStartDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="block"><div className="text-xs font-bold text-slate-500">End</div><input type="date" value={rangeEndDate} onChange={(e) => setRangeEndDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="w-full font-bold text-slate-500 sm:w-auto">Quick mark:</span>{STATUS_OPTIONS.map((status) => <button key={status} onClick={() => setBulkStatus(status)} className={`rounded-full px-3 py-1 font-bold ${bulkStatus === status ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{status}</button>)}<button onClick={() => bulkApply(visibleEmployees.map((e) => e.id))} className="rounded-full bg-blue-600 px-3 py-1 font-bold text-white">Apply to first day</button><button onClick={() => setDrafts({})} className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Clear drafts</button></div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        <LegendPill label="P = Present" tone="bg-emerald-50 text-emerald-700" />
        <LegendPill label="RD = Rest Day" tone="bg-amber-50 text-amber-700" />
        <LegendPill label="A = Absent" tone="bg-red-50 text-red-700" />
        <LegendPill label="L = On Leave" tone="bg-blue-50 text-blue-700" />
        <LegendPill label="R = Remote" tone="bg-violet-50 text-violet-700" />
      </div>
    </div>

    {loading ? (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading attendance data…</div>
    ) : viewMode === "table" ? (
      <>
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm md:hidden">
          <div className="space-y-3 p-3">
            {visibleEmployees.map((employee) => {
              const firstDate = visibleDates[0];
              const record = firstDate ? getSavedRecord(employee.id, firstDate) : null;
              return (
                <button key={employee.id} onClick={(event) => openEditor(employee.id, firstDate || rangeStartDate, event)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{employee.fullName}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{employee.department || ""}{employee.position ? ` · ${employee.position}` : ""}</div>
                    </div>
                    <StatusPill status={getDisplayStatus(record, firstDate || rangeStartDate)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-xl bg-slate-50 px-2 py-2"><div className="font-bold text-slate-400">Project</div><div className="truncate">{assignments[employee.id] || "Main Office"}</div></div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2"><div className="font-bold text-slate-400">Hours</div><div>{record ? computeWorkedHours(record.checkIn || "", record.checkOut || "", employee.department, assignments[employee.id] || "Main Office") : "—"}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-[260px] min-w-[260px] border-b bg-slate-950 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-white">Worker</th>
                  <th className="sticky left-[260px] z-20 w-[120px] min-w-[120px] border-b bg-slate-950 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-white">Project</th>
                  {visibleDates.map((date) => (
                    <th key={date} className="w-[136px] min-w-[136px] border-b bg-slate-950 px-2 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">
                      <div>{formatDateLabel(date)}</div>
                      <div className="text-[10px] font-semibold text-slate-300">{parseIsoDate(date).toLocaleDateString("en-GB", { weekday: "short" })}</div>
                    </th>
                  ))}
                  <th className="w-[110px] min-w-[110px] border-b bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">Reg Hrs</th>
                  <th className="w-[90px] min-w-[90px] border-b bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">Weekly Total</th>
                  <th className="w-[90px] min-w-[90px] border-b bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">OT Hrs</th>
                  <th className="w-[90px] min-w-[90px] border-b bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">Total Hrs</th>
                  <th className="w-[90px] min-w-[90px] border-b bg-slate-950 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((employee) => {
                  const weeklyRecords = visibleDates.map((date) => getSavedRecord(employee.id, date));
                  const regularHours = weeklyRecords.reduce((sum, record, index) => {
                    const date = visibleDates[index];
                    const status = getDisplayStatus(record, date);
                    const projectSite = assignments[employee.id] || "Main Office";
                    if (status === "Present" || status === "Halfday" || status === "Remote") {
                      return sum + (record ? computeWorkedHours(record.checkIn || "", record.checkOut || "", employee.department, projectSite) : (status === "Halfday" ? 4 : 0));
                    }
                    return sum;
                  }, 0);
                  const overtimeHours = weeklyRecords.reduce((sum, record) => sum + Number(record?.overtimeHours || 0), 0);
                  const totalHours = regularHours + overtimeHours;

                  return (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 z-10 border-b bg-white px-4 py-4 font-semibold">
                        <div className="max-w-[240px] truncate font-black text-slate-950">{employee.fullName}</div>
                        <div className="text-xs text-slate-500">{employee.department || ""}{employee.position ? ` · ${employee.position}` : ""}</div>
                      </td>
                      <td className="sticky left-[260px] z-10 border-b bg-white px-4 py-4 text-slate-600">{assignments[employee.id] || "Main Office"}{assignmentSavingId === employee.id ? "…" : ""}</td>
                      {visibleDates.map((date) => {
                        const record = getSavedRecord(employee.id, date);
                        const draft = ensureDraft(employee.id, date);
                        const displayStatus = getDisplayStatus(record, date);
                        const isRestDay = displayStatus === "Rest Day";
                        const isLeave = displayStatus === "Leave";
                        const isEmpty = !displayStatus;
                        return (
                          <td key={date} className="border-b px-2 py-2 text-center align-top">
                            <button onClick={(event) => openEditor(employee.id, date, event)} className={`w-full rounded-xl border px-2 py-2 transition ${drafts[getDraftKey(employee.id, date)] || record ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                {isEmpty ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Not set</span> : <StatusPill status={displayStatus} />}
                                <span className="text-[10px] font-semibold text-slate-500">{isRestDay ? "RD" : isLeave ? "8.0" : displayStatus === "Absent" ? "0" : record ? computeWorkedHours(record.checkIn || "", record.checkOut || "", employee.department, assignments[employee.id] || "Main Office") : ""}</span>
                              </div>
                              <div className="mt-1 text-[10px] text-slate-500">{isRestDay ? "Rest day" : isLeave ? "Paid leave" : isEmpty ? "No attendance yet" : `${record?.checkIn || draft.checkIn || "--"} - ${record?.checkOut || draft.checkOut || "--"}`}</div>
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-b px-3 py-4 text-center text-sm font-semibold text-slate-700">{regularHours.toFixed(2)}</td>
                      <td className="border-b px-3 py-4 text-center text-sm font-semibold text-slate-700">{regularHours.toFixed(2)}</td>
                      <td className="border-b px-3 py-4 text-center text-sm font-semibold text-slate-700">{overtimeHours.toFixed(2)}</td>
                      <td className="border-b px-3 py-4 text-center text-sm font-semibold text-slate-700">{totalHours.toFixed(2)}</td>
                      <td className="border-b px-3 py-4 text-center">
                        <button onClick={(event) => openEditor(employee.id, visibleDates[0] || rangeStartDate, event)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">{visibleEmployees.map((employee) => <div key={employee.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-slate-950">{employee.fullName}</div><div className="text-xs text-slate-500">{employee.department || ""}{employee.position ? ` · ${employee.position}` : ""}</div></div><button onClick={(event) => openEditor(employee.id, rangeStartDate, event)} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">Edit</button></div><div className="mt-3 grid grid-cols-2 gap-2">{visibleDates.map((date) => { const rec = getSavedRecord(employee.id, date); return <button key={date} onClick={(event) => openEditor(employee.id, date, event)} className="rounded-xl border border-slate-200 p-2 text-left"><div className="text-[10px] font-bold text-slate-500">{formatDateLabel(date)}</div><div className="mt-1"><StatusPill status={getDisplayStatus(rec, date)} /></div></button>; })}</div></div>)}</div>
    )}

    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-950">Project management</div><div className="text-xs text-slate-500">Add project sites and assign construction workers quickly.</div></div><div className="flex gap-2"><input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New project site" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={addProject} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Add</button></div></div>
      <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">{employees.filter((e) => String(e.department || "").toLowerCase() === "construction").slice(0, 12).map((employee) => <div key={employee.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="truncate font-bold text-slate-950">{employee.fullName}</div><div className="truncate text-xs text-slate-500">{employee.position || "Worker"}</div></div><select value={assignments[employee.id] || ""} onChange={(e) => assignEmployee(employee.id, e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-auto"><option value="">Unassigned</option>{projects.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>)}</div>
    </div>

    {editorOverlay}

    {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"><div className="text-lg font-black text-slate-950">Delete attendance?</div><p className="mt-2 text-sm text-slate-600">This removes the saved record for the selected worker and date.</p><div className="mt-5 flex gap-2"><button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Cancel</button><button onClick={deleteAttendance} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">Delete</button></div></div></div>}
  </div>;
}
