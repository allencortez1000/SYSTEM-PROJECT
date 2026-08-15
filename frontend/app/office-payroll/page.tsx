"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

import { useNotification } from "../components/notification";
import { filterInputClassName, filterSelectCompactClassName } from "../components/filter-config";

type SessionUser = {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
};

type Employee = {
  id: string;
  employeeId?: string;
  fullName: string;
  department?: string;
  projectSite?: string | null;
  position?: string;
  status?: string;
  salary?: number | null;
  hasSss?: boolean;
  hasPagIbig?: boolean;
  hasPhilHealth?: boolean;
  sssAmount?: number | null;
  pagIbigAmount?: number | null;
  philHealthAmount?: number | null;
  taxAmount?: number | null;
  additionalDeductionAmount?: number | null;
};

const API_BASE = "/api";

type OfficePayrollRow = {
  id: string;
  employeeId?: string;
  name: string;
  department: string;
  position: string;
  monthlySalary: number;
  days: number;
  holiday: number;
  sil: number;
  lateMinutes: number;
  otHours: number;
  bonus: number;
  allowances: number;
  cashAdvance: number;
  cashAdvanceDeduction: number;

  tax: number;
  amicaCredits: number;
  sssLoan: number;
  pagIbigLoan: number;
  remarks: string;
  hasSss: boolean;
  hasPagIbig: boolean;
  hasPhilHealth: boolean;
  sssAmount: number;
  pagIbigAmount: number;
  philHealthAmount: number;
  additionalDeduction: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function moneyWhole(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function round2(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function computeRow(row: OfficePayrollRow) {
  const dailyRate = row.monthlySalary / 26;
  const holidayDays = Number(row.holiday) || 0;
  const silDays = Number(row.sil) || 0;
  const lateDays = (Number(row.lateMinutes) || 0) / 480;
  const effectiveDays = Math.max(0, (Number(row.days) || 0) + holidayDays + silDays - lateDays);
  const proratedAmount = dailyRate * effectiveDays;
  const otPay = (dailyRate / 8) * 1.25 * row.otHours;
  const gross = proratedAmount + otPay + row.bonus + row.allowances;
  const sss = Number(row.sssAmount) || 0;
  const pagIbig = Number(row.pagIbigAmount) || 0;
  const philHealth = Number(row.philHealthAmount) || 0;
  const cashAdvance = Number(row.cashAdvance) || 0;
  const cashAdvanceDeduction = Number(row.cashAdvanceDeduction) || 0;
  const cashBalance = Math.max(0, cashAdvance - cashAdvanceDeduction);
  const totalDeduction =
    sss +
    pagIbig +
    philHealth +
    row.tax +
    row.sssLoan +
    row.pagIbigLoan +
    row.amicaCredits +
    row.additionalDeduction +
    cashAdvanceDeduction;
  const netSalary = gross - totalDeduction;
  return { dailyRate, effectiveDays, proratedAmount, otPay, gross, sss, pagIbig, philHealth, cashAdvance, cashAdvanceDeduction, cashBalance, totalDeduction, netSalary };
}

export default function OfficePayrollPage() {
  const { notify } = useNotification();
  const searchParams = useSearchParams();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoadedPayoutDateRef = useRef<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentSort, setDepartmentSort] = useState("All");

  const [tableSort, setTableSort] = useState<{ field: "department"; direction: "asc" | "desc" }>({
    field: "department",
    direction: "asc",
  });
  const [payPeriod, setPayPeriod] = useState("Monthly");
  const [payoutDate, setPayoutDate] = useState(searchParams.get("payoutDate") || "");
  const [rows, setRows] = useState<OfficePayrollRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    const urlPayoutDate = searchParams.get("payoutDate") || "";
    if (urlPayoutDate) {
      setPayoutDate(urlPayoutDate);
    }
  }, [searchParams]);

  useEffect(() => {
    const raw = localStorage.getItem("hr_user");
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "super-admin") return;

    async function loadEmployees() {
      try {
        setError(null);
        const token = localStorage.getItem("hr_token");
        const res = await fetch(`${API_BASE}/employees?limit=0`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load employees");
        }

        const list = Array.isArray(data?.employees) ? data.employees : [];
        const mainOfficeEmployees: Employee[] = list
          .map((employee: any): Employee => ({
            id: String(employee.id),
            employeeId: String(employee.employeeId || employee.employee_no || ""),
            fullName: String(employee.fullName || employee.full_name || "").trim(),
            department: String(employee.department || "").trim(),
            projectSite: employee.projectSite || employee.project_site || null,
            position: String(employee.position || "").trim(),
            status: String(employee.status || "Active").trim(),
            salary: Number(employee.salary || 0) || 0,
            hasSss: Boolean(employee.hasSss ?? employee.has_sss ?? true),
            hasPagIbig: Boolean(employee.hasPagIbig ?? employee.has_pagibig ?? true),
            hasPhilHealth: Boolean(employee.hasPhilHealth ?? employee.has_philhealth ?? true),
            sssAmount: Number(employee.sssAmount ?? employee.sss_amount ?? 0) || 0,
            pagIbigAmount: Number(employee.pagIbigAmount ?? employee.pagibig_amount ?? 0) || 0,
            philHealthAmount: Number(employee.philHealthAmount ?? employee.philhealth_amount ?? 0) || 0,
            taxAmount: Number(employee.taxAmount ?? employee.tax_amount ?? 0) || 0,
            additionalDeductionAmount: Number(employee.additionalDeductionAmount ?? employee.additional_deduction_amount ?? 0) || 0,
          }))
          .filter((employee: Employee) => employee.fullName && String(employee.projectSite || "").trim().toLowerCase() === "main office");

        setEmployees(mainOfficeEmployees);
        setRows(
          mainOfficeEmployees.map((employee) => ({
            id: employee.id,
            employeeId: employee.employeeId,
            name: employee.fullName,
            department: employee.department || "Unassigned",
            position: employee.position || "Employee",
            monthlySalary: Number(employee.salary || 0) || 0,
            days: 0,
            holiday: 0,
            sil: 0,
            lateMinutes: 0,
            otHours: 0,
            bonus: 0,
            allowances: 0,
            cashAdvance: 0,
            cashAdvanceDeduction: 0,

            tax: Number(employee.taxAmount || 0) || 0,
            amicaCredits: 0,
            sssLoan: 0,
            pagIbigLoan: 0,
            remarks: "",
            hasSss: employee.hasSss ?? true,
            hasPagIbig: employee.hasPagIbig ?? true,
            hasPhilHealth: employee.hasPhilHealth ?? true,
            sssAmount: Number(employee.sssAmount || 0) || 0,
            pagIbigAmount: Number(employee.pagIbigAmount || 0) || 0,
            philHealthAmount: Number(employee.philHealthAmount || 0) || 0,
            additionalDeduction: Number(employee.additionalDeductionAmount || 0) || 0,
          })),
        );
      } catch (err) {
        setError((err as Error).message);
      }
    }

    void loadEmployees();
  }, [user?.role]);

  useEffect(() => {
    if (employees.length === 0 || rows.length === 0) return;

    const employeeMap = new Map(employees.map((employee) => [String(employee.id), employee]));
    setRows((currentRows) =>
      currentRows.map((row) => {
        const employee = employeeMap.get(String(row.employeeId || ""))
          || employees.find((item) => item.fullName.toLowerCase() === row.name.toLowerCase());
        if (!employee) return row;
        return {
          ...row,
          sssAmount: Number(employee.sssAmount ?? row.sssAmount) || row.sssAmount,
          pagIbigAmount: Number(employee.pagIbigAmount ?? row.pagIbigAmount) || row.pagIbigAmount,
          philHealthAmount: Number(employee.philHealthAmount ?? row.philHealthAmount) || row.philHealthAmount,
        };
      }),
    );
  }, [employees]);

  useEffect(() => {
    if (!payoutDate || employees.length === 0 || rows.length === 0) return;
    if (autoLoadedPayoutDateRef.current === payoutDate) return;

    autoLoadedPayoutDateRef.current = payoutDate;
    void loadPayrollByPayoutDate();
  }, [payoutDate, employees.length, rows.length]);

  const isSuperAdmin = user?.role === "super-admin";

  const officeEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const isMainOffice = String(employee.projectSite || "").trim().toLowerCase() === "main office";
      const matchesQuery =
        !query ||
        employee.fullName.toLowerCase().includes(query) ||
        String(employee.employeeId || "").toLowerCase().includes(query) ||
        String(employee.department || "").toLowerCase().includes(query) ||
        String(employee.position || "").toLowerCase().includes(query);
      const matchesDepartment = departmentSort === "All" || String(employee.department || "").trim().toLowerCase() === departmentSort.toLowerCase();
      const isActive = String(employee.status || "").trim().toLowerCase() === "active";
      return isMainOffice && matchesQuery && matchesDepartment && isActive;
    });
  }, [employees, searchQuery, departmentSort]);

  const sortedOfficeEmployees = useMemo(() => {
    return [...officeEmployees].sort((a, b) => {
      const departmentCompare = String(a.department || "").localeCompare(String(b.department || ""));
      if (departmentCompare !== 0) return tableSort.direction === "asc" ? departmentCompare : -departmentCompare;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [officeEmployees, tableSort]);

  const totals = useMemo(() => sortedOfficeEmployees.reduce((accumulator, employee) => {
    const row = rows.find((item) => item.employeeId === employee.employeeId || item.id === employee.id);
    const computed = row ? computeRow(row) : { dailyRate: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, totalDeduction: 0, netSalary: 0 };
    accumulator.amount += computed.proratedAmount;
    accumulator.otPay += computed.otPay;
    accumulator.gross += computed.gross;
    accumulator.sss += computed.sss;
    accumulator.pagIbig += computed.pagIbig;
    accumulator.philHealth += computed.philHealth;
    accumulator.totalDeduction += computed.totalDeduction;
    accumulator.netSalary += computed.netSalary;
    return accumulator;
  }, { amount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, totalDeduction: 0, netSalary: 0 }), [officeEmployees, rows]);

  const activeEmployees = useMemo(() => sortedOfficeEmployees.filter((employee) => String(employee.status || "").toLowerCase() === "active").length, [sortedOfficeEmployees]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="section-card">
          <p className="eyebrow">Office Payroll</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Loading...</h1>
        </div>
      </div>
    );
  }

  function updateRow(id: string, patch: Partial<OfficePayrollRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function getSavedRowsSnapshot(savedRows: any[], notes?: any) {
    if (Array.isArray(notes?.rows) && notes.rows.length > 0) {
      return notes.rows;
    }
    return savedRows;
  }

  function hydrateRowsFromSavedRows(savedRows: any[]) {
    if (!savedRows.length) return;

    const savedRowMap = new Map<string, any>();
    savedRows.forEach((item: any) => {
      const keys = [item.employeeId, item.employee_id, item.id, item.employeeName, item.employee_name]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      keys.forEach((key) => savedRowMap.set(key, item));
    });

    setRows((currentRows) =>
      currentRows.map((row, index) => {
        const savedRow = savedRowMap.get(String(row.id)) || savedRowMap.get(String(row.employeeId || "")) || savedRowMap.get(String(row.name || "")) || savedRows[index];
        if (!savedRow) return row;
        return {
          ...row,
          monthlySalary: Number(savedRow.monthlySalary ?? savedRow.hourly_rate ?? row.monthlySalary) || row.monthlySalary,
          days: Number(savedRow.days ?? savedRow.regular_hours ?? row.days) || row.days,
          holiday: Number(savedRow.holiday ?? row.holiday) || row.holiday,
          sil: Number(savedRow.sil ?? row.sil) || row.sil,
          lateMinutes: Number(savedRow.lateMinutes ?? savedRow.lateHours ?? row.lateMinutes) || row.lateMinutes,
          otHours: Number(savedRow.otHours ?? savedRow.overtime_hours ?? row.otHours) || row.otHours,
          bonus: Number(savedRow.bonus ?? row.bonus) || row.bonus,
          allowances: Number(savedRow.allowances ?? row.allowances) || row.allowances,
          cashAdvance: Number(savedRow.cashAdvance ?? row.cashAdvance) || row.cashAdvance,
          cashAdvanceDeduction: Number(savedRow.cashAdvanceDeduction ?? row.cashAdvanceDeduction) || row.cashAdvanceDeduction,

          tax: Number(savedRow.tax ?? row.tax) || row.tax,
          amicaCredits: Number(savedRow.amicaCredits ?? row.amicaCredits) || row.amicaCredits,
          sssLoan: Number(savedRow.sssLoan ?? row.sssLoan) || row.sssLoan,
          pagIbigLoan: Number(savedRow.pagIbigLoan ?? row.pagIbigLoan) || row.pagIbigLoan,
          remarks: String(savedRow.remarks ?? row.remarks ?? ""),
          sssAmount: Number(savedRow.sssAmount ?? savedRow.sss_deduction ?? row.sssAmount) || row.sssAmount,
          pagIbigAmount: Number(savedRow.pagIbigAmount ?? savedRow.pagibig_deduction ?? row.pagIbigAmount) || row.pagIbigAmount,
          philHealthAmount: Number(savedRow.philHealthAmount ?? savedRow.philhealth_deduction ?? row.philHealthAmount) || row.philHealthAmount,
          additionalDeduction: Number(savedRow.additionalDeduction ?? savedRow.other_deductions ?? row.additionalDeduction) || row.additionalDeduction,
        };
      }),
    );
  }

  async function loadPayrollByPayoutDate() {
    if (!payoutDate) {
      notify("Select a payout date first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("hr_token");
      const response = await fetch(`${API_BASE}/payroll/office/by-payout-date?payoutDate=${encodeURIComponent(payoutDate)}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "No payroll run found for that payout date");
      }

      const savedRows = getSavedRowsSnapshot(Array.isArray(data?.rows) ? data.rows : [], data?.notes);
      if (savedRows.length > 0) {
        hydrateRowsFromSavedRows(savedRows);
      }

      if (data?.run?.pay_period_label) {
        setPayPeriod(String(data.run.pay_period_label));
      }

      notify(`Loaded payroll run for ${payoutDate}`);
    } catch (err) {
      setError((err as Error).message);
      notify((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    if (sortedOfficeEmployees.length === 0) {
      notify("No Main Office employees to export");
      return;
    }

    const rawRows = sortedOfficeEmployees.map((employee) => {
      const row = rows.find((item) => item.employeeId === employee.employeeId || item.id === employee.id);
      const computed = row ? computeRow(row) : { dailyRate: 0, effectiveDays: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, cashAdvance: 0, cashAdvanceDeduction: 0, cashBalance: 0, totalDeduction: 0, netSalary: 0 };
      return {
        "Employee Name": employee.fullName,
        "Employee ID": employee.employeeId || "",
        Department: employee.department || "",
        Position: employee.position || "",
        "Monthly Salary": row?.monthlySalary || 0,
        Days: row?.days || 0,
        Holiday: row?.holiday || 0,
        SIL: row?.sil || 0,
        "Late Minutes": row?.lateMinutes || 0,
        "OT Hours": row?.otHours || 0,
        Bonus: row?.bonus || 0,
        Allowances: row?.allowances || 0,
        "Cash Advance": row?.cashAdvance || 0,
        "Cash Advance Deduction": row?.cashAdvanceDeduction || 0,
        Tax: row?.tax || 0,
        "Amica Credits": row?.amicaCredits || 0,
        "SSS Loan": row?.sssLoan || 0,
        "Pag-IBIG Loan": row?.pagIbigLoan || 0,
        Remarks: row?.remarks || "",
        "SSS Amount": row?.sssAmount || 0,
        "Pag-IBIG Amount": row?.pagIbigAmount || 0,
        "PhilHealth Amount": row?.philHealthAmount || 0,
        "Additional Deduction": row?.additionalDeduction || 0,
        "Daily Rate": computed.dailyRate,
        "Effective Days": computed.effectiveDays,
        "Prorated Amount": computed.proratedAmount,
        "OT Pay": computed.otPay,
        Gross: computed.gross,
        "Total Deduction": computed.totalDeduction,
        "Net Salary": computed.netSalary,
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), "Office Payroll");
    XLSX.writeFile(wb, `office-payroll-${String(payPeriod).toLowerCase().replace(/\s+/g, "-")}.xlsx`);
    notify("Payroll Excel exported");
  }

  function exportPayslipExcel() {
    if (sortedOfficeEmployees.length === 0) {
      notify("No Main Office employees to export");
      return;
    }

    const moneyValue = (value: number) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
      }).format(Number.isFinite(value) ? value : 0);

    const payslipPages = sortedOfficeEmployees
      .map((selectedEmployee) => {
        const row = rows.find((item) => item.employeeId === selectedEmployee.employeeId || item.id === selectedEmployee.id);
        const computed = row ? computeRow(row) : { dailyRate: 0, effectiveDays: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, cashAdvance: 0, cashAdvanceDeduction: 0, cashBalance: 0, totalDeduction: 0, netSalary: 0 };
        const employee = {
          ...selectedEmployee,
          sssNo: "0",
          philHealthNo: "0",
          pagIbigNo: "0",
          tinNo: "0",
          silUsed: 0,
          silBalance: 0,
        };

        return `
          <table class="sheet">
            <colgroup>
              <col style="width: 15%" />
              <col style="width: 25%" />
              <col style="width: 23%" />
              <col style="width: 15%" />
              <col style="width: 22%" />
            </colgroup>
            <tbody>
              <tr class="top-row">
                <td rowspan="4" class="center"><img class="logo" src="/rabino-logo.svg" alt="Rabino Home Builders Corporation" /></td>
                <td colspan="4" class="title">RABINO HOME BUILDERS CORPORATION</td>
              </tr>
              <tr class="top-row"><td colspan="4" class="subtitle">PAYSLIP FOR THE PERIOD</td></tr>
              <tr class="top-row"><td colspan="4" class="subtitle">${String(payPeriod || "Monthly").toUpperCase()}</td></tr>
              <tr class="top-row"><td colspan="4" class="subtitle">${String(payoutDate || "0")}</td></tr>

              <tr class="info-row">
                <td class="label">EMPLOYEE NAME:</td><td colspan="2" class="value">${employee.fullName}</td>
                <td class="label">ID NO. :</td><td class="value">${employee.employeeId || "0"}</td>
              </tr>
              <tr class="info-row">
                <td class="label">DESIGNATION :</td><td colspan="2" class="value">${employee.position || employee.department || "Employee"}</td>
                <td class="label">BASIC RATE :</td><td class="value right">${moneyValue(row?.monthlySalary || 0)}</td>
              </tr>

              <tr class="body-row">
                <td colspan="2" class="section">SALARY</td>
                <td colspan="2" class="section">DEDUCTIONS</td>
                <td class="section">OTHER PERSONAL DETAILS</td>
              </tr>

              <tr class="body-row">
                <td class="label">NO. OF DAYS</td><td class="right">${row?.days || 0}</td>
                <td class="label">SSS</td><td class="right">${moneyValue(row?.sssAmount || 0)}</td>
                <td class="label">SSS NO.</td>
              </tr>
              <tr class="body-row">
                <td class="label">NO. OF OT HOURS</td><td class="right">${row?.otHours || 0}</td>
                <td class="label">SSS LOAN</td><td class="right">${moneyValue(row?.sssLoan || 0)}</td>
                <td class="value">${employee.sssNo || "0"}</td>
              </tr>
              <tr class="body-row">
                <td class="label">BASIC SALARY</td><td class="right">${moneyValue(computed.proratedAmount)}</td>
                <td class="label">PHILHEALTH</td><td class="right">${moneyValue(row?.philHealthAmount || 0)}</td>
                <td class="label">PHILHEALTH NO.</td>
              </tr>
              <tr class="body-row">
                <td class="label">DE MINIMIS BENEFITS</td><td class="right">${moneyValue(0)}</td>
                <td class="label">PAG-IBIG</td><td class="right">${moneyValue(row?.pagIbigAmount || 0)}</td>
                <td class="value">${employee.philHealthNo || "0"}</td>
              </tr>
              <tr class="body-row">
                <td class="label">HOLIDAY</td><td class="right">${row?.holiday || 0}</td>
                <td class="label">PAGIBIG LOAN</td><td class="right">${moneyValue(row?.pagIbigLoan || 0)}</td>
                <td class="label">PAG-IBIG NO.</td>
              </tr>
              <tr class="body-row">
                <td class="label">LATE MINUTES</td><td class="right">${row?.lateMinutes || 0}</td>
                <td class="label">AMICA CREDITS</td><td class="right">${moneyValue(row?.amicaCredits || 0)}</td>
                <td class="value">${employee.pagIbigNo || "0"}</td>
              </tr>
              <tr class="body-row">
                <td class="label">OT PAY</td><td class="right">${moneyValue(computed.otPay)}</td>
                <td class="label">TIN NO.</td><td class="right">${employee.tinNo || "0"}</td>
                <td class="label">&nbsp;</td>
              </tr>
              <tr class="body-row">
                  <td class="label">CASH ADVANCE</td><td class="right">${moneyValue(row?.cashAdvance || 0)}</td>
                  <td class="label">CASH ADVANCE DEDUCTION</td><td class="right">${moneyValue(row?.cashAdvanceDeduction || 0)}</td>
                  <td class="label">CASH BALANCE</td><td class="right">${moneyValue(computed.cashBalance || 0)}</td>
                </tr>
              <tr class="body-row">
                <td class="label right">TOTAL EARNINGS:</td><td class="right">${moneyValue(computed.gross)}</td>
                <td class="label">TOTAL DEDUCTIONS</td><td class="right">${moneyValue(computed.totalDeduction)}</td><td class="label">SIL USED</td>
              </tr>
              <tr class="body-row">
                <td colspan="4" class="label">TOTAL NET PAY: ${moneyValue(computed.netSalary)}</td>
                <td class="value">${employee.silUsed || 0} / BAL ${employee.silBalance || 0}</td>
              </tr>
              <tr class="signature">
                <td class="label">Prepared by:</td>
                <td class="center"><span class="footer-line">${String(user?.name || "HR")}</span></td>
                <td class="center"><span class="footer-line">ACCOUNTING</span></td>
                <td class="label">Signature</td>
                <td class="value"><span class="footer-name">${employee.fullName}</span></td>
              </tr>
            </tbody>
          </table>
        `;
      })
      .join('<div style="page-break-after: always;"></div>');

    const payslipHtml = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Office Payroll Payslip</title>
          <style>
            @page { size: legal landscape; margin: 5mm; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
            .sheet { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .sheet td { border: 0.7px solid #1d4ed8; padding: 0.7px 2px; font-size: 7.2px; line-height: 1; vertical-align: middle; }
            .logo { width: 58px; height: 58px; object-fit: contain; display: block; margin: 0 auto; }
            .title { color: #1d4ed8; font-weight: 800; text-align: center; font-size: 10.8px; letter-spacing: 0.02em; }
            .subtitle { text-align: center; font-weight: 700; font-size: 7.7px; }
            .label { font-weight: 700; white-space: nowrap; }
            .value { font-weight: 700; }
            .section { text-align: center; font-weight: 800; color: #1d4ed8; font-size: 7.8px; border-top: 1px solid #1d4ed8; border-bottom: 1px solid #1d4ed8; }
            .right { text-align: right; }
            .center { text-align: center; }
            .top-row td { height: 12px; }
            .info-row td { height: 11px; }
            .body-row td { height: 11px; }
            .signature { height: 28px; vertical-align: bottom; }
            .footer-line { display: block; border-top: 1px solid #1d4ed8; margin-top: 5px; padding-top: 1px; }
            .footer-name { display: block; font-weight: 700; text-align: center; border-top: 1px solid #1d4ed8; padding-top: 1px; }
          </style>
        </head>
        <body>
          ${payslipPages}
        </body>
      </html>
    `;

    const blob = new Blob([payslipHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `office-payslip-${String(payPeriod).toLowerCase().replace(/\s+/g, "-")}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("Payslip downloaded");
  }

  function handlePrint() {
    exportPayslipExcel();
  }

  async function releasePayroll() {
    setReleased(true);
    notify("Office payroll marked for release");
  }

  async function savePayroll() {
    setSaving(true);
    try {
      const token = localStorage.getItem("hr_token");
      const payload = {
        payPeriod,
        payoutDate,
        rows: sortedOfficeEmployees.map((employee) => {
          const row = rows.find((item) => item.employeeId === employee.employeeId || item.id === employee.id);
          const computed = row ? computeRow(row) : { dailyRate: 0, effectiveDays: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, cashAdvance: 0, cashAdvanceDeduction: 0, cashBalance: 0, totalDeduction: 0, netSalary: 0 };
          return {
            ...row,
            employeeId: employee.id,
            employeeName: employee.fullName,
            monthlySalary: (row?.monthlySalary ?? Number(employee.salary || 0)) || 0,
            days: Number(row?.days || 0),
            holiday: Number(row?.holiday || 0),
            sil: Number(row?.sil || 0),
            lateMinutes: Number(row?.lateMinutes || 0),
            otHours: Number(row?.otHours || 0),
            bonus: Number(row?.bonus || 0),
            allowances: Number(row?.allowances || 0),

            tax: Number(row?.tax || 0),
            amicaCredits: Number(row?.amicaCredits || 0),
            sssLoan: Number(row?.sssLoan || 0),
            pagIbigLoan: Number(row?.pagIbigLoan || 0),
            sssAmount: Number(row?.sssAmount || 0),
            pagIbigAmount: Number(row?.pagIbigAmount || 0),
            philHealthAmount: Number(row?.philHealthAmount || 0),
            additionalDeduction: Number(row?.additionalDeduction || 0),
            dailyRate: round2(computed.dailyRate),
            effectiveDays: round2(computed.effectiveDays),
            proratedAmount: round2(computed.proratedAmount),
            otPay: round2(computed.otPay),
            gross: round2(computed.gross),
            cashAdvance: round2(computed.cashAdvance),
            cashAdvanceDeduction: round2(computed.cashAdvanceDeduction),
            cashBalance: round2(computed.cashBalance),
            totalDeduction: round2(computed.totalDeduction),
            netSalary: round2(computed.netSalary),
          };
        }),
      };

      const res = await fetch(`${API_BASE}/payroll/office/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save office payroll");
      }

      notify("Office payroll saved to database");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="page-shell">
        <div className="section-card max-w-2xl">
          <p className="eyebrow">Restricted access</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Office Payroll is for Super Admin only</h1>
          <p className="mt-2 text-sm text-slate-600">
            This section is hidden from other roles and can only be used by the super admin account.
          </p>
          <div className="mt-4">
            <Link href="/" className="primary-button">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Payroll management</p>
          <h1 className="page-title mt-1">Office Payroll</h1>
          <p className="page-subtitle">Super-admin only payroll workspace for employees assigned to Main Office.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={savePayroll} className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save office payroll"}
          </button>
          <button type="button" onClick={releasePayroll} className="secondary-button">
            {released ? "Released" : "Mark for release"}
          </button>
          <button type="button" onClick={exportExcel} className="secondary-button">Export Excel</button>
          <button type="button" onClick={exportPayslipExcel} className="secondary-button">Generate Payslip</button>
          <button type="button" onClick={handlePrint} className="secondary-button">Print</button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <article className="stat-card accent-blue border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
          <p className="text-sm font-semibold text-slate-500">Main Office Employees</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{officeEmployees.length}</p>
          <p className="mt-1 text-sm text-slate-600">Only Main Office staff are shown</p>
        </article>
        <article className="stat-card accent-emerald border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_10px_30px_rgba(16,185,129,0.08)]">
          <p className="text-sm font-semibold text-slate-500">Active Staff</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{activeEmployees}</p>
          <p className="mt-1 text-sm text-slate-600">Active Main Office employees</p>
        </article>
        <article className="stat-card accent-cyan border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 shadow-[0_10px_30px_rgba(6,182,212,0.08)]">
          <p className="text-sm font-semibold text-slate-500">Estimated Payroll</p>
          <p className="mt-2 text-2xl font-black text-slate-950">₱{totals.netSalary.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-600">Based on editable office payroll rows</p>
        </article>
      </section>

      <section className="section-card border border-slate-200/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Office payroll controls</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Main Office staff only</h2>
            <p className="mt-2 text-sm text-slate-500">
              This page excludes all non-office employees and only lists staff assigned to <span className="font-semibold text-slate-900">Main Office</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Payroll period</span>
              <select value={payPeriod} onChange={(event) => setPayPeriod(event.target.value)} className={filterSelectCompactClassName}>
                <option value="Weekly">Weekly</option>
                <option value="Semi-Monthly">Semi-Monthly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Department</span>
              <select value={departmentSort} onChange={(event) => setDepartmentSort(event.target.value)} className={filterSelectCompactClassName}>
                <option value="All">All</option>
                {[...new Set(sortedOfficeEmployees.map((employee) => employee.department).filter(Boolean))].map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={savePayroll} className="secondary-button" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={loadPayrollByPayoutDate} className="secondary-button">
              Load by payout date
            </button>
            <button type="button" onClick={releasePayroll} className="secondary-button">
              {released ? "Released" : "Release"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Search Main Office employees</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`${filterInputClassName} mt-2`}
              placeholder="Search by name, department, position, or ID"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Payout date</span>
            <input value={payoutDate} onChange={(event) => setPayoutDate(event.target.value)} type="date" className={`${filterInputClassName} mt-2`} />
          </label>
        </div>

        <div className="mt-4 rounded-[1.1rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 text-sm text-slate-700 shadow-[0_12px_30px_rgba(14,165,233,0.08)] ring-1 ring-white/70">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-900">How this payroll is calculated</p>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-700">Live preview</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">1. Monthly salary</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Enter the employee’s monthly rate.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">2. Working days</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Pay is prorated using Mon-Sat working days.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-2 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">3. Late calculation</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Late minutes are converted to days using <span className="font-black">lateMinutes ÷ 480</span> and subtracted from working days.</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/80 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
            <span className="font-black text-slate-900">Formula: </span>
            <span>Effective days = Working days + Holiday + SIL - (Late minutes ÷ 480)</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">

              <tbody>
                {officeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No Main Office employees found.
                    </td>
                  </tr>
                ) : (
                  sortedOfficeEmployees.map((employee) => {
                    const row = rows.find((item) => item.employeeId === employee.employeeId || item.id === employee.id)!;
                    const computed = computeRow(row);
                    return (
                      <tr key={employee.id} className="border-t border-slate-100 align-top">
                        <td colSpan={6} className="px-3 py-3 sm:px-4">
                          <div className="rounded-[1.15rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/60 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-white/70">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr] lg:items-start">
                              <div className="space-y-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-black text-slate-950">{employee.fullName}</h3>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{employee.employeeId || "—"}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {employee.department || "Unassigned"} · {employee.position || "Employee"}
                                  </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Monthly Salary</span>
                                    <p className="mt-1 text-sm font-black text-slate-950">{moneyWhole(row.monthlySalary)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Daily equivalent: {moneyWhole(computed.dailyRate)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Working days</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{row.days}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Mon-Sat basis</p>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SIL</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{row.sil}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Added to working days</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Late deduction</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{row.lateMinutes} minutes</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Converted to {moneyWhole(row.lateMinutes / 480)} day(s)</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Effective days</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{(row.days + row.holiday + row.sil - row.lateMinutes / 480).toFixed(3)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Days + holiday + SIL - lateMinutes/480</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Prorated pay</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{moneyWhole(computed.proratedAmount)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Before deductions</p>
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3 py-2 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.gross)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 px-3 py-2 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Cash Advance</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.cashAdvance)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Shown beside total salary</p>
                                  </div>
                                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 px-3 py-2 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Cash Balance</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.cashBalance)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Cash advance - deduction</p>
                                  </div>
                                  <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white px-3 py-2 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">Total deductions</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.totalDeduction)}</p>
                                  </div>
                                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 px-3 py-2 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-600">Net pay</p>
                                    <p className="mt-1 text-sm font-black text-sky-700">{moneyWhole(computed.netSalary)}</p>
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Deduction breakdown</p>
                                      <p className="mt-1 text-sm text-slate-500">What gets subtracted from the employee’s pay</p>
                                    </div>
                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                                      Total: {money(computed.totalDeduction)}
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2 shadow-sm">
                                        <span className="text-xs font-semibold text-slate-600">SSS</span>
                                        <span className="text-sm font-black text-slate-950">{money(row.sssAmount)}</span>
                                      </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Pag-IBIG</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.pagIbigAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">PhilHealth</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.philHealthAmount)}</span>
                                    </div>
                                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2 shadow-sm">
                                        <span className="text-xs font-semibold text-slate-600">Tax</span>
                                        <span className="text-sm font-black text-slate-950">{money(row.tax)}</span>
                                      </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">SSS Loan</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.sssLoan)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Pag-IBIG Loan</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.pagIbigLoan)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Cash Advance Deduction</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.cashAdvanceDeduction)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Amica Credits</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.amicaCredits)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Other</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.additionalDeduction)}</span>
                                    </div>
                                  </div>
                                </div>

                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Monthly Salary</span>
                                  <input value={row.monthlySalary} onChange={(event) => updateRow(row.id, { monthlySalary: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash Advance</span>
                                  <input value={row.cashAdvance} onChange={(event) => updateRow(row.id, { cashAdvance: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash Advance Deduction</span>
                                  <input value={row.cashAdvanceDeduction} onChange={(event) => updateRow(row.id, { cashAdvanceDeduction: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Working Days</span>
                                  <input value={row.days} onChange={(event) => updateRow(row.id, { days: Number(event.target.value) || 0 })} type="number" step="0.001" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Holiday</span>
                                  <input value={row.holiday} onChange={(event) => updateRow(row.id, { holiday: Number(event.target.value) || 0 })} type="number" step="0.001" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SIL</span>
                                  <input value={row.sil} onChange={(event) => updateRow(row.id, { sil: Number(event.target.value) || 0 })} type="number" step="0.001" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Late Minutes</span>
                                  <input value={row.lateMinutes} onChange={(event) => updateRow(row.id, { lateMinutes: Number(event.target.value) || 0 })} type="number" step="1" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT Hours</span>
                                  <input value={row.otHours} onChange={(event) => updateRow(row.id, { otHours: Number(event.target.value) || 0 })} type="number" step="0.5" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SSS</span>
                                    <input value={row.sssAmount} onChange={(event) => updateRow(row.id, { sssAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">From employee profile</span>
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pag-IBIG</span>
                                    <input value={row.pagIbigAmount} onChange={(event) => updateRow(row.id, { pagIbigAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">From employee profile</span>
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">PhilHealth</span>
                                    <input value={row.philHealthAmount} onChange={(event) => updateRow(row.id, { philHealthAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">From employee profile</span>
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tax</span>
                                    <input value={row.tax} onChange={(event) => updateRow(row.id, { tax: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SSS Loan</span>
                                    <input value={row.sssLoan} onChange={(event) => updateRow(row.id, { sssLoan: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pag-IBIG Loan</span>
                                    <input value={row.pagIbigLoan} onChange={(event) => updateRow(row.id, { pagIbigLoan: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Amica Credits</span>
                                    <input value={row.amicaCredits} onChange={(event) => updateRow(row.id, { amicaCredits: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Other Deductions</span>
                                    <input value={row.additionalDeduction} onChange={(event) => updateRow(row.id, { additionalDeduction: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                </div>


                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p>
            <p className="mt-1 text-lg font-black text-slate-950">{money(totals.gross)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Before deductions</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total deductions</p>
            <p className="mt-1 text-lg font-black text-slate-950">{money(totals.totalDeduction)}</p>
            <p className="mt-1 text-[11px] text-slate-500">All employee deductions combined</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Net pay</p>
            <p className="mt-1 text-lg font-black text-emerald-700">{moneyWhole(totals.netSalary)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Final payable amount</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Release status</p>
            <p className="mt-1 text-lg font-black text-cyan-700">{released ? "Ready" : "Pending"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
