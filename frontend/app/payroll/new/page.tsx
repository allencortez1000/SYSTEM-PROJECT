"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { useNotification } from "../../components/notification";

type PayFrequency = "weekly" | "semi-monthly" | "monthly";

type WorkerRow = {
  id: string;
  employeeId?: string;
  supervisor: string;
  name: string;
  position: string;
  dailyRate: number;
  days: number;
  otHours: number;
  holidayPay: number;
  sssManual: number | null;
  pagIbigManual: number | null;
  philHealthManual: number | null;
  sssLoan: number;
  tax: number;
  additionalDeduction: number;
  cashAdvance: number;
  remarks: string;
  hasSss: boolean;
  hasPagIbig: boolean;
  hasPhilHealth: boolean;
  hasSssLoan: boolean;
  hasTax: boolean;
  hasAdditionalDeduction: boolean;
  payrollSnapshot?: {
    salaryAmount?: number | null;
    otPay?: number | null;
    holidayPayAmount?: number | null;
    philHealthAmount?: number | null;
    sssAmount?: number | null;
    pagIbigAmount?: number | null;
    totalSalary?: number | null;
    totalDeduction?: number | null;
    netSalary?: number | null;
    cashAdvance?: number | null;
    taxAmount?: number | null;
    additionalDeduction?: number | null;
  } | null;
  syncedFromAttendance?: boolean;
};

type Employee = {
  id: string;
  fullName: string;
  position?: string;
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

type ProjectWorkerSync = {
  employeeId: string;
  employeeName: string;
  position: string;
  dailyRate: number;
  attendance: {
    paidDays: number;
    overtimeHours: number;
    startDate: string;
    endDate: string;
    overrideApplied?: boolean;
  };
  payrollSnapshot?: {
    salaryAmount?: number | null;
    otPay?: number | null;
    holidayPayAmount?: number | null;
    philHealthAmount?: number | null;
    sssAmount?: number | null;
    pagIbigAmount?: number | null;
    totalSalary?: number | null;
    totalDeduction?: number | null;
    netSalary?: number | null;
    cashAdvance?: number | null;
    taxAmount?: number | null;
    additionalDeduction?: number | null;
  } | null;
  remarks?: string;
};

const API_BASE = "/api";
const PAYROLL_ROWS_STORAGE_KEY = "payroll_worker_rows_v1";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const frequencyConfig: Record<PayFrequency, { label: string; periodsPerMonth: number; description: string }> = {
  weekly: { label: "Weekly", periodsPerMonth: 52 / 12, description: "Best for construction worker weekly release." },
  "semi-monthly": { label: "Semi-monthly", periodsPerMonth: 2, description: "Twice a month, usually 15th and 30th." },
  monthly: { label: "Monthly", periodsPerMonth: 1, description: "One payroll release per month." },
};

function money(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function moneyWhole(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function blankRow(): WorkerRow {
  return {
    id: crypto.randomUUID(),
    supervisor: "",
    name: "",
    position: "",
    dailyRate: 0,
    days: 0,
    otHours: 0,
    holidayPay: 0,
    sssManual: 0,
    pagIbigManual: 0,
    philHealthManual: 0,
    sssLoan: 0,
    tax: 0,
    additionalDeduction: 0,
    cashAdvance: 0,
    remarks: "",
    hasSss: true,
    hasPagIbig: true,
    hasPhilHealth: true,
    hasSssLoan: true,
    hasTax: true,
    hasAdditionalDeduction: true,
  };
}

function normalizeRow(row: Partial<WorkerRow>): WorkerRow {
  return {
    ...blankRow(),
    ...row,
    sssManual: row.sssManual ?? 0,
    pagIbigManual: row.pagIbigManual ?? 0,
    philHealthManual: row.philHealthManual ?? 0,
    dailyRate: Number(row.dailyRate) || 0,
    days: Number(row.days) || 0,
    otHours: Number(row.otHours) || 0,
    holidayPay: Number(row.holidayPay) || 0,
    sssLoan: Number(row.sssLoan) || 0,
    tax: Number(row.tax) || 0,
    additionalDeduction: Number(row.additionalDeduction) || 0,
    cashAdvance: Number(row.cashAdvance) || 0,
  };
}



function computeRow(row: WorkerRow, frequency: PayFrequency) {
  const amount = row.dailyRate * row.days;
  const otPay = (row.dailyRate / 8) * 1.25 * row.otHours;
  const holidayPay = row.holidayPay;
  const totalSalary = amount + otPay + holidayPay;
  const sss = row.hasSss ? (row.sssManual ?? 0) : 0;
  const pagIbig = row.hasPagIbig ? (row.pagIbigManual ?? 0) : 0;
  const philHealth = row.hasPhilHealth ? (row.philHealthManual ?? 0) : 0;
  const sssLoan = row.hasSssLoan ? row.sssLoan : 0;
  const tax = row.hasTax ? row.tax : 0;
  const additionalDeduction = row.additionalDeduction;
  const totalDeduction = row.cashAdvance + tax + sssLoan + additionalDeduction + philHealth + pagIbig + sss;
  const netSalary = Math.max(0, totalSalary - totalDeduction);

  return { amount, otPay, holidayPay, totalSalary, sss, pagIbig, philHealth, sssLoan, tax, additionalDeduction, totalDeduction, netSalary };
}

function todayLabel() {
  return new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
  };
}

function currentWeekRange() {
  const { startDate, endDate } = currentWeekDates();
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "2-digit", year: "numeric" });

  return `${format(startDate)} - ${format(endDate)}`;
}

function formatCoveredPeriod(startDate: string, endDate: string) {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "2-digit", year: "numeric" });
  return `${format(startDate)} - ${format(endDate)}`;
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}

const inputClass =
  "relative z-0 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:z-50 focus:border-blue-400 focus:shadow-lg focus:ring-2 focus:ring-blue-100";

const numberInputClass = `${inputClass} text-right tabular-nums`;
const tableInputClass = "relative z-0 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:z-50 focus:border-blue-400 focus:shadow-lg focus:ring-2 focus:ring-blue-100";
const tableNumberInputClass = `${tableInputClass} text-right tabular-nums`;
const readonlyMoneyClass = "px-3 py-3 text-right text-sm font-black tabular-nums text-slate-700 whitespace-nowrap";
const toolButtonClass = "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700";

