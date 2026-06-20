"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNotification } from "../../components/notification";

type PayFrequency = "weekly" | "semi-monthly" | "monthly";

type WorkerRow = {
  id: string;
  supervisor: string;
  name: string;
  position: string;
  dailyRate: number;
  days: number;
  otHours: number;
  cashAdvance: number;
  tax: number;
  additionalDeduction: number;
  remarks: string;
};

type Employee = {
  id: string;
  fullName: string;
  position?: string;
  salary?: number;
};

const API_BASE = "/api";

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
    position: "Labor",
    dailyRate: 600,
    days: 6,
    otHours: 0,
    cashAdvance: 0,
    tax: 0,
    additionalDeduction: 0,
    remarks: "",
  };
}

function computeStatutoryDeductions(periodGross: number, frequency: PayFrequency) {
  const periodsPerMonth = frequencyConfig[frequency].periodsPerMonth;
  const estimatedMonthlyCompensation = Math.max(0, periodGross * periodsPerMonth);

  const sssMonthlyCredit = clamp(estimatedMonthlyCompensation, 5000, 35000);
  const sssMonthlyEmployee = sssMonthlyCredit * 0.05;

  const philHealthMonthlyBase = clamp(estimatedMonthlyCompensation, 10000, 100000);
  const philHealthMonthlyEmployee = (philHealthMonthlyBase * 0.05) / 2;

  const pagIbigMonthlyBase = Math.min(estimatedMonthlyCompensation, 10000);
  const pagIbigEmployeeRate = estimatedMonthlyCompensation <= 1500 ? 0.01 : 0.02;
  const pagIbigMonthlyEmployee = Math.min(pagIbigMonthlyBase * pagIbigEmployeeRate, 200);

  return {
    sss: roundMoney(sssMonthlyEmployee / periodsPerMonth),
    philHealth: roundMoney(philHealthMonthlyEmployee / periodsPerMonth),
    pagIbig: roundMoney(pagIbigMonthlyEmployee / periodsPerMonth),
  };
}

function computeRow(row: WorkerRow, frequency: PayFrequency) {
  const amount = row.dailyRate * row.days;
  const otPay = (row.dailyRate / 8) * 1.25 * row.otHours;
  const totalSalary = amount + otPay;
  const statutory = computeStatutoryDeductions(totalSalary, frequency);
  const totalDeduction =
    row.cashAdvance + row.tax + row.additionalDeduction + statutory.philHealth + statutory.pagIbig + statutory.sss;
  const netSalary = Math.max(0, totalSalary - totalDeduction);

  return { amount, otPay, totalSalary, ...statutory, totalDeduction, netSalary };
}

function todayLabel() {
  return new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function currentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (date: Date) =>
    date.toLocaleDateString("en-PH", { month: "long", day: "2-digit", year: "numeric" });

  return `${format(monday)} - ${format(sunday)}`;
}

const inputClass =
  "relative z-0 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:z-50 focus:min-w-[240px] focus:border-blue-400 focus:shadow-xl focus:ring-2 focus:ring-blue-100";

const numberInputClass = `${inputClass} text-right tabular-nums focus:min-w-[120px]`;
const readonlyMoneyClass = "px-2 py-2 text-right text-xs font-black tabular-nums text-slate-700";

