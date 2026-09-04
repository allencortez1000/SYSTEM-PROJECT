"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

async function getLogoDataUrl() {
  const response = await fetch("/rabino-logo.svg");
  const svgText = await response.text();
  const encoded = btoa(unescape(encodeURIComponent(svgText)));
  return `data:image/svg+xml;base64,${encoded}`;
}


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
  id?: string;
  employeeId?: string;
  name?: string;
  department?: string;
  position?: string;
  monthlySalary?: number;
  days?: number;
  holiday?: number;
  sil?: number;
  lateMinutes?: number;
  otHours?: number;
  bonus?: number;
  allowances?: number;
  cashAdvance?: number;
  cashAdvanceDeduction?: number;
  tax?: number;
  amicaCredits?: number;
  sssLoan?: number;
  pagIbigLoan?: number;
  sssAmount?: number;
  pagIbigAmount?: number;
  philHealthAmount?: number;
  additionalDeduction?: number;
};

type Computed = {
  dailyRate?: number;
  effectiveDays?: number;
  proratedAmount?: number;
  otPay?: number;
  holidayPay?: number;
  gross?: number;
  cashAdvance?: number;
  cashAdvanceDeduction?: number;
  cashBalance?: number;
  totalDeduction?: number;
  netSalary?: number;
};

type PayslipEntry = {
  employee?: Employee;
  row?: Row;
  computed?: Computed;
  payPeriod?: string;
  payoutDate?: string;
  preparedBy?: string;
  accountingBy?: string;
};

type Payload = {
  department?: string;
  payPeriod?: string;
  payoutDate?: string;
  preparedBy?: string;
  accountingBy?: string;
  payslips?: PayslipEntry[];
};

const money = (value: unknown) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value) || 0);
const text = (value: unknown) => String(value ?? "").trim() || "0";
const number = (value: unknown) => Number(value) || 0;

