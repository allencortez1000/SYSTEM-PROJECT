"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionUser = {
  role?: string;
};

type Employee = {
  id?: string;
  employeeId?: string;
  fullName?: string;
  position?: string;
  department?: string;
  sssNo?: string;
  philHealthNo?: string;
  pagIbigNo?: string;
  tinNo?: string;
  silUsed?: number;
  silBalance?: number;
};

type Row = {
  monthlySalary?: number;
  days?: number;
  otHours?: number;
  cashAdvance?: number;
  cashAdvanceDeduction?: number;
  sssAmount?: number;
  pagIbigAmount?: number;
  philHealthAmount?: number;
};

type Computed = {
  proratedAmount?: number;
  otPay?: number;
  gross?: number;
  totalDeduction?: number;
  netSalary?: number;
};

type Payload = {
  employee?: Employee;
  row?: Row;
  computed?: Computed;
  payPeriod?: string;
  payoutDate?: string;
  preparedBy?: string;
  accountingBy?: string;
};

const money = (value: unknown) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);
const text = (value: unknown) => String(value ?? "").trim() || "0";
const number = (value: unknown) => Number(value) || 0;

export default function PayslipPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("hr_user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {
      setUser(null);
    }

    try {
      const raw = localStorage.getItem("office-payroll-payslip-data") || sessionStorage.getItem("office-payroll-payslip-data");
      setPayload(raw ? JSON.parse(raw) : null);
    } catch {
      setPayload(null);
    }
  }, []);

  const data = useMemo(() => {
    const employee = payload?.employee || {};
    const row = payload?.row || {};
    const computed = payload?.computed || {};
    return {
      employee,
      row,
      computed,
      payPeriod: payload?.payPeriod || "Monthly",
      payoutDate: payload?.payoutDate || "0",
      preparedBy: payload?.preparedBy || "0",
      accountingBy: payload?.accountingBy || "0",
    };
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [payload]);

  if (user?.role && user.role !== "super-admin") {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">Restricted access</h1>
          <p className="mt-2 text-sm text-slate-600">This payslip is only available to super admin.</p>
          <Link href="/office-payroll" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to Office Payroll</Link>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm print:hidden">
          <h1 className="text-2xl font-black">Payslip data not found</h1>
          <p className="mt-2 text-sm text-slate-600">Open a payslip from the Office Payroll page first.</p>
          <Link href="/office-payroll" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to Office Payroll</Link>
        </div>
      </div>
    );
  }

  const { employee, row, computed, payPeriod, payoutDate, preparedBy, accountingBy } = data;

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <div className="mx-auto max-w-[14in] px-4 py-4 print:p-0 print-hidden">
        <div className="mb-3 flex items-center justify-between print-hidden">
          <Link href="/office-payroll" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back</Link>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Print / Save as PDF</button>
        </div>

        <style jsx global>{`
          @page { size: legal landscape; margin: 5mm; }
          @media print { .print-hidden { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          .pay-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; }
          .pay-table td { border: 0.7px solid #2457c5; padding: 1px 3px; font-size: 7.3px; line-height: 1; vertical-align: middle; }
          .title { font-size: 11px; font-weight: 800; text-align: center; color: #2457c5; }
          .subtitle { text-align: center; font-weight: 700; font-size: 7.7px; }
          .label { font-weight: 700; }
          .section { color: #2457c5; font-weight: 800; text-align: center; font-size: 7.8px; }
          .right { text-align: right; }
          .center { text-align: center; }
          .logo { width: 58px; height: 58px; object-fit: contain; }
          .sig-row td { height: 28px; vertical-align: bottom; }
        `}</style>

        <table className="pay-table">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={4} className="center"><img className="logo" src="/rabino-logo.svg" alt="Rabino Home Builders Corporation" /></td>
              <td colSpan={4} className="title">RABINO HOME BUILDERS CORPORATION</td>
            </tr>
            <tr><td colSpan={4} className="subtitle">PAYSLIP FOR THE PERIOD</td></tr>
            <tr><td colSpan={4} className="subtitle">{String(payPeriod || "Monthly").toUpperCase()}</td></tr>
            <tr><td colSpan={4} className="subtitle">{text(payoutDate)}</td></tr>
            <tr>
              <td className="label">EMPLOYEE NAME:</td><td colSpan={2} className="label">{text(employee.fullName)}</td><td className="label">ID NO. :</td><td className="label">{text(employee.employeeId)}</td>
            </tr>
            <tr>
              <td className="label">DESIGNATION :</td><td colSpan={2} className="label">{text(employee.position || employee.department || "Employee")}</td><td className="label">BASIC RATE :</td><td className="label right">{money(row.monthlySalary)}</td>
            </tr>
            <tr><td colSpan={2} className="section">SALARY</td><td colSpan={2} className="section">DEDUCTIONS</td><td className="section">OTHER PERSONAL DETAILS</td></tr>
            <tr><td className="label">NO. OF DAYS</td><td className="right">{number(row.days)}</td><td className="label">SSS</td><td className="right">{money(row.sssAmount)}</td><td className="label">SSS NO.</td></tr>
            <tr><td className="label">NO. OF OT HOURS</td><td className="right">{number(row.otHours)}</td><td className="label">SSS LOAN</td><td className="right">{money(0)}</td><td className="label">{text(employee.sssNo)}</td></tr>
            <tr><td className="label">BASIC SALARY</td><td className="right">{money(computed.proratedAmount)}</td><td className="label">PHILHEALTH</td><td className="right">{money(row.philHealthAmount)}</td><td className="label">PHILHEALTH NO.</td></tr>
            <tr><td className="label">DE MINIMIS BENEFITS</td><td className="right">{money(0)}</td><td className="label">PAG-IBIG</td><td className="right">{money(row.pagIbigAmount)}</td><td className="label">{text(employee.philHealthNo)}</td></tr>
            <tr><td className="label">OT PAY</td><td className="right">{money(computed.otPay)}</td><td className="label">PAGIBIG LOAN</td><td className="right">{money(0)}</td><td className="label">PAG-IBIG NO.</td></tr>
            <tr><td className="label">SSS LOAN</td><td className="right">{money(0)}</td><td className="label">AMICA CREDITS</td><td className="right">{money(0)}</td><td className="label">{text(employee.pagIbigNo)}</td></tr>
            <tr><td className="label">HOLIDAY</td><td className="right">{money(0)}</td><td className="label">CASH ADVANCE</td><td className="right">{money(row.cashAdvance)}</td><td className="label">TIN NO.</td></tr>
            <tr><td className="label">CASH ADVANCE DEDUCTION</td><td className="right">{money(row.cashAdvanceDeduction)}</td><td className="label">CASH BALANCE</td><td className="right">{money(number(row.cashAdvance) - number(row.cashAdvanceDeduction))}</td><td className="label">{text(employee.tinNo)}</td></tr>
            <tr><td className="label right">TOTAL EARNINGS:</td><td className="right">{money(computed.gross)}</td><td className="label">TOTAL DEDUCTIONS</td><td className="right">{money(computed.totalDeduction)}</td><td className="label">SIL USED</td></tr>
            <tr><td colSpan={4} className="label">TOTAL NET PAY: {money(computed.netSalary)}</td><td className="label">{money(employee.silUsed)} / BAL {money(employee.silBalance)}</td></tr>
            <tr className="sig-row"><td className="label">Prepared by:</td><td className="center">{text(preparedBy)}</td><td className="center">{text(accountingBy)}</td><td className="label">Signature</td><td className="label">{text(employee.fullName)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
