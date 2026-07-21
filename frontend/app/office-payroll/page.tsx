"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
  otHours: number;
  bonus: number;
  allowances: number;
  cashAdvance: number;
  tax: number;
  sssLoan: number;
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
  const proratedAmount = dailyRate * row.days;
  const otPay = (dailyRate / 8) * 1.25 * row.otHours;
  const gross = proratedAmount + otPay + row.bonus + row.allowances;
  const sss = row.hasSss ? row.sssAmount : 0;
  const pagIbig = row.hasPagIbig ? row.pagIbigAmount : 0;
  const philHealth = row.hasPhilHealth ? row.philHealthAmount : 0;
  const totalDeduction = sss + pagIbig + philHealth + row.cashAdvance + row.tax + row.sssLoan + row.additionalDeduction;
  const netSalary = gross - totalDeduction;
  return { dailyRate, proratedAmount, otPay, gross, sss, pagIbig, philHealth, totalDeduction, netSalary };
}

export default function OfficePayrollPage() {
  const { notify } = useNotification();
  const importInputRef = useRef<HTMLInputElement | null>(null);
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
  const [payoutDate, setPayoutDate] = useState("");
  const [rows, setRows] = useState<OfficePayrollRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [released, setReleased] = useState(false);

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
            otHours: 0,
            bonus: 0,
            allowances: 0,
            cashAdvance: 0,
            tax: Number(employee.taxAmount || 0) || 0,
            sssLoan: 0,
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

  function exportExcel() {
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
        const computed = row ? computeRow(row) : { dailyRate: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, totalDeduction: 0, netSalary: 0 };
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
                <td class="label">SSS LOAN</td><td class="right">${moneyValue(0)}</td>
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
                <td class="label">OT PAY</td><td class="right">${moneyValue(computed.otPay)}</td>
                <td class="label">PAGIBIG LOAN</td><td class="right">${moneyValue(0)}</td>
                <td class="label">PAG-IBIG NO.</td>
              </tr>
              <tr class="body-row">
                <td class="label">SSS LOAN</td><td class="right">${moneyValue(0)}</td>
                <td class="label">AMICA CREDITS</td><td class="right">${moneyValue(0)}</td>
                <td class="value">${employee.pagIbigNo || "0"}</td>
              </tr>
              <tr class="body-row">
                <td class="label">HOLIDAY</td><td class="right">${moneyValue(0)}</td>
                <td class="label">CASH ADVANCE</td><td class="right">${moneyValue(row?.cashAdvance || 0)}</td>
                <td class="label">TIN NO.</td>
              </tr>
              <tr class="body-row">
                <td class="label">LEAVE / ABSENCES</td><td class="right">${moneyValue(0)}</td>
                <td class="label">C/A BALANCE</td><td class="right">${moneyValue(0)}</td>
                <td class="value">${employee.tinNo || "0"}</td>
              </tr>
              <tr class="body-row">
                <td class="label right">TOTAL EARNINGS:</td><td class="right">${moneyValue(computed.gross)}</td>
                <td class="label">TOTAL DEDUCTIONS</td><td class="right">${moneyValue(computed.totalDeduction)}</td>
                <td class="label">SIL USED</td>
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
            .sheet td { border: 0.8px solid #1d4ed8; padding: 1px 3px; font-size: 8.1px; line-height: 1.02; vertical-align: middle; }
            .logo { width: 66px; height: 66px; object-fit: contain; display: block; margin: 0 auto; }
            .title { color: #1d4ed8; font-weight: 700; text-align: center; font-size: 12.4px; letter-spacing: 0.02em; }
            .subtitle { text-align: center; font-weight: 700; font-size: 8.7px; }
            .label { font-weight: 700; white-space: nowrap; }
            .value { font-weight: 700; }
            .section { text-align: center; font-weight: 700; color: #1d4ed8; font-size: 8.7px; border-top: 1px solid #1d4ed8; border-bottom: 1px solid #1d4ed8; }
            .right { text-align: right; }
            .center { text-align: center; }
            .top-row td { height: 16px; }
            .info-row td { height: 14px; }
            .body-row td { height: 13px; }
            .signature { height: 35px; vertical-align: bottom; }
            .footer-line { display: block; border-top: 1px solid #1d4ed8; margin-top: 8px; padding-top: 2px; }
            .footer-name { display: block; font-weight: 700; text-align: center; border-top: 1px solid #1d4ed8; padding-top: 2px; }
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
    exportExcel();
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
          const computed = row ? computeRow(row) : { dailyRate: 0, proratedAmount: 0, otPay: 0, gross: 0, sss: 0, pagIbig: 0, philHealth: 0, totalDeduction: 0, netSalary: 0 };
          return {
            ...row,
            employeeId: employee.id,
            employeeName: employee.fullName,
            monthlySalary: (row?.monthlySalary ?? Number(employee.salary || 0)) || 0,
            dailyRate: round2(computed.dailyRate),
            proratedAmount: round2(computed.proratedAmount),
            otPay: round2(computed.otPay),
            gross: round2(computed.gross),
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
          <button type="button" onClick={exportExcel} className="secondary-button">Generate Payslip</button>
          <button type="button" onClick={handlePrint} className="secondary-button">Print</button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <article className="stat-card accent-blue">
          <p className="text-sm font-semibold text-slate-500">Main Office Employees</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{officeEmployees.length}</p>
          <p className="mt-1 text-sm text-slate-600">Only Main Office staff are shown</p>
        </article>
        <article className="stat-card accent-emerald">
          <p className="text-sm font-semibold text-slate-500">Active Staff</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{activeEmployees}</p>
          <p className="mt-1 text-sm text-slate-600">Active Main Office employees</p>
        </article>
        <article className="stat-card accent-cyan">
          <p className="text-sm font-semibold text-slate-500">Estimated Payroll</p>
          <p className="mt-2 text-2xl font-black text-slate-950">₱{totals.netSalary.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-600">Based on editable office payroll rows</p>
        </article>
      </section>

      <section className="section-card">
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

        <div className="mt-4 rounded-[1rem] border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-700 shadow-sm">
          <p className="text-sm font-black text-slate-900">How this payroll is calculated</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">1. Monthly salary</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Enter the employee’s monthly rate.</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">2. Working days</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Pay is prorated using Mon-Sat working days.</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">3. Net pay</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">The system subtracts deductions and shows the final amount.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm">
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
                          <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
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
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Monthly salary</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{moneyWhole(row.monthlySalary)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Daily equivalent: {moneyWhole(computed.dailyRate)}</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Working days</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{row.days}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Mon-Sat basis</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Prorated pay</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{moneyWhole(computed.proratedAmount)}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Before deductions</p>
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-2xl bg-slate-50 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total salary</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.gross)}</p>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Total deductions</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{money(computed.totalDeduction)}</p>
                                  </div>
                                  <div className="rounded-2xl bg-sky-50 px-3 py-2 shadow-sm ring-1 ring-sky-100">
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
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
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
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Tax</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.tax)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                      <span className="text-xs font-semibold text-slate-600">Cash Advance</span>
                                      <span className="text-sm font-black text-slate-950">{money(row.cashAdvance)}</span>
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
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Working Days</span>
                                  <input value={row.days} onChange={(event) => updateRow(row.id, { days: Number(event.target.value) || 0 })} type="number" step="0.001" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>
                                <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">OT Hours</span>
                                  <input value={row.otHours} onChange={(event) => updateRow(row.id, { otHours: Number(event.target.value) || 0 })} type="number" step="0.5" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                </label>

                                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">SSS</span>
                                    <input value={row.sssAmount} onChange={(event) => updateRow(row.id, { sssAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pag-IBIG</span>
                                    <input value={row.pagIbigAmount} onChange={(event) => updateRow(row.id, { pagIbigAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">PhilHealth</span>
                                    <input value={row.philHealthAmount} onChange={(event) => updateRow(row.id, { philHealthAmount: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Tax</span>
                                    <input value={row.tax} onChange={(event) => updateRow(row.id, { tax: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
                                  </label>
                                  <label className="block rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cash Advance</span>
                                    <input value={row.cashAdvance} onChange={(event) => updateRow(row.id, { cashAdvance: Number(event.target.value) || 0 })} type="number" className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900" />
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