export default function PayslipPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("/rabino-logo.svg");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("hr_user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {
      setUser(null);
    }

    try {
      const raw = sessionStorage.getItem("office-payroll-payslip-data") || localStorage.getItem("office-payroll-payslip-data");
      setPayload(raw ? JSON.parse(raw) : null);
    } catch {
      setPayload(null);
    }

    void getLogoDataUrl().then(setLogoDataUrl).catch(() => setLogoDataUrl("/rabino-logo.svg"));
  }, []);

  const data = useMemo(() => {
    return {
      payslips: Array.isArray(payload?.payslips) ? payload.payslips : [],
      department: payload?.department || "All",
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

  const { payslips, department, payPeriod, payoutDate, preparedBy, accountingBy } = data;
  const payslipPages = payslips.reduce<PayslipEntry[][]>((pages, entry, index) => {
    const pageIndex = Math.floor(index / 3);
    if (!pages[pageIndex]) pages[pageIndex] = [];
    pages[pageIndex].push(entry);
    return pages;
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <div className="payslip-print-area mx-auto max-w-[8.5in] px-2 py-3 print:p-0">
        <div className="mb-3 flex items-center justify-between print-hidden">
          <Link href="/office-payroll" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back</Link>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Print / Save as PDF</button>
        </div>

         <style jsx global>{`
          @page { size: letter portrait; margin: 4mm; }
          @media print {
            @page { size: letter portrait; margin: 4mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; }
            body * { visibility: hidden !important; }
            .print-hidden, .payslip-summary { display: none !important; }
            .payslip-print-area, .payslip-print-area * { visibility: visible !important; }
            .payslip-print-area { position: static; width: 100%; margin: 0; padding: 0; display: block; }
            .payslip-page {
              break-before: auto;
              break-after: page;
              break-inside: avoid;
              width: 100%;
              margin: 0;
              display: block;
            }
            .payslip-page:first-child { break-before: auto; page-break-before: auto; }
            .payslip-page:last-child { break-after: auto; page-break-after: auto; }
            .payslip-slip { break-inside: avoid; page-break-inside: avoid; margin-bottom: 2mm; display: block; }
            .payslip-slip:last-child { margin-bottom: 0; }
          }
          .payslip-summary { margin-bottom: 12px; border: 1px solid #dbeafe; background: linear-gradient(135deg, #eff6ff, #ffffff); border-radius: 16px; padding: 14px 16px; }
          .payslip-summary h1 { margin: 0; font-size: 25px; font-weight: 900; color: #0f172a; }
          .payslip-summary p { margin: 4px 0 0; font-size: 13px; color: #475569; }
          .pay-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; }
          .pay-table td { border: 1px solid #2457c5; padding: 1.5px 2.5px; font-size: 7px; line-height: 1; vertical-align: middle; }
          .title { font-size: 12px; font-weight: 900; letter-spacing: 0.02em; text-align: center; color: #2457c5; }
          .subtitle { text-align: center; font-weight: 700; font-size: 7px; letter-spacing: 0.02em; }
          .label { font-weight: 700; white-space: nowrap; font-size: 7px; }
          .section { color: #2457c5; font-weight: 900; text-align: center; font-size: 7px; letter-spacing: 0.04em; }
          .right { text-align: right; }
          .center { text-align: center; }
          .logo { width: 80px; height: 80px; object-fit: contain; }
          .detail-cell { font-size: 7px; line-height: 1.02; }
          .detail-label { display: block; margin-bottom: 1px; font-size: 6px; font-weight: 900; letter-spacing: 0.08em; color: #2457c5; text-transform: uppercase; }
          .detail-value { display: block; min-height: 9px; font-weight: 700; color: #0f172a; }
          .detail-empty { background: #fff; }
          .sig-row td { height: 34px; vertical-align: bottom; padding-top: 6px; }
          .sig-name { display: block; padding-top: 8px; border-top: 1px solid #2457c5; font-size: 7px; font-weight: 700; color: #0f172a; }
          .sig-label { display: block; margin-bottom: 3px; font-size: 6px; font-weight: 900; letter-spacing: 0.08em; color: #2457c5; text-transform: uppercase; }
        `}</style>

        {payslips.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No payslips to display.</div>
        ) : (
          <>
            <div className="payslip-summary print:hidden">
              <h1>Office Payroll Payslips</h1>
              <p>
                Department: <span className="font-semibold text-slate-900">{department}</span> •
                Employees: <span className="font-semibold text-slate-900">{payslips.length}</span> •
                Period: <span className="font-semibold text-slate-900">{String(payPeriod || "Monthly").toUpperCase()}</span>
              </p>
            </div>
            {payslipPages.map((page, pageIndex) => (
              <div key={`page-${pageIndex}`} className="payslip-page">
                {page.map((entry, index) => {
                  const employee = entry.employee || {};
                  const row = entry.row || {};
                  const computed = entry.computed || {};
                  return (
                    <div key={`${employee.employeeId || employee.id || index}-${pageIndex}-${index}`} className="payslip-slip">
                      <table className="pay-table">
                        <colgroup>
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "22%" }} />
                          <col style={{ width: "22%" }} />
                          <col style={{ width: "16%" }} />
                          <col style={{ width: "22%" }} />
                        </colgroup>
                        <tbody>
                          <tr>
                            <td rowSpan={4} className="center align-top" style={{ padding: "6px 8px", minWidth: "120px" }}><img className="logo mx-auto" src={logoDataUrl} alt="Rabino Home Builders Corporation" /></td>
                            <td colSpan={4} className="title">RABINO HOME BUILDERS CORPORATION</td>
                          </tr>
                          <tr><td colSpan={4} className="subtitle">PAYSLIP FOR THE PERIOD</td></tr>
                          <tr><td colSpan={4} className="subtitle">{String(payPeriod || "Monthly").toUpperCase()}</td></tr>
                          <tr><td colSpan={4} className="subtitle">{`${text(payoutDate)}${department !== "All" ? ` • ${department}` : ""}`}</td></tr>
                          <tr>
                            <td className="label">EMPLOYEE NAME:</td><td colSpan={2} className="label">{text(employee.fullName)}</td><td className="label">ID NO. :</td><td className="label">{text(employee.employeeId)}</td>
                          </tr>
                          <tr>
                            <td className="label">DESIGNATION :</td><td colSpan={2} className="label">{text(employee.position || employee.department || "Employee")}</td><td className="label">BASIC RATE :</td><td className="label right">{money(row.monthlySalary)}</td>
                          </tr>
                          <tr><td colSpan={2} className="section">SALARY</td><td colSpan={2} className="section">DEDUCTIONS</td><td className="section">OTHER PERSONAL DETAILS</td></tr>
                          <tr><td className="label">NO. OF DAYS</td><td className="right">{number(row.days)}</td><td className="label">SSS</td><td className="right">{money(row.sssAmount)}</td><td className="detail-cell"><span className="detail-label">SSS NO.</span><span className="detail-value">{text(employee.sssNo)}</span></td></tr>
                          <tr><td className="label">HOLIDAY</td><td className="right">{number(row.holiday)}</td><td className="label">SSS LOAN</td><td className="right">{money(row.sssLoan)}</td><td className="detail-cell"><span className="detail-label">PHILHEALTH NO.</span><span className="detail-value">{text(employee.philHealthNo)}</span></td></tr>
                          <tr><td className="label">NO. OF OT HOURS</td><td className="right">{number(row.otHours)}</td><td className="label">PHILHEALTH</td><td className="right">{money(row.philHealthAmount)}</td><td className="detail-cell"><span className="detail-label">PAG-IBIG NO.</span><span className="detail-value">{text(employee.pagIbigNo)}</span></td></tr>
                          <tr><td className="label">LATE MINUTES</td><td className="right">{number(row.lateMinutes)}</td><td className="label">PAG-IBIG</td><td className="right">{money(row.pagIbigAmount)}</td><td className="detail-cell"><span className="detail-label">TIN NO.</span><span className="detail-value">{text(employee.tinNo)}</span></td></tr>
                          <tr><td className="label">BASIC SALARY</td><td className="right">{money(row.monthlySalary)}</td><td className="label">PAGIBIG LOAN</td><td className="right">{money(row.pagIbigLoan)}</td><td className="detail-cell"><span className="detail-label">SIL USED / BAL</span><span className="detail-value">{number(employee.silUsed)} / {number(employee.silBalance)}</span></td></tr>
                          <tr><td className="label">DE MINIMIS BENEFITS</td><td className="right">{money(0)}</td><td className="label">AMICA CREDITS</td><td className="right">{money(row.amicaCredits)}</td><td className="detail-cell detail-empty"></td></tr>
                          <tr><td className="label">OT PAY</td><td className="right">{money(computed.otPay)}</td><td className="label">CASH ADVANCE</td><td className="right">{money(row.cashAdvance)}</td><td className="detail-cell detail-empty"></td></tr>
                          <tr><td className="label">HOLIDAY PAY</td><td className="right">{money(computed.holidayPay)}</td><td className="label">CASH ADVANCE DEDUCTION</td><td className="right">{money(row.cashAdvanceDeduction)}</td><td className="detail-cell detail-empty"></td></tr>
                          <tr><td className="label">ALLOWANCES</td><td className="right">{money(row.allowances)}</td><td className="label">CASH BALANCE</td><td className="right">{money(computed.cashBalance)}</td><td className="detail-cell detail-empty"></td></tr>
                          <tr><td className="label right">TOTAL EARNINGS:</td><td className="right">{money(computed.gross)}</td><td className="label">TOTAL DEDUCTIONS</td><td className="right">{money(computed.totalDeduction)}</td><td className="detail-cell detail-empty"></td></tr>
                          <tr>
                            <td colSpan={5} className="label" style={{ fontSize: "9px", fontWeight: 900, paddingTop: "4px", paddingBottom: "4px" }}>
                              TOTAL NET PAY: <span style={{ fontSize: "11px", fontWeight: 900 }}>{money(computed.netSalary)}</span>
                            </td>
                          </tr>
                          <tr className="sig-row">
                            <td colSpan={2}>
                              <span className="sig-label">Prepared by</span>
                              <span className="sig-name">{text(preparedBy)}</span>
                            </td>
                            <td colSpan={2}>
                              <span className="sig-label">Accounting</span>
                              <span className="sig-name">{text(accountingBy)}</span>
                            </td>
                            <td>
                              <span className="sig-label">Employee signature</span>
                              <span className="sig-name">{text(employee.fullName)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