export default function NewPayrollPage() {
  const [isWorksheetOpen, setIsWorksheetOpen] = useState(true);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("weekly");
  const [coveredPeriod, setCoveredPeriod] = useState(currentWeekRange());
  const [payrollDate, setPayrollDate] = useState(todayLabel());
  const [projectName, setProjectName] = useState("Rabino Home Builders Corporation - Weekly Payroll");
  const [preparedBy, setPreparedBy] = useState("Aubrey Rose N. Gomez");
  const [notedBy, setNotedBy] = useState("Juniffer Tagupa");
  const [approvedBy, setApprovedBy] = useState("Karla Cepeda");
  const [rows, setRows] = useState<WorkerRow[]>(() => [blankRow(), blankRow(), blankRow()]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotification();

  useEffect(() => {
    async function loadEmployees() {
      setLoadingEmployees(true);
      setError(null);

      try {
        const token = localStorage.getItem("hr_token");
        const response = await fetch(`${API_BASE}/employees`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || data?.message || "Failed to load employees");
        }

        setEmployees(data?.employees || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => {
        const computed = computeRow(row, payFrequency);
        sum.amount += computed.amount;
        sum.otPay += computed.otPay;
        sum.totalSalary += computed.totalSalary;
        sum.philHealth += computed.philHealth;
        sum.pagIbig += computed.pagIbig;
        sum.sss += computed.sss;
        sum.totalDeduction += computed.totalDeduction;
        sum.netSalary += computed.netSalary;
        return sum;
      },
      { amount: 0, otPay: 0, totalSalary: 0, philHealth: 0, pagIbig: 0, sss: 0, totalDeduction: 0, netSalary: 0 },
    );
  }, [payFrequency, rows]);

  const stats = [
    { label: "Workers", value: rows.filter((row) => row.name.trim()).length || rows.length, detail: "Rows in this payroll", tone: "bg-blue-50 text-blue-700" },
    { label: "Gross salary", value: money(totals.totalSalary), detail: "Days + overtime pay", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Gov deductions", value: money(totals.sss + totals.pagIbig + totals.philHealth), detail: "SSS, Pag-IBIG, PhilHealth", tone: "bg-amber-50 text-amber-700" },
    { label: "Net release", value: money(totals.netSalary), detail: "Total payable", tone: "bg-violet-50 text-violet-700" },
  ];

  function updateRow(id: string, patch: Partial<WorkerRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function selectEmployee(rowId: string, employeeName: string) {
    const employee = employees.find((item) => item.fullName === employeeName);
    const estimatedDailyRate = employee?.salary ? Math.round(Number(employee.salary) / 26) : undefined;

    updateRow(rowId, {
      name: employeeName,
      position: employee?.position || "Labor",
      ...(estimatedDailyRate ? { dailyRate: estimatedDailyRate } : {}),
    });
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function duplicateRow(row: WorkerRow) {
    setRows((current) => [...current, { ...row, id: crypto.randomUUID(), name: `${row.name}` }]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  }

  function clearPayroll() {
    setRows([blankRow(), blankRow(), blankRow()]);
    notify("Payroll worksheet reset");
  }

  function handlePrint() {
    window.print();
  }

  function exportExcel() {
    const escapeCell = (value: string | number) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const headers = [
      "NO.",
      "SUPERVISOR / LEAD",
      "WORKER NAME",
      "POSITION",
      "SALARY",
      "NO. OF DAYS",
      "AMOUNT",
      "OT HRS",
      "OT PAY",
      "TOTAL SALARY",
      "CA",
      "PHILHEALTH",
      "TAX",
      "PAG-IBIG",
      "SSS",
      "ADDITIONAL DEDUCTION",
      "TOTAL DEDUCTION",
      "NET SALARY",
      "SIGNATURE",
      "REMARKS",
    ];

    const workerRows = rows
      .map((row, index) => {
        const computed = computeRow(row, payFrequency);
        const cells = [
          index + 1,
          row.supervisor,
          row.name,
          row.position,
          row.dailyRate,
          row.days,
          roundMoney(computed.amount),
          row.otHours,
          roundMoney(computed.otPay),
          roundMoney(computed.totalSalary),
          row.cashAdvance,
          computed.philHealth,
          row.tax,
          computed.pagIbig,
          computed.sss,
          row.additionalDeduction,
          computed.totalDeduction,
          computed.netSalary,
          "",
          row.remarks,
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
      "",
      roundMoney(totals.amount),
      "",
      roundMoney(totals.otPay),
      roundMoney(totals.totalSalary),
      "",
      roundMoney(totals.philHealth),
      "",
      roundMoney(totals.pagIbig),
      roundMoney(totals.sss),
      "",
      roundMoney(totals.totalDeduction),
      roundMoney(totals.netSalary),
      "",
      "",
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
            <tr><td class="title" colspan="20">${escapeCell(projectName)}</td></tr>
            <tr><td class="meta" colspan="20">PAYROLL COVERED: ${escapeCell(coveredPeriod)}</td></tr>
            <tr><td class="meta" colspan="20">PAYROLL DATE: ${escapeCell(payrollDate)}</td></tr>
            <tr><td class="meta" colspan="20">DEDUCTION SCHEDULE: ${escapeCell(frequencyConfig[payFrequency].label)}</td></tr>
            <tr></tr>
            <tr>${headers.map((header, index) => `<th class="${index >= 10 && index <= 15 ? "deduction" : ""}">${escapeCell(header)}</th>`).join("")}</tr>
            ${workerRows}
            <tr class="total">${totalRow.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>
            <tr></tr>
            <tr><td class="meta" colspan="7">PREPARED BY: ${escapeCell(preparedBy)}</td><td class="meta" colspan="7">NOTED BY: ${escapeCell(notedBy)}</td><td class="meta" colspan="6">APPROVED BY: ${escapeCell(approvedBy)}</td></tr>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([worksheetHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payFrequency}-payroll-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Payroll Excel file exported");
  }

  const worksheet = (
    <section className="payroll-print-sheet flex h-full min-h-0 flex-col bg-white print:block">
      <div className="shrink-0 border-b border-slate-200 bg-white/95 p-2 backdrop-blur print:border-0 print:p-0">
        <div className="grid gap-2 xl:grid-cols-[1fr_500px] xl:items-end">
          <div className="grid min-w-0 gap-2 md:grid-cols-[1fr_1fr]">
            <label className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 print:text-slate-700">Payroll covered</span>
              <input
                value={coveredPeriod}
                onChange={(event) => setCoveredPeriod(event.target.value)}
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

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block rounded-lg border border-slate-100 bg-slate-50 p-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Payroll date</span>
              <input
                value={payrollDate}
                onChange={(event) => setPayrollDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700"
              />
            </label>
            <label className="block rounded-lg border border-slate-100 bg-slate-50 p-2">
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
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-black text-slate-600 print:hidden">
          <span>Workers: {rows.filter((row) => row.name.trim()).length || rows.length}</span>
          <span>Gross: {money(totals.totalSalary)}</span>
          <span>Gov deductions: {money(totals.sss + totals.pagIbig + totals.philHealth)}</span>
          <span className="text-emerald-700">Net release: {money(totals.netSalary)}</span>
          <span className="font-semibold text-slate-400">{frequencyConfig[payFrequency].description}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">
          <table className="payroll-print-table min-w-[1680px] border-collapse text-left text-sm print:min-w-0 print:text-[7px]">
            <thead className="sticky top-0 z-30 print:static">
              <tr className="bg-slate-950 text-white">
                <th className="sticky left-0 z-40 w-12 bg-slate-950 px-2 py-2 text-center text-[11px] font-black">No.</th>
                <th className="w-44 px-2 py-2 text-[11px] font-black">Supervisor / Lead</th>
                <th className="sticky left-12 z-40 w-56 bg-slate-950 px-2 py-2 text-[11px] font-black">Worker name</th>
                <th className="w-36 px-2 py-2 text-[11px] font-black">Position</th>
                <th className="w-28 px-2 py-2 text-right text-[11px] font-black">Salary</th>
                <th className="w-24 px-2 py-2 text-right text-[11px] font-black">No. of days</th>
                <th className="w-28 px-2 py-2 text-right text-[11px] font-black">Amount</th>
                <th className="w-24 px-2 py-2 text-right text-[11px] font-black">OT hrs</th>
                <th className="w-28 px-2 py-2 text-right text-[11px] font-black">OT pay</th>
                <th className="w-32 px-2 py-2 text-right text-[11px] font-black">Total salary</th>
                <th className="w-24 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">CA</th>
                <th className="w-28 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">PhilHealth</th>
                <th className="w-24 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">Tax</th>
                <th className="w-24 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">Pag-IBIG</th>
                <th className="w-24 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">SSS</th>
                <th className="w-36 bg-rose-950/70 px-2 py-2 text-right text-[11px] font-black">Additional deduction</th>
                <th className="w-36 px-2 py-2 text-right text-[11px] font-black">Total deduction</th>
                <th className="w-36 px-2 py-2 text-right text-[11px] font-black">Net salary</th>
                <th className="w-36 px-2 py-2 text-[11px] font-black">Signature</th>
                <th className="w-52 px-2 py-2 text-[11px] font-black">Remarks</th>
                <th className="w-36 px-2 py-2 text-center text-[11px] font-black print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const computed = computeRow(row, payFrequency);
                return (
                  <tr key={row.id} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
                    <td className="sticky left-0 z-20 bg-white px-2 py-2 text-center text-xs font-black text-slate-400">{index + 1}</td>
                    <td className="px-2 py-2"><input value={row.supervisor} onChange={(event) => updateRow(row.id, { supervisor: event.target.value })} className={inputClass} placeholder="Lead person" /></td>
                    <td className="sticky left-12 z-20 bg-white px-2 py-2">
                      <input list="employee-options" value={row.name} onChange={(event) => selectEmployee(row.id, event.target.value)} className={inputClass} placeholder="Worker name" />
                    </td>
                    <td className="px-2 py-2"><input value={row.position} onChange={(event) => updateRow(row.id, { position: event.target.value })} className={inputClass} /></td>
                    <td className="px-2 py-2"><input type="number" value={row.dailyRate} onChange={(event) => updateRow(row.id, { dailyRate: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className="px-2 py-2"><input type="number" step="0.1" value={row.days} onChange={(event) => updateRow(row.id, { days: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className={readonlyMoneyClass}>{money(computed.amount)}</td>
                    <td className="px-2 py-2"><input type="number" step="0.5" value={row.otHours} onChange={(event) => updateRow(row.id, { otHours: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className={readonlyMoneyClass}>{money(computed.otPay)}</td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-slate-950">{money(computed.totalSalary)}</td>
                    <td className="px-2 py-2"><input type="number" value={row.cashAdvance} onChange={(event) => updateRow(row.id, { cashAdvance: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-red-700">{money(computed.philHealth)}</td>
                    <td className="px-2 py-2"><input type="number" value={row.tax} onChange={(event) => updateRow(row.id, { tax: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-red-700">{money(computed.pagIbig)}</td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-red-700">{money(computed.sss)}</td>
                    <td className="px-2 py-2"><input type="number" value={row.additionalDeduction} onChange={(event) => updateRow(row.id, { additionalDeduction: numberValue(event.target.value) })} className={numberInputClass} /></td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-red-700">{money(computed.totalDeduction)}</td>
                    <td className="px-2 py-2 text-right text-xs font-black tabular-nums text-emerald-700">{money(computed.netSalary)}</td>
                    <td className="px-2 py-2"><div className="h-8 rounded-lg border border-dashed border-slate-300 bg-slate-50" /></td>
                    <td className="px-2 py-2"><input value={row.remarks} onChange={(event) => updateRow(row.id, { remarks: event.target.value })} className={inputClass} placeholder="Notes / balance" /></td>
                    <td className="px-2 py-2 print:hidden">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => duplicateRow(row)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-700">Copy</button>
                        <button type="button" onClick={() => removeRow(row.id)} className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-700">Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="print:static">
              <tr className="bg-slate-100 text-slate-950">
                <td colSpan={6} className="sticky left-0 z-40 bg-slate-100 px-3 py-4 text-right text-sm font-black uppercase tracking-[0.16em]">Total salary</td>
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
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
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
        <div className="grid min-w-0 gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
          <div className="min-w-0">
            <p className="eyebrow">Payroll calculation</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Excel-like payroll opens in a focused editing tab.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              SSS, Pag-IBIG, and PhilHealth are computed automatically from each worker&apos;s gross salary and the selected deduction schedule.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => setIsWorksheetOpen(true)} className="primary-button" type="button">Open payroll worksheet</button>
              <button onClick={addRow} className="secondary-button" type="button">Add worker row</button>
              <Link href="/payroll" className="secondary-button">Back to payroll center</Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-300">Net salary for release</p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Live</span>
            </div>
            <p className="mt-5 break-words text-4xl font-black sm:text-5xl">{money(totals.netSalary)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Deduction schedule: {frequencyConfig[payFrequency].label}. Employee records loaded: {loadingEmployees ? "..." : employees.length}.
            </p>
          </div>
        </div>
      </section>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 print:hidden">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Worksheet ready</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Open the table workspace to edit payroll</h3>
            <p className="mt-2 text-sm text-slate-500">
              The table is separated into a popup-style workspace so the wide Excel columns are easier to navigate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setIsWorksheetOpen(true)} type="button" className="primary-button">Open table</button>
            <button onClick={exportExcel} type="button" className="secondary-button">Export Excel</button>
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
                <h3 className="truncate text-base font-black text-slate-950">Excel-like table editor</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={addRow} type="button" className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-black text-white">Add row</button>
                <button onClick={exportExcel} type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Export Excel</button>
                <button onClick={handlePrint} type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Print</button>
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
    </div>
  );
}