export default function NewPayrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultWeek = currentWeekDates();
  const [isWorksheetOpen, setIsWorksheetOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("weekly");
  const [periodStart, setPeriodStart] = useState(defaultWeek.startDate);
  const [periodEnd, setPeriodEnd] = useState(defaultWeek.endDate);
  const [coveredPeriod, setCoveredPeriod] = useState(currentWeekRange());
  const [payrollDate, setPayrollDate] = useState(todayLabel());
  const [projectName, setProjectName] = useState("");
  const [exportFileName, setExportFileName] = useState("weekly-payroll");
  const [selectedProject, setSelectedProject] = useState(searchParams.get("projectSite") || "");
  const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get("department") || "");
  const [projects, setProjects] = useState<string[]>([]);
  const tableSectionRef = useRef<HTMLDivElement | null>(null);
  const lastSyncKeyRef = useRef<string | null>(null);
  const [preparedBy, setPreparedBy] = useState("");
  const [notedBy, setNotedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [savingPayrollTable, setSavingPayrollTable] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { notify } = useNotification();

  useEffect(() => {
    setCoveredPeriod(formatCoveredPeriod(periodStart, periodEnd));
  }, [periodStart, periodEnd]);

  useEffect(() => {
    if (selectedProject.trim()) {
      setProjectName(`${selectedProject} payroll workspace`);
    }
  }, [selectedProject]);



  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    setError(null);
    lastSyncKeyRef.current = null;

    try {
      const token = localStorage.getItem("hr_token");
      const [employeesResponse, projectsResponse] = await Promise.all([
        token
          ? fetch(`${API_BASE}/employees`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
        fetch(`${API_BASE}/attendance/projects`),
      ]);
      const data = employeesResponse ? await employeesResponse.json().catch(() => null) : null;
      const projectsData = await projectsResponse.json().catch(() => null);

      if (employeesResponse?.ok) {
        setEmployees(data?.employees || []);
      } else {
        setEmployees([]);
      }

      if (projectsResponse.ok && Array.isArray(projectsData?.projects)) {
        const loadedProjects = projectsData.projects.map((project: { name: string }) => String(project.name).trim()).filter(Boolean);
        if (loadedProjects.length > 0) {
          setProjects(loadedProjects);
          setSelectedProject((current) => {
            const trimmed = current.trim();
            if (trimmed && loadedProjects.includes(trimmed)) return trimmed;
            return trimmed || "";
          });
        }
      }

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const payrollStorageKey = useMemo(() => {
    const projectKey = selectedProject.trim() || "unselected-project";
    const periodKey = `${periodStart || "no-start"}_${periodEnd || "no-end"}`;
    return `${PAYROLL_ROWS_STORAGE_KEY}_${projectKey}_${periodKey}`;
  }, [selectedProject, periodStart, periodEnd]);

  useEffect(() => {
    try {
      const storedRows = JSON.parse(localStorage.getItem(payrollStorageKey) || "null");
      if (Array.isArray(storedRows) && storedRows.length > 0) {
        setRows(storedRows.map((row: Partial<WorkerRow>) => normalizeRow(row)));
      } else {
        setRows([]);
      }
    } catch {
      // ignore invalid browser cache
      setRows([]);
    }

    void loadEmployees();

    const interval = window.setInterval(() => {
      void loadEmployees();
    }, 30000);

    const onFocus = () => {
      void loadEmployees();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadEmployees, payrollStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(payrollStorageKey, JSON.stringify(rows));
    } catch {
      // ignore storage failures
    }
  }, [rows, payrollStorageKey]);



  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => {
        const computed = computeRow(row, payFrequency);
        sum.amount += computed.amount;
        sum.otPay += computed.otPay;
        sum.holidayPay += computed.holidayPay;
        sum.totalSalary += computed.totalSalary;
        sum.philHealth += computed.philHealth;
        sum.pagIbig += computed.pagIbig;
        sum.sss += computed.sss;
        sum.cashAdvance += row.cashAdvance;
        sum.tax += row.tax;
        sum.sssLoan += row.sssLoan;
        sum.additionalDeduction += row.additionalDeduction;
        sum.totalDeduction += computed.totalDeduction;
        sum.netSalary += computed.netSalary;
        return sum;
      },
      { amount: 0, otPay: 0, holidayPay: 0, totalSalary: 0, philHealth: 0, pagIbig: 0, sss: 0, cashAdvance: 0, tax: 0, sssLoan: 0, additionalDeduction: 0, totalDeduction: 0, netSalary: 0 },
    );
  }, [payFrequency, rows]);

  const filledRows = rows.filter((row) => row.name.trim()).length;
  const syncedRows = rows.filter((row) => row.syncedFromAttendance).length;
  const previewRows = rows.filter((row) => row.name.trim()).slice(0, 3);
  const activeRow = rows.find((row) => row.id === activeRowId) || null;



  const stats = [
    { label: "Workers", value: filledRows || rows.length, detail: "Rows in this payroll", tone: "bg-blue-50 text-blue-700" },
    { label: "Attendance-linked", value: syncedRows, detail: "Rows synced from attendance", tone: "bg-cyan-50 text-cyan-700" },
    { label: "Gross salary", value: money(totals.totalSalary), detail: "Days + overtime pay", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Net release", value: moneyWhole(totals.netSalary), detail: "Total payable after deductions", tone: "bg-violet-50 text-violet-700" },
  ];

  function updateRow(id: string, patch: Partial<WorkerRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function saveRowToSupabase(row: WorkerRow) {
    if (!row.employeeId) return;

    const res = await fetch(`${API_BASE}/payroll/attendance-overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: row.employeeId,
        projectSite: selectedProject,
        startDate: periodStart,
        endDate: periodEnd,
        paidDaysOverride: row.days,
        overtimeHoursOverride: row.otHours,
        salaryAmount: row.payrollSnapshot?.salaryAmount ?? null,
        otPay: row.payrollSnapshot?.otPay ?? null,
        philhealthAmount: row.payrollSnapshot?.philHealthAmount ?? null,
        sssAmount: row.payrollSnapshot?.sssAmount ?? null,
        pagibigAmount: row.payrollSnapshot?.pagIbigAmount ?? null,
        totalSalary: row.payrollSnapshot?.totalSalary ?? null,
        totalDeduction: row.payrollSnapshot?.totalDeduction ?? null,
        netSalary: row.payrollSnapshot?.netSalary ?? null,
        cashAdvance: row.payrollSnapshot?.cashAdvance ?? null,
        taxAmount: row.payrollSnapshot?.taxAmount ?? null,
        additionalDeduction: row.payrollSnapshot?.additionalDeduction ?? row.additionalDeduction,
        remarks: row.remarks || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to save worker information");
  }

  async function saveActiveRow() {
    if (!activeRow) return;

    setSavingRowId(activeRow.id);
    setError(null);

    try {
      const current = JSON.parse(localStorage.getItem(payrollStorageKey) || "[]");
      const next = Array.isArray(current)
        ? current.map((row: WorkerRow) => (row.id === activeRow.id ? activeRow : row))
        : [activeRow];
      if (!next.some((row: WorkerRow) => row.id === activeRow.id)) next.push(activeRow);
      localStorage.setItem(payrollStorageKey, JSON.stringify(next));
      setRows(next);
      await saveRowToSupabase(activeRow);
      notify("Worker information saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingRowId(null);
    }
  }

  async function savePayrollTable() {
    setError(null);

    const rowsToSave = rows.filter((row) => row.name.trim());
    if (rowsToSave.length === 0) {
      notify("Add at least one worker row before saving");
      return;
    }

    const paidDays = rowsToSave.reduce((sum, row) => sum + (Number(row.days) || 0), 0);
    const overtimeHours = rowsToSave.reduce((sum, row) => sum + (Number(row.otHours) || 0), 0);

    setSavingPayrollTable(true);
    try {
      localStorage.setItem(payrollStorageKey, JSON.stringify(rows));
      await Promise.all(rowsToSave.map((row) => saveRowToSupabase(row)));

      const payrollSummaryPayload = {
        employeeName: selectedDepartment || projectName || selectedProject,
        payPeriod: coveredPeriod,
        payBasis: "daily",
        payFrequency,
        payoutDay: periodEnd,
        firstCutoffDay: periodStart,
        secondCutoffDay: periodEnd,
        rate: 0,
        units: paidDays,
        overtimeHours,
        overtimeRate: 0,
        bonus: 0,
        allowances: 0,
        loanDeduction: rowsToSave.reduce((sum, row) => sum + (Number(row.sssLoan) || 0), 0),
        basicSalary: rowsToSave.reduce((sum, row) => sum + (Number(row.dailyRate) || 0) * (Number(row.days) || 0), 0),
        grossEarnings: totals.totalSalary,
        attendanceSummary: {
          startDate: periodStart,
          endDate: periodEnd,
          projectSite: selectedProject,
          employeeCount: rowsToSave.length,
          paidDays,
          overtimeHours,
        },
      };

      const response = await fetch(`${API_BASE}/payroll/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollSummaryPayload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save payroll run");
      }

      notify("Saved — opening payroll records...");
      router.push("/payroll");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingPayrollTable(false);
    }
  }

  function selectEmployee(rowId: string, employeeName: string) {
    const employee = employees.find((item) => item.fullName === employeeName);
    const employeeSalary = employee?.salary ? Number(employee.salary) : 0;
    const estimatedDailyRate = employee?.salaryBasis?.toLowerCase() === "daily"
      ? employeeSalary || undefined
      : employeeSalary
        ? Math.round(employeeSalary / 26)
        : undefined;

  updateRow(rowId, {
    employeeId: employee?.id,
    name: employeeName,
    position: employee?.position || "Labor",
    syncedFromAttendance: false,
    ...(estimatedDailyRate ? { dailyRate: estimatedDailyRate } : {}),
    hasSss: employee?.hasSss ?? true,
    hasPagIbig: employee?.hasPagIbig ?? true,
    hasPhilHealth: employee?.hasPhilHealth ?? true,
    hasSssLoan: employee?.hasSssLoan ?? true,
    hasTax: employee?.hasTax ?? true,
    hasAdditionalDeduction: employee?.hasAdditionalDeduction ?? true,
    sssManual: employee?.sssAmount ?? 0,
    pagIbigManual: employee?.pagIbigAmount ?? 0,
    philHealthManual: employee?.philHealthAmount ?? 0,
    sssLoan: employee?.sssLoanAmount ?? 0,
    tax: employee?.taxAmount ?? 0,
    additionalDeduction: employee?.additionalDeductionAmount ?? 0,
  });
  }

  useEffect(() => {
    function handleAttendanceUpdated(event: Event) {
      const detail = (event as CustomEvent<{ projectSite?: string }>).detail;
      if (detail?.projectSite && detail.projectSite !== selectedProject) {
        return;
      }

      void loadEmployees().then(() => {
        if (selectedProject.trim() && periodStart && periodEnd) {
          void syncPayrollFromAttendance();
        }
      });
    }

    window.addEventListener("attendance-updated", handleAttendanceUpdated as EventListener);
    return () => window.removeEventListener("attendance-updated", handleAttendanceUpdated as EventListener);
  }, [loadEmployees, selectedProject, periodStart, periodEnd]);

  const canSyncAttendance = Boolean(selectedProject.trim() && periodStart && periodEnd && !loadingEmployees && !syncingAttendance);

  async function syncPayrollFromAttendance() {
    if (!canSyncAttendance) {
      notify("Select a project and date range before syncing attendance");
      return;
    }

    setSyncingAttendance(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        projectSite: selectedProject,
        startDate: periodStart,
        endDate: periodEnd,
      });
      const response = await fetch(`${API_BASE}/payroll/project-sync?${query.toString()}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to sync payroll workers from attendance");
      }

      const workers = Array.isArray(data?.workers) ? (data.workers as ProjectWorkerSync[]) : [];
      if (workers.length === 0) {
        setRows([]);
        notify("No workers found for this project and period");
        return;
      }

      setRows(
        workers.map((worker): WorkerRow => {
          const employee = employees.find((item) => item.id === worker.employeeId);
          return {
            id: crypto.randomUUID(),
            employeeId: worker.employeeId,
            supervisor: "",
            name: worker.employeeName,
            position: worker.position || "Labor",
            dailyRate: worker.payrollSnapshot?.salaryAmount != null ? Number(worker.payrollSnapshot.salaryAmount) || 600 : worker.dailyRate || 600,
            days: worker.attendance.paidDays || 0,
            otHours: worker.attendance.overtimeHours || 0,
            holidayPay: worker.payrollSnapshot?.holidayPayAmount != null ? Number(worker.payrollSnapshot.holidayPayAmount) || 0 : 0,
            sssManual: employee?.sssAmount ?? 0,
            pagIbigManual: employee?.pagIbigAmount ?? 0,
            philHealthManual: employee?.philHealthAmount ?? 0,
            sssLoan: employee?.sssLoanAmount ?? 0,
            tax: employee?.taxAmount ?? 0,
            additionalDeduction: employee?.additionalDeductionAmount ?? 0,
            cashAdvance: worker.payrollSnapshot?.cashAdvance != null ? Number(worker.payrollSnapshot.cashAdvance) || 0 : 0,
            remarks: worker.remarks || "Synced from attendance",
            hasSss: employee?.hasSss ?? true,
            hasPagIbig: employee?.hasPagIbig ?? true,
            hasPhilHealth: employee?.hasPhilHealth ?? true,
            hasSssLoan: employee?.hasSssLoan ?? true,
            hasTax: employee?.hasTax ?? true,
            hasAdditionalDeduction: employee?.hasAdditionalDeduction ?? true,
            payrollSnapshot: worker.payrollSnapshot || null,
            syncedFromAttendance: true,
          };
        }),
      );
      setProjectName(`${selectedProject} Payroll`);
      notify("Payroll rows synced from attendance");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncingAttendance(false);
    }
  }

  async function applyPayrollEditsToAttendance() {
    const syncedRows = rows.filter((row) => row.employeeId && row.name.trim());
    if (syncedRows.length === 0) {
      notify("No synced payroll rows to apply");
      return;
    }

    setSavingOverrides(true);
    setError(null);

    try {
      for (const row of syncedRows) {
        const response = await fetch(`${API_BASE}/payroll/attendance-overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: row.employeeId,
            projectSite: selectedProject,
            startDate: periodStart,
            endDate: periodEnd,
            paidDaysOverride: row.days,
            overtimeHoursOverride: row.otHours,
            salaryAmount: row.dailyRate,
            otPay: computeRow(row, payFrequency).otPay,
            philhealthAmount: computeRow(row, payFrequency).philHealth,
            sssAmount: computeRow(row, payFrequency).sss,
            pagibigAmount: computeRow(row, payFrequency).pagIbig,
            totalSalary: computeRow(row, payFrequency).totalSalary,
            totalDeduction: computeRow(row, payFrequency).totalDeduction,
            netSalary: computeRow(row, payFrequency).netSalary,
            cashAdvance: row.cashAdvance,
            taxAmount: row.tax,
            additionalDeduction: row.additionalDeduction,
            remarks: row.remarks,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || `Failed to apply payroll override for ${row.name}`);
        }
      }

      notify("Payroll edits synced back to attendance-linked overrides");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingOverrides(false);
    }
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function duplicateRow(row: WorkerRow) {
    setRows((current) => [...current, normalizeRow({ ...row, id: crypto.randomUUID(), name: `${row.name}` })]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  }

  function clearPayroll() {
    setRows([]);
    notify("Payroll worksheet reset");
  }


  function triggerExcelImport() {
    importInputRef.current?.click();
  }

  async function handleExcelImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
    const getCell = (row: Record<string, unknown>, keys: string[], fallback = "") => {
      for (const key of keys) {
        const normalized = normalizeKey(key);
        for (const [cellKey, cellValue] of Object.entries(row)) {
          if (normalizeKey(cellKey) === normalized && cellValue !== undefined && cellValue !== null && cellValue !== "") {
            return cellValue;
          }
        }
      }
      return fallback;
    };
    const getNumber = (row: Record<string, unknown>, keys: string[], fallback = 0) => {
      const value = getCell(row, keys, String(fallback));
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const getBoolean = (row: Record<string, unknown>, keys: string[], fallback = true) => {
      const value = String(getCell(row, keys, fallback ? "true" : "false")).trim().toLowerCase();
      if (["true", "yes", "1", "y", "enabled"].includes(value)) return true;
      if (["false", "no", "0", "n", "disabled"].includes(value)) return false;
      return fallback;
    };

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Excel file has no worksheet");

      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (json.length === 0) throw new Error("No rows found in the Excel file");

      const importedRows = json.map((row) => normalizeRow({
        id: crypto.randomUUID(),
        employeeId: String(getCell(row, ["Employee ID", "EMPLOYEE ID", "employeeId", "employee_id"], "")).trim() || undefined,
        supervisor: String(getCell(row, ["Supervisor / Lead", "SUPERVISOR / LEAD", "Supervisor", "Lead", "SUPERVISOR"], "")).trim(),
        name: String(getCell(row, ["Worker name", "EMPLOYEE", "Employee", "Name", "FULL NAME", "Full Name"], "")).trim(),
        position: String(getCell(row, ["Position", "POSITION", "Job Position", "JOB POSITION"], "Labor")).trim() || "Labor",
        dailyRate: getNumber(row, ["Salary", "SALARY", "Daily Rate", "DAILY RATE", "Rate", "RATE"], 0),
        days: getNumber(row, ["Days", "DAYS", "Days worked", "NO. OF DAYS", "Days Worked", "PAID DAYS"], 0),
        otHours: getNumber(row, ["OT hrs", "OT HRS", "OT hours", "OT HOURS", "Overtime Hours", "OVERTIME HOURS"], 0),
        holidayPay: getNumber(row, ["Holiday pay", "HOLIDAY PAY", "Holiday", "HOLIDAY"], 0),
        cashAdvance: getNumber(row, ["CA", "Cash advance", "CASH ADVANCE", "Cash Advance"], 0),
        tax: getNumber(row, ["Tax", "TAX"], 0),
        sssLoan: getNumber(row, ["SSS LOAN", "Sss loan", "SSS Loan"], 0),
        philHealthManual: getNumber(row, ["PhilHealth", "PHILHEALTH", "Phil Health"], 0),
        pagIbigManual: getNumber(row, ["Pag-IBIG", "PAG-IBIG", "Pagibig", "PAGIBIG"], 0),
        sssManual: getNumber(row, ["SSS"], 0),
        additionalDeduction: getNumber(row, ["ADDITIONAL DEDUCTION", "Additional deduction", "OTHER DEDUCTION", "Other Deduction"], 0),
        remarks: String(getCell(row, ["Remarks", "REMARKS", "Notes", "NOTES"], "")).trim(),
        hasSss: getBoolean(row, ["Has SSS", "hasSss"], true),
        hasPagIbig: getBoolean(row, ["Has Pag-IBIG", "hasPagIbig"], true),
        hasPhilHealth: getBoolean(row, ["Has PhilHealth", "hasPhilHealth"], true),
        hasSssLoan: getBoolean(row, ["Has SSS Loan", "hasSssLoan"], true),
        hasTax: getBoolean(row, ["Has Tax", "hasTax"], true),
        hasAdditionalDeduction: getBoolean(row, ["Has Additional Deduction", "hasAdditionalDeduction"], true),
      }));

      setRows(importedRows);
      notify(`Imported ${importedRows.length} payroll row(s) from Excel`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handlePrint() {
    window.print();
  }

  function jumpToTable() {
    tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportExcel() {
    const escapeCell = (value: string | number) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const headers = [
      "NO",
      "EMPLOYEE",
      "POSITION",
      "SALARY",
      "DAYS",
      "AMOUNT",
      "OT HRS",
      "OT PAY",
      "HOLIDAY PAY",
      "TOTAL SALARY",
      "CA",
      "TAX",
      "SSS LOAN",
      "PHILHEALTH",
      "SSS",
      "PAG-IBIG",
      "ADDITIONAL DEDUCTION",
      "TOTAL DEDUCTION",
      "NET SALARY",
    ];

    const workerRows = rows
      .map((row, index) => {
        const computed = computeRow(row, payFrequency);
        const snapshot = row.payrollSnapshot;
        const cells = [
          index + 1,
          row.name,
          row.position,
          row.dailyRate,
          row.days,
          roundMoney(snapshot?.salaryAmount ?? computed.amount),
          row.otHours,
          roundMoney(snapshot?.otPay ?? computed.otPay),
          roundMoney(snapshot?.holidayPayAmount ?? computed.holidayPay),
          roundMoney(snapshot?.totalSalary ?? computed.totalSalary),
          roundMoney(snapshot?.cashAdvance ?? row.cashAdvance),
          roundMoney(snapshot?.taxAmount ?? row.tax),
          roundMoney(row.sssLoan),
          roundMoney(snapshot?.philHealthAmount ?? computed.philHealth),
          roundMoney(snapshot?.sssAmount ?? computed.sss),
          roundMoney(snapshot?.pagIbigAmount ?? computed.pagIbig),
          roundMoney(snapshot?.additionalDeduction ?? row.additionalDeduction),
          roundMoney(snapshot?.totalDeduction ?? computed.totalDeduction),
          Math.round(snapshot?.netSalary ?? computed.netSalary),
        ];

        return `<tr>${cells.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`;
      })
      .join("");

    const totalRow = [
      "TOTAL SALARY",
      "",
      "",
      "",
      "",
      roundMoney(totals.amount),
      "",
      roundMoney(totals.otPay),
      roundMoney(totals.holidayPay),
      roundMoney(totals.totalSalary),
      roundMoney(totals.cashAdvance),
      roundMoney(totals.tax),
      roundMoney(totals.sssLoan),
      roundMoney(totals.philHealth),
      roundMoney(totals.sss),
      roundMoney(totals.pagIbig),
      roundMoney(totals.additionalDeduction),
      roundMoney(totals.totalDeduction),
      Math.round(totals.netSalary),
    ];

    const worksheetHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Payroll</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; }
            th { background: #020617; color: #ffffff; font-weight: 700; }
            .deduction { background: #4c0519; color: #ffffff; }
            .title { border: 0; font-size: 16px; font-weight: 700; }
            .meta { border: 0; font-weight: 700; }
            .total td { background: #e2e8f0; font-weight: 700; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="title" colspan="19">${escapeCell(projectName)}</td></tr>
            <tr><td class="meta" colspan="19">PAYROLL COVERED: ${escapeCell(coveredPeriod)}</td></tr>
            <tr><td class="meta" colspan="19">PAYROLL DATE: ${escapeCell(payrollDate)}</td></tr>
            <tr><td class="meta" colspan="19">DEDUCTION SCHEDULE: ${escapeCell(frequencyConfig[payFrequency].label)}</td></tr>
            <tr></tr>
            <tr>${headers.map((header, index) => `<th class="${index >= 10 && index <= 17 ? "deduction" : ""}">${escapeCell(header)}</th>`).join("")}</tr>
            ${workerRows}
            <tr class="total">${totalRow.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>
            <tr></tr>
            <tr><td class="meta" colspan="6">PREPARED BY: ${escapeCell(preparedBy)}</td><td class="meta" colspan="6">NOTED BY: ${escapeCell(notedBy)}</td><td class="meta" colspan="7">APPROVED BY: ${escapeCell(approvedBy)}</td></tr>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([worksheetHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileNameBase = sanitizeFileName(exportFileName) || `${payFrequency}-payroll`;
    link.href = url;
    link.download = `${fileNameBase}-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Payroll Excel file exported");
  }

  const worksheet = (
    <section className="payroll-print-sheet flex h-full min-h-0 flex-col bg-white print:block">
      <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-3 backdrop-blur print:border-0 print:bg-white print:p-0">
        <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_560px] 2xl:items-start">
          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow">Payroll sheet</p>
                  <h3 className="mt-2 break-words text-2xl font-black text-slate-950">{selectedProject} payroll workspace</h3>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Review project workers, payroll dates, and attendance-linked values before editing the table below.
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {selectedDepartment ? `Department: ${selectedDepartment}` : "Department not selected"}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Covered period</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{coveredPeriod}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Rows ready</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{filledRows || rows.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Attendance sync</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{syncedRows} linked</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_1fr]">
            <label className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 print:text-slate-700">Payroll covered</span>
              <input
                value={coveredPeriod}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-black tracking-tight text-slate-950 print:border-0 print:px-0"
              />
            </label>
            <label className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Project / company</span>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-600 print:border-0 print:bg-white print:px-0"
              />
            </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <label className="block rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Project location</span>
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              >
                {projects.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
              <p className="mt-1 text-xs font-semibold text-slate-500">Attendance-linked workers and days will refresh for the selected site.</p>
            </label>
            <label className="block rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Payroll date</span>
              <input
                value={payrollDate}
                onChange={(event) => setPayrollDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              />
            </label>
            <label className="block rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Deduction schedule</span>
              <select
                value={payFrequency}
                onChange={(event) => setPayFrequency(event.target.value as PayFrequency)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              >
                {Object.entries(frequencyConfig).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </label>
            <label className="block rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Period start</span>
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              />
            </label>
            <label className="block rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Period end</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              />
            </label>
            <div className="flex items-end">
              <button onClick={syncPayrollFromAttendance} type="button" className="mt-1 w-full rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-lg shadow-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canSyncAttendance}>
                {syncingAttendance ? "Syncing..." : "Sync from attendance"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Project</p>
            <p className="mt-1 text-sm font-black text-slate-950">{selectedProject}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Current payroll location</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Workers</p>
            <p className="mt-1 text-sm font-black text-slate-950">{filledRows || rows.length}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Editable payroll rows</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Gov deductions</p>
            <p className="mt-1 text-sm font-black text-slate-950">{money(totals.sss + totals.pagIbig + totals.philHealth)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{frequencyConfig[payFrequency].description}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Net release</p>
            <p className="mt-1 text-sm font-black text-emerald-700">{moneyWhole(totals.netSalary)}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">Ready for payroll release</p>
          </div>
        </div>
      </div>

      <div ref={tableSectionRef} className="min-h-0 flex-1 overflow-auto print:overflow-visible">
          <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Payroll table</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">This is the full editable payroll view. Each worker is shown in a readable full-detail layout so you can see and edit every field directly without cramped columns.</p>
            </div>
            <button onClick={addRow} type="button" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm ring-1 ring-blue-100">Add row</button>
          </div>

          <div className="space-y-4 print:hidden xl:hidden">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-black">Mobile payroll editor</p>
              <p className="mt-1">Use these worker cards to edit payroll on smaller screens. Every row stays visible in a readable stacked format instead of a compressed spreadsheet line.</p>
            </div>

            {rows.map((row, index) => {
              const computed = computeRow(row, payFrequency);
              return (
                <article key={row.id} className={`rounded-[1.5rem] border p-4 shadow-sm ${row.syncedFromAttendance ? "border-cyan-100 bg-cyan-50/40" : "border-slate-100 bg-white"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Row {index + 1}</span>
                        {row.syncedFromAttendance && <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">Attendance synced</span>}
                      </div>
                      <p className="mt-2 text-lg font-black text-slate-950">{row.name || "New worker row"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{row.position || "Labor"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setActiveRowId(row.id)} className={`${toolButtonClass} bg-slate-900 text-white hover:bg-blue-700 hover:text-white`}>Edit full details</button>
                      <button type="button" onClick={() => duplicateRow(row)} className={toolButtonClass}>Copy</button>
                      <button type="button" onClick={() => removeRow(row.id)} className="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100">Remove</button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Supervisor / lead</span>
                      <input value={row.supervisor} onChange={(event) => updateRow(row.id, { supervisor: event.target.value })} className={`${inputClass} mt-1`} placeholder="Lead person" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worker name</span>
                      <input list="employee-options" value={row.name} onChange={(event) => selectEmployee(row.id, event.target.value)} className={`${inputClass} mt-1`} placeholder="Worker name" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Position</span>
                      <input value={row.position} onChange={(event) => updateRow(row.id, { position: event.target.value })} className={`${inputClass} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Daily rate</span>
                      <input type="number" value={row.dailyRate} onChange={(event) => updateRow(row.id, { dailyRate: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">No. of days</span>
                      <input type="number" step="0.1" value={row.days} onChange={(event) => updateRow(row.id, { days: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT hours</span>
                      <input type="number" step="0.5" value={row.otHours} onChange={(event) => updateRow(row.id, { otHours: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block sm:col-span-2 xl:col-span-1 rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Holiday pay</span>
                      <input type="number" value={row.holidayPay} onChange={(event) => updateRow(row.id, { holidayPay: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash advance</span>
                      <input type="number" value={row.cashAdvance} onChange={(event) => updateRow(row.id, { cashAdvance: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tax</span>
                      <input type="number" value={row.tax} onChange={(event) => updateRow(row.id, { tax: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block sm:col-span-2 xl:col-span-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Additional deduction</span>
                      <input type="number" value={row.additionalDeduction} onChange={(event) => updateRow(row.id, { additionalDeduction: numberValue(event.target.value) })} className={`${numberInputClass} mt-1`} />
                    </label>
                    <label className="block sm:col-span-2 xl:col-span-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remarks</span>
                      <input value={row.remarks} onChange={(event) => updateRow(row.id, { remarks: event.target.value })} className={`${inputClass} mt-1`} placeholder="Notes / balance" />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{money(computed.amount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT pay</p>
                <p className="mt-1 text-sm font-black text-slate-950">{money(computed.otPay)}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Holiday pay</p>
                <p className="mt-1 text-sm font-black text-amber-700">{money(computed.holidayPay)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p>
                <p className="mt-1 text-sm font-black text-slate-950">{money(computed.totalSalary)}</p>
              </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Net salary</p>
                      <p className="mt-1 text-sm font-black text-emerald-700">{moneyWhole(computed.netSalary)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden xl:block space-y-4 print:hidden">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-black">Full payroll details view</p>
              <p className="mt-1">Every row is shown in a stacked layout so all details are visible at once without horizontal scrolling.</p>
            </div>

            {rows.map((row, index) => {
              const computed = computeRow(row, payFrequency);
              return (
                <article key={row.id} className={`rounded-[1.5rem] border p-5 shadow-sm ${row.syncedFromAttendance ? "border-cyan-100 bg-cyan-50/40" : "border-slate-100 bg-white"}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Row {index + 1}</span>
                        {row.syncedFromAttendance && <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">Attendance synced</span>}
                      </div>
                      <p className="mt-2 text-xl font-black text-slate-950">{row.name || "New worker row"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{row.position || "Labor"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setActiveRowId(row.id)} className={`${toolButtonClass} bg-slate-900 text-white hover:bg-blue-700 hover:text-white`}>Edit full details</button>
                      <button type="button" onClick={() => duplicateRow(row)} className={toolButtonClass}>Copy</button>
                      <button type="button" onClick={() => removeRow(row.id)} className="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100">Remove</button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
                    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worker information</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Supervisor / lead</span>
                          <input value={row.supervisor} onChange={(event) => updateRow(row.id, { supervisor: event.target.value })} className={`${tableInputClass} mt-1`} placeholder="Lead person" />
                        </label>
                        <label className="block md:col-span-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worker name</span>
                          <input list="employee-options" value={row.name} onChange={(event) => selectEmployee(row.id, event.target.value)} className={`${tableInputClass} mt-1`} placeholder="Worker name" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Position</span>
                          <input value={row.position} onChange={(event) => updateRow(row.id, { position: event.target.value })} className={`${tableInputClass} mt-1`} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Salary / daily rate</span>
                          <input type="number" value={row.dailyRate} onChange={(event) => updateRow(row.id, { dailyRate: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Days worked</span>
                          <input type="number" step="0.1" value={row.days} onChange={(event) => updateRow(row.id, { days: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT hours</span>
                          <input type="number" step="0.5" value={row.otHours} onChange={(event) => updateRow(row.id, { otHours: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Holiday pay</span>
                          <input type="number" value={row.holidayPay} onChange={(event) => updateRow(row.id, { holidayPay: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">PhilHealth</span>
                          <input type="number" value={row.philHealthManual ?? 0} onChange={(event) => updateRow(row.id, { philHealthManual: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Pag-IBIG</span>
                          <input type="number" value={row.pagIbigManual ?? 0} onChange={(event) => updateRow(row.id, { pagIbigManual: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">SSS</span>
                          <input type="number" value={row.sssManual ?? 0} onChange={(event) => updateRow(row.id, { sssManual: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:col-span-2 xl:col-span-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">SSS loan</span>
                          <input type="number" value={row.sssLoan} onChange={(event) => updateRow(row.id, { sssLoan: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:col-span-2 xl:col-span-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Additional deduction</span>
                          <input type="number" value={row.additionalDeduction} onChange={(event) => updateRow(row.id, { additionalDeduction: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash advance</span>
                          <input type="number" value={row.cashAdvance} onChange={(event) => updateRow(row.id, { cashAdvance: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tax</span>
                          <input type="number" value={row.tax} onChange={(event) => updateRow(row.id, { tax: numberValue(event.target.value) })} className={`${tableNumberInputClass} mt-1`} />
                        </label>

                        <label className="block xl:col-span-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remarks</span>
                          <textarea value={row.remarks} onChange={(event) => updateRow(row.id, { remarks: event.target.value })} className={`${tableInputClass} mt-1 min-h-[96px]`} placeholder="Notes / balance / sync details" />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Computed values</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Amount</p><p className="mt-2 text-lg font-black text-slate-950">{money(computed.amount)}</p></div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT pay</p><p className="mt-2 text-lg font-black text-slate-950">{money(computed.otPay)}</p></div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Holiday pay</p><p className="mt-2 text-lg font-black text-amber-700">{money(computed.holidayPay)}</p></div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p><p className="mt-2 text-lg font-black text-slate-950">{money(computed.totalSalary)}</p></div>
                        <div className="rounded-2xl border border-slate-100 bg-rose-50/70 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">PhilHealth</p><p className="mt-2 text-lg font-black text-rose-700">{money(computed.philHealth)}</p></div>
                        <div className="rounded-2xl border border-slate-100 bg-rose-50/70 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Pag-IBIG</p><p className="mt-2 text-lg font-black text-rose-700">{money(computed.pagIbig)}</p></div>
                        <div className="rounded-2xl border border-slate-100 bg-rose-50/70 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">SSS</p><p className="mt-2 text-lg font-black text-rose-700">{money(computed.sss)}</p></div>
                        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Total deduction</p><p className="mt-2 text-lg font-black text-rose-700">{money(computed.totalDeduction)}</p></div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Net salary</p><p className="mt-2 text-lg font-black text-emerald-700">{money(computed.netSalary)}</p></div>
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden print:block">
          <table className="payroll-print-table min-w-[2420px] border-collapse text-left text-sm print:min-w-0 print:text-[7px]">
            <thead className="sticky top-0 z-30 print:static">
              <tr className="bg-slate-950 text-white">
                <th className="w-14 px-3 py-3 text-center text-[11px] font-black">No.</th>
                <th className="w-64 px-3 py-3 text-[11px] font-black">Supervisor / Lead</th>
                <th className="w-80 px-3 py-3 text-[11px] font-black">Worker name</th>
                <th className="w-52 px-3 py-3 text-[11px] font-black">Position</th>
                <th className="w-36 px-3 py-3 text-right text-[11px] font-black">Salary</th>
                <th className="w-28 px-3 py-3 text-right text-[11px] font-black">Days</th>
                <th className="w-36 px-3 py-3 text-right text-[11px] font-black">Amount</th>
                <th className="w-28 px-3 py-3 text-right text-[11px] font-black">OT hrs</th>
                <th className="w-36 px-3 py-3 text-right text-[11px] font-black">OT pay</th>
                <th className="w-40 px-3 py-3 text-right text-[11px] font-black">Total salary</th>
                <th className="w-32 px-3 py-3 text-right text-[11px] font-black">Cash advance</th>
                <th className="w-36 px-3 py-3 text-right text-[11px] font-black">PhilHealth</th>
                <th className="w-28 px-3 py-3 text-right text-[11px] font-black">Tax</th>
                <th className="w-32 px-3 py-3 text-right text-[11px] font-black">Pag-IBIG</th>
                <th className="w-32 px-3 py-3 text-right text-[11px] font-black">SSS</th>
                <th className="w-44 px-3 py-3 text-right text-[11px] font-black">Additional deduction</th>
                <th className="w-40 px-3 py-3 text-right text-[11px] font-black">Total deduction</th>
                <th className="w-40 px-3 py-3 text-right text-[11px] font-black">Net salary</th>
                <th className="w-44 px-3 py-3 text-[11px] font-black">Signature</th>
                <th className="w-80 px-3 py-3 text-[11px] font-black">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const computed = computeRow(row, payFrequency);
                return (
                  <tr key={row.id} className="border-b border-slate-100 align-top bg-white">
                    <td className="px-3 py-3 text-center text-xs font-black text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{row.supervisor || "-"}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{row.name || "-"}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{row.position || "-"}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(row.dailyRate)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{row.days}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.amount)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{row.otHours}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.otPay)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.totalSalary)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(row.cashAdvance)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.philHealth)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(row.tax)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.pagIbig)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(computed.sss)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black">{money(row.additionalDeduction)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-red-700">{money(computed.totalDeduction)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-emerald-700">{moneyWhole(computed.netSalary)}</td>
                    <td className="px-3 py-3"><div className="h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50" /></td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{row.remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="print:static">
              <tr className="bg-slate-100 text-slate-950">
                <td colSpan={6} className="px-3 py-4 text-right text-sm font-black uppercase tracking-[0.16em]">Total salary</td>
                <td className="px-3 py-4 text-right font-black tabular-nums">{money(totals.amount)}</td>
                <td />
                <td className="px-3 py-4 text-right font-black tabular-nums">{money(totals.otPay)}</td>
                <td className="px-3 py-4 text-right font-black tabular-nums">{money(totals.totalSalary)}</td>
                <td />
                <td className="px-3 py-4 text-right font-black tabular-nums text-red-700">{money(totals.philHealth)}</td>
                <td />
                <td className="px-3 py-4 text-right font-black tabular-nums text-red-700">{money(totals.pagIbig)}</td>
                <td className="px-3 py-4 text-right font-black tabular-nums text-red-700">{money(totals.sss)}</td>
                <td />
                <td className="px-3 py-4 text-right font-black tabular-nums text-red-700">{money(totals.totalDeduction)}</td>
                <td className="px-3 py-4 text-right font-black tabular-nums text-emerald-700">{money(totals.netSalary)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          </div>
      </div>

      <datalist id="employee-options">
        {employees.map((employee) => <option key={employee.id} value={employee.fullName} />)}
      </datalist>

      <details className="shrink-0 border-t border-slate-200 bg-white print:block print:border-0" open={false}>
        <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 print:hidden">
          Signatories
        </summary>
        <div className="grid gap-2 p-2 pt-0 lg:grid-cols-3 print:p-0">
          <label className="block rounded-lg border border-slate-100 bg-slate-50 p-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Prepared by</span>
            <input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700" />
          </label>
          <label className="block rounded-lg border border-slate-100 bg-slate-50 p-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Noted by</span>
            <input value={notedBy} onChange={(event) => setNotedBy(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700" />
          </label>
          <label className="block rounded-lg border border-slate-100 bg-slate-50 p-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Approved by</span>
            <input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700" />
          </label>
        </div>
      </details>
    </section>
  );

  return (
    <div className="page-shell print:bg-white">
      <section className="hero-panel print:hidden">
        <div className="grid min-w-0 gap-8 2xl:grid-cols-[1.25fr_0.75fr] 2xl:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Payroll calculation</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Excel-like payroll opens in a focused editing tab.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              SSS, Pag-IBIG, and PhilHealth are computed automatically from each worker&apos;s gross salary and the selected deduction schedule, while each payroll row stays fully visible in the editor.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => setIsWorksheetOpen(true)} className="primary-button" type="button">Edit payroll table</button>
              <button onClick={syncPayrollFromAttendance} type="button" className="secondary-button">{syncingAttendance ? "Syncing..." : "Sync from attendance"}</button>
              <button onClick={savePayrollTable} type="button" className="secondary-button" disabled={savingPayrollTable}>{savingPayrollTable ? "Saving..." : "Save payroll table"}</button>
              <button onClick={triggerExcelImport} type="button" className="secondary-button">Insert Excel</button>
              <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
              <button onClick={applyPayrollEditsToAttendance} className="secondary-button" type="button">{savingOverrides ? "Applying..." : "Apply edits to attendance"}</button>
              <button onClick={addRow} className="secondary-button" type="button">Add worker row</button>
              <Link href="/payroll" className="secondary-button">Back to payroll center</Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">Net salary for release</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
            </div>
            <p className="mt-5 break-words text-4xl font-black sm:text-5xl">{moneyWhole(totals.netSalary)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Project: {selectedProject}. Deduction schedule: {frequencyConfig[payFrequency].label}. Employee records loaded: {loadingEmployees ? "..." : employees.length}.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">Attendance sync</p>
                <p className="mt-1 text-lg font-black text-white">{syncedRows} linked rows</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">Gross payroll</p>
                <p className="mt-1 text-lg font-black text-white">{money(totals.totalSalary)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 print:hidden">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4 print:hidden">
        {stats.map((stat) => (
          <article key={stat.label} className="metric-card">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500">{stat.label}</p>
                <p className="mt-3 break-words text-2xl font-black text-slate-950">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{stat.detail}</p>
              </div>
              <span className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${stat.tone}`}>PHP</span>
            </div>
          </article>
        ))}
      </section>

      <section className="section-card print:hidden">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <p className="eyebrow">Worksheet ready</p>
            <h3 className="mt-2 break-words text-2xl font-black text-slate-950">Review the payroll first, then open the full-detail editor</h3>
            <p className="mt-2 text-sm text-slate-500">
              Open the payroll workspace to edit each worker in a readable full-detail layout instead of compressed spreadsheet cells.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end 2xl:justify-end">
            <button onClick={() => setIsWorksheetOpen(true)} type="button" className="primary-button">Open full-detail editor</button>
            <button onClick={syncPayrollFromAttendance} type="button" className="secondary-button" disabled={!canSyncAttendance}>{syncingAttendance ? "Syncing..." : "Sync from attendance"}</button>
            <button onClick={savePayrollTable} type="button" className="secondary-button" disabled={savingPayrollTable}>{savingPayrollTable ? "Saving..." : "Save payroll table"}</button>
            <button onClick={triggerExcelImport} type="button" className="secondary-button">Insert Excel</button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
            <button onClick={applyPayrollEditsToAttendance} type="button" className="secondary-button">{savingOverrides ? "Applying..." : "Apply edits to attendance"}</button>
            <label className="flex min-w-[240px] flex-col gap-1.5 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Export file name</span>
              <input
                type="text"
                value={exportFileName}
                onChange={(event) => setExportFileName(event.target.value)}
                className={inputClass}
                placeholder="weekly-payroll"
              />
            </label>
            <button onClick={exportExcel} type="button" className="secondary-button">Export Excel</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Payroll row preview</p>
                <p className="mt-1 text-sm text-slate-500">A quick view of the current payroll before opening the full-detail editor.</p>
              </div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{filledRows || rows.length} row(s)</span>
            </div>

            <div className="mt-4 space-y-3">
              {previewRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  No named payroll rows yet. Sync from attendance or add worker rows, then open the editor.
                </div>
              ) : (
                previewRows.map((row) => {
                  const computed = computeRow(row, payFrequency);
                  return (
                    <div key={row.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-black text-slate-950">{row.name}</p>
                            {row.syncedFromAttendance && <span className="inline-flex rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">Attendance synced</span>}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{row.position || "Labor"} · {row.days} day(s) · {row.otHours} OT hour(s)</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Net salary</p>
                          <p className="mt-1 text-lg font-black text-emerald-700">{moneyWhole(computed.netSalary)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-950">Editor actions</p>
            <p className="mt-1 text-sm text-slate-500">Open the payroll workspace when you need full row-by-row editing with every detail visible.</p>
            <div className="mt-4 grid gap-3">
              <button onClick={() => setIsWorksheetOpen(true)} type="button" className="primary-button w-full">Open full-detail editor</button>
              <button onClick={addRow} type="button" className="secondary-button w-full">Add worker row</button>
              <button onClick={handlePrint} type="button" className="secondary-button w-full">Print payroll</button>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }

          html,
          body {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }

          body * {
            visibility: hidden !important;
          }

          .payroll-print-root,
          .payroll-print-root * {
            visibility: visible !important;
          }

          .payroll-print-root {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            height: auto !important;
          }

          .payroll-print-sheet {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          .payroll-print-table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          .payroll-print-table th,
          .payroll-print-table td {
            padding: 3px 4px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }

          .payroll-print-table input,
          .payroll-print-sheet input,
          .payroll-print-sheet select {
            border: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            font-size: inherit !important;
            min-width: 0 !important;
          }

          .payroll-print-sheet details {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {isWorksheetOpen && (
        <div className="payroll-print-root fixed inset-0 z-50 bg-slate-950/60 p-2 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl print:block print:rounded-none print:border-0 print:shadow-none">
            <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Payroll worksheet</p>
                <h3 className="break-words pr-2 text-base font-black text-slate-950">Full-detail payroll editor</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={jumpToTable} type="button" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">Go to rows</button>
                <button onClick={syncPayrollFromAttendance} type="button" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm">{syncingAttendance ? "Syncing..." : "Sync attendance"}</button>
                <button onClick={savePayrollTable} type="button" className={toolButtonClass}>{savingPayrollTable ? "Saving..." : "Save table"}</button>
                <button onClick={triggerExcelImport} type="button" className={toolButtonClass}>Insert Excel</button>
                <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
                <button onClick={applyPayrollEditsToAttendance} type="button" className={toolButtonClass}>{savingOverrides ? "Applying..." : "Apply to attendance"}</button>
                <button onClick={addRow} type="button" className={toolButtonClass}>Add row</button>
                <button onClick={exportExcel} type="button" className={toolButtonClass}>Export Excel</button>
                <button onClick={handlePrint} type="button" className={toolButtonClass}>Print</button>
                <button onClick={clearPayroll} type="button" className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Reset</button>
                <button onClick={() => setIsWorksheetOpen(false)} type="button" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">Close</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden bg-white print:block print:overflow-visible">
              {worksheet}
            </div>
          </div>
        </div>
      )}

      {activeRow && (
          <div className="fixed inset-0 z-[80] bg-slate-950/70 p-3 backdrop-blur-sm">
            <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Payroll row editor</p>
                  <h3 className="mt-1 break-words text-xl font-black text-slate-950">{activeRow.name || `Worker row ${rows.findIndex((row) => row.id === activeRow.id) + 1}`}</h3>
                  <p className="mt-1 text-sm text-slate-500">Open every field clearly here, then close when done editing.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveActiveRow()} disabled={savingRowId === activeRow.id} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">{savingRowId === activeRow.id ? "Saving..." : "Save row"}</button>
                  <button type="button" onClick={() => duplicateRow(activeRow)} className={toolButtonClass}>Copy row</button>
                  <button type="button" onClick={() => setActiveRowId(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Done</button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-5">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Worker details</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Supervisor / lead</span>
                        <input value={activeRow.supervisor} onChange={(event) => updateRow(activeRow.id, { supervisor: event.target.value })} className={`${inputClass} mt-1 text-sm`} placeholder="Lead person" />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Worker name</span>
                        <input list="employee-options" value={activeRow.name} onChange={(event) => selectEmployee(activeRow.id, event.target.value)} className={`${inputClass} mt-1 text-sm`} placeholder="Worker name" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Position</span>
                        <input value={activeRow.position} onChange={(event) => updateRow(activeRow.id, { position: event.target.value })} className={`${inputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Daily rate</span>
                        <input type="number" value={activeRow.dailyRate} onChange={(event) => updateRow(activeRow.id, { dailyRate: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">No. of days</span>
                        <input type="number" step="0.1" value={activeRow.days} onChange={(event) => updateRow(activeRow.id, { days: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT hours</span>
                        <input type="number" step="0.5" value={activeRow.otHours} onChange={(event) => updateRow(activeRow.id, { otHours: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button type="button" onClick={() => void saveActiveRow()} disabled={savingRowId === activeRow.id} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                        {savingRowId === activeRow.id ? "Saving..." : "Save worker info"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Deductions and notes</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash advance</span>
                        <input type="number" value={activeRow.cashAdvance} onChange={(event) => updateRow(activeRow.id, { cashAdvance: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tax</span>
                        <input type="number" value={activeRow.tax} onChange={(event) => updateRow(activeRow.id, { tax: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Additional deduction</span>
                        <input type="number" value={activeRow.additionalDeduction} onChange={(event) => updateRow(activeRow.id, { additionalDeduction: numberValue(event.target.value) })} className={`${numberInputClass} mt-1 text-sm`} />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Remarks</span>
                        <textarea value={activeRow.remarks} onChange={(event) => updateRow(activeRow.id, { remarks: event.target.value })} className={`${inputClass} mt-1 min-h-[120px] text-sm`} placeholder="Notes / balance / sync remarks" />
                      </label>
                    </div>
                  </section>
                </div>

                <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Computed payroll summary</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {(() => {
                      const computed = computeRow(activeRow, payFrequency);
                      return (
                        <>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{money(computed.amount)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT pay</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{money(computed.otPay)}</p>
                          </div>
                          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Additional deduction</p>
                            <p className="mt-2 text-lg font-black text-rose-700">{money(computed.additionalDeduction)}</p>
                          </div>
                          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Total deduction</p>
                            <p className="mt-2 text-lg font-black text-rose-700">{money(computed.totalDeduction)}</p>
                          </div>
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Net salary</p>
                            <p className="mt-2 text-lg font-black text-emerald-700">{moneyWhole(computed.netSalary)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">PhilHealth</p>
                            <p className="mt-2 text-base font-black text-slate-950">{money(computed.philHealth)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pag-IBIG</p>
                            <p className="mt-2 text-base font-black text-slate-950">{money(computed.pagIbig)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SSS</p>
                            <p className="mt-2 text-base font-black text-slate-950">{money(computed.sss)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p>
                            <p className="mt-2 text-base font-black text-slate-950">{money(computed.totalSalary)}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
