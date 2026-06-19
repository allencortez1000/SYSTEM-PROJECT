"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useNotification } from "../../components/notification";

type ContributionShare = {
  employee: number;
  employer: number;
  total: number;
};

type GovernmentContributions = {
  sss: ContributionShare;
  philHealth: ContributionShare;
  pagIbig: ContributionShare;
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
};

type Result = {
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxAmount: number;
  employerCost: number;
  governmentContributions: GovernmentContributions;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

type PayBasis = "hourly" | "daily" | "monthly";
type PayFrequency = "monthly" | "semi-monthly";

type AttendanceSummary = {
  employeeName: string;
  startDate: string;
  endDate: string;
  presentDays: number;
  remoteDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
  paidDays: number;
  regularHours: number;
  overtimeHours: number;
  totalRecords: number;
};

const basisConfig: Record<PayBasis, { label: string; rateLabel: string; unitLabel: string; unitSuffix: string; formula: string }> = {
  hourly: { label: "Per hour", rateLabel: "Hourly rate", unitLabel: "Regular hours", unitSuffix: "hrs", formula: "Basic salary = hourly rate × regular hours." },
  daily: { label: "Per day", rateLabel: "Daily rate", unitLabel: "Days worked", unitSuffix: "days", formula: "Basic salary = daily rate × days worked." },
  monthly: { label: "Monthly", rateLabel: "Monthly salary", unitLabel: "", unitSuffix: "", formula: "Basic salary = fixed monthly amount." },
};

// Day options: 1–31, plus "End of month".
const dayOptions: { value: string; label: string }[] = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) })),
  { value: "EOM", label: "End of month" },
];

function ordinal(day: number) {
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

function dayLabel(value: string) {
  return value === "EOM" ? "end of month" : ordinal(Number(value));
}

function currentMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthEnd() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeGovernmentContributions(monthlyCompensation: number): GovernmentContributions {
  const compensation = Math.max(0, Number(monthlyCompensation) || 0);

  /*
    SSS formula used for the live preview:
    - Monthly Salary Credit (MSC) uses gross monthly compensation.
    - Minimum MSC is ₱5,000.
    - Maximum MSC is capped at ₱35,000.
    - Employee share = MSC × 5%.
    - Employer share = MSC × 10%.
    - Total = MSC × 15%.
  */
  const sssMsc = clamp(compensation, 5000, 35000);
  const sssEmployee = roundCurrency(sssMsc * 0.05);
  const sssEmployer = roundCurrency(sssMsc * 0.10);

  /*
    PhilHealth formula:
    - Salary base is capped between ₱10,000 and ₱100,000.
    - Total premium = salary base × 5%.
    - Employee and employer split the premium equally.
  */
  const philHealthBase = clamp(compensation, 10000, 100000);
  const philHealthTotal = roundCurrency(philHealthBase * 0.05);
  const philHealthEmployee = roundCurrency(philHealthTotal / 2);
  const philHealthEmployer = roundCurrency(philHealthTotal / 2);

  /*
    Pag-IBIG formula:
    - Salary base is capped at ₱10,000.
    - If monthly compensation is <= ₱1,500, employee rate is 1%.
    - If monthly compensation is > ₱1,500, employee rate is 2%.
    - Employer rate is 2%.
    - Employee and employer contributions are each capped at ₱200.
  */
  const pagIbigBase = Math.min(compensation, 10000);
  const pagIbigEmployeeRate = compensation <= 1500 ? 0.01 : 0.02;
  const pagIbigEmployee = roundCurrency(Math.min(pagIbigBase * pagIbigEmployeeRate, 200));
  const pagIbigEmployer = roundCurrency(Math.min(pagIbigBase * 0.02, 200));

  const sss = {
    employee: sssEmployee,
    employer: sssEmployer,
    total: roundCurrency(sssEmployee + sssEmployer),
  };
  const philHealth = {
    employee: philHealthEmployee,
    employer: philHealthEmployer,
    total: roundCurrency(philHealthEmployee + philHealthEmployer),
  };
  const pagIbig = {
    employee: pagIbigEmployee,
    employer: pagIbigEmployer,
    total: roundCurrency(pagIbigEmployee + pagIbigEmployer),
  };

  return {
    sss,
    philHealth,
    pagIbig,
    totalEmployeeDeduction: roundCurrency(sss.employee + philHealth.employee + pagIbig.employee),
    totalEmployerContribution: roundCurrency(sss.employer + philHealth.employer + pagIbig.employer),
  };
}

export default function NewPayrollPage() {
  const [employeeName, setEmployeeName] = useState("Juan Dela Cruz");
  const [payPeriod, setPayPeriod] = useState("May 2026");

  const [payBasis, setPayBasis] = useState<PayBasis>("hourly");
  const [hourlyRate, setHourlyRate] = useState(120);
  const [regularHours, setRegularHours] = useState(160);

  const [payFrequency, setPayFrequency] = useState<PayFrequency>("semi-monthly");
  const [payoutDay, setPayoutDay] = useState("30");
  const [firstCutoffDay, setFirstCutoffDay] = useState("15");
  const [secondCutoffDay, setSecondCutoffDay] = useState("30");
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(150);
  const [bonus, setBonus] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [loanDeduction, setLoanDeduction] = useState(0);

  const [attendanceStartDate, setAttendanceStartDate] = useState(currentMonthStart());
  const [attendanceEndDate, setAttendanceEndDate] = useState(currentMonthEnd());
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const { notify } = useNotification();

  const grossBeforeDeductions = useMemo(() => {
    const basicSalary = payBasis === "monthly" ? hourlyRate : hourlyRate * regularHours;
    const overtimePay = overtimeHours * overtimeRate;
    return basicSalary + overtimePay + bonus + allowances;
  }, [allowances, bonus, hourlyRate, overtimeHours, overtimeRate, payBasis, regularHours]);

  const payoutSchedule = useMemo(() => {
    if (payFrequency === "monthly") {
      return `Monthly · every ${dayLabel(payoutDay)}`;
    }
    return `Semi-monthly · every ${dayLabel(firstCutoffDay)} and ${dayLabel(secondCutoffDay)}`;
  }, [payFrequency, payoutDay, firstCutoffDay, secondCutoffDay]);

  const governmentContributions = useMemo(
    () => computeGovernmentContributions(grossBeforeDeductions),
    [grossBeforeDeductions],
  );


  const estimate = useMemo(() => {
    const basicSalary = payBasis === "monthly" ? hourlyRate : hourlyRate * regularHours;
    const overtimePay = overtimeHours * overtimeRate;
    const grossEarnings = basicSalary + overtimePay + bonus + allowances;
    const statutoryDeductions = governmentContributions.totalEmployeeDeduction;
    const totalDeductions = statutoryDeductions + loanDeduction;
    const netPay = Math.max(0, grossEarnings - totalDeductions);
    const employerCost = grossEarnings + governmentContributions.totalEmployerContribution;

    return {
      basicSalary,
      overtimePay,
      grossEarnings,
      sssContribution: governmentContributions.sss.employee,
      pagIbigContribution: governmentContributions.pagIbig.employee,
      philHealthContribution: governmentContributions.philHealth.employee,
      governmentContributions,
      statutoryDeductions,
      totalDeductions,
      netPay,
      employerCost,
    };
  }, [
    allowances,
    bonus,
    hourlyRate,
    loanDeduction,
    overtimeHours,
    overtimeRate,
    governmentContributions,
    payBasis,
    regularHours,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setFieldErrors(null);

    try {
      const res = await fetch("http://localhost:4000/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicSalary: Number(estimate.basicSalary),
          overtimeHours: Number(overtimeHours),
          overtimeRate: Number(overtimeRate),
          bonus: Number(bonus),
          allowances: Number(allowances),
          taxRate: 0,
          insuranceDeduction: Number(estimate.statutoryDeductions),
          loanDeduction: Number(loanDeduction),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields.");
          return;
        }

        throw new Error(data?.message || "Payroll calculation failed");
      }

      setResult({
        ...data,
        taxAmount: 0,
      } as Result);
      notify("Philippine payroll calculated successfully");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceSummary() {
    setAttendanceLoading(true);
    setAttendanceError(null);
    setAttendanceSummary(null);

    try {
      const params = new URLSearchParams({
        employeeName,
        startDate: attendanceStartDate,
        endDate: attendanceEndDate,
      });
      const res = await fetch(`http://localhost:4000/api/payroll/attendance-summary?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load attendance summary");
      }

      setAttendanceSummary(data.summary);
      notify("Attendance loaded from Supabase");
    } catch (err) {
      setAttendanceError((err as Error).message);
    } finally {
      setAttendanceLoading(false);
    }
  }

  function applyAttendanceToPayroll() {
    if (!attendanceSummary) return;

    if (payBasis === "hourly") {
      setRegularHours(attendanceSummary.regularHours);
    } else if (payBasis === "daily") {
      setRegularHours(attendanceSummary.paidDays);
    }

    setOvertimeHours(attendanceSummary.overtimeHours);
    setResult(null);
    setSaveSuccess(null);
    notify("Attendance values applied to payroll");
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch("http://localhost:4000/api/payroll/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName,
          payPeriod,
          payBasis,
          payFrequency,
          payoutDay,
          firstCutoffDay,
          secondCutoffDay,
          rate: hourlyRate,
          units: regularHours,
          overtimeHours,
          overtimeRate,
          bonus,
          allowances,
          sssContribution: result.governmentContributions.sss.employee,
          pagIbigContribution: result.governmentContributions.pagIbig.employee,
          philHealthContribution: result.governmentContributions.philHealth.employee,
          loanDeduction,
          basicSalary: estimate.basicSalary,
          grossEarnings: result.grossEarnings,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          employerCost: result.employerCost,
          attendanceSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save payroll run");
      }

      setSaveSuccess(`Saved as ${data.runCode}`);
      notify("Payroll run saved to Supabase");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEmployeeName("");
    setPayPeriod("May 2026");
    setPayBasis("hourly");
    setHourlyRate(120);
    setRegularHours(160);
    setPayFrequency("semi-monthly");
    setPayoutDay("30");
    setFirstCutoffDay("15");
    setSecondCutoffDay("30");
    setAttendanceStartDate(currentMonthStart());
    setAttendanceEndDate(currentMonthEnd());
    setAttendanceSummary(null);
    setAttendanceError(null);
    setOvertimeHours(0);
    setOvertimeRate(150);
    setBonus(0);
    setAllowances(0);
    setLoanDeduction(0);
    setResult(null);
    setError(null);
    setFieldErrors(null);
    setSaveSuccess(null);
  }


  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Philippine payroll calculator</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Calculate payroll in Philippine Peso
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Compute basic pay per hour, per day, or monthly, and set your payroll
              release schedule. SSS, Pag-IBIG, and PhilHealth are computed automatically.
            </p>
          </div>

          <Link href="/payroll" className="secondary-button">
            Back to payroll center
          </Link>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0 space-y-6">
          <div className="section-card">
            <div>
              <p className="eyebrow">Step 1</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Employee and pay period</h3>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-bold text-slate-600">Employee name</span>
                <input
                  value={employeeName}
                  onChange={(event) => setEmployeeName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  placeholder="Employee name"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-bold text-slate-600">Pay period</span>
                <input
                  value={payPeriod}
                  onChange={(event) => setPayPeriod(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  placeholder="May 2026"
                />
              </label>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <span className="text-sm font-bold text-slate-600">Payroll release schedule</span>
              <p className="mt-1 text-sm text-slate-500">
                Choose when payroll is released, like in private companies (e.g. every 15th and 30th).
              </p>

              <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1">
                {(["monthly", "semi-monthly"] as PayFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setPayFrequency(freq)}
                    className={
                      "rounded-xl px-4 py-2 text-sm font-bold capitalize transition " +
                      (payFrequency === freq ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700")
                    }
                  >
                    {freq === "monthly" ? "Monthly" : "Semi-monthly"}
                  </button>
                ))}
              </div>

              {payFrequency === "monthly" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="text-sm font-bold text-slate-600">Payout day of the month</span>
                    <select
                      value={payoutDay}
                      onChange={(event) => setPayoutDay(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      {dayOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="text-sm font-bold text-slate-600">First payout day</span>
                    <select
                      value={firstCutoffDay}
                      onChange={(event) => setFirstCutoffDay(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      {dayOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-bold text-slate-600">Second payout day</span>
                    <select
                      value={secondCutoffDay}
                      onChange={(event) => setSecondCutoffDay(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      {dayOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                {payoutSchedule}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-600">Attendance period</span>
                  <p className="mt-1 text-sm text-slate-500">
                    Load attendance records from Supabase, then use them to fill payroll hours or paid days.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadAttendanceSummary}
                  disabled={attendanceLoading || !employeeName || !attendanceStartDate || !attendanceEndDate}
                  className="secondary-button disabled:opacity-50"
                >
                  {attendanceLoading ? "Loading attendance..." : "Load attendance from Supabase"}
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block min-w-0">
                  <span className="text-sm font-bold text-slate-600">Attendance start date</span>
                  <input
                    type="date"
                    value={attendanceStartDate}
                    onChange={(event) => setAttendanceStartDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="text-sm font-bold text-slate-600">Attendance end date</span>
                  <input
                    type="date"
                    value={attendanceEndDate}
                    onChange={(event) => setAttendanceEndDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>

              {attendanceError && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {attendanceError}
                </p>
              )}

              {attendanceSummary && (
                <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-emerald-800">Attendance loaded for {attendanceSummary.employeeName}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        {attendanceSummary.startDate} to {attendanceSummary.endDate} · {attendanceSummary.totalRecords} records found
                      </p>
                    </div>
                    <button type="button" onClick={applyAttendanceToPayroll} className="primary-button">
                      Use attendance in payroll
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <AttendanceStat label="Paid days" value={attendanceSummary.paidDays} />
                    <AttendanceStat label="Regular hours" value={attendanceSummary.regularHours} />
                    <AttendanceStat label="Present" value={attendanceSummary.presentDays} />
                    <AttendanceStat label="Remote" value={attendanceSummary.remoteDays} />
                    <AttendanceStat label="Leave" value={attendanceSummary.leaveDays} />
                    <AttendanceStat label="Late" value={attendanceSummary.lateDays} />
                    <AttendanceStat label="Absent" value={attendanceSummary.absentDays} />
                    <AttendanceStat label="Overtime hours" value={attendanceSummary.overtimeHours} />
                  </div>

                  <p className="mt-4 text-xs font-semibold text-emerald-700">
                    Hourly basis uses regular hours. Daily basis uses paid days. Monthly basis keeps the fixed monthly salary and shows attendance for tracking.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="section-card">
            <div>
              <p className="eyebrow">Step 2</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Basic pay</h3>
              <p className="mt-2 text-sm text-slate-500">
                {basisConfig[payBasis].formula}
              </p>
            </div>

            <div className="mt-5 inline-flex rounded-2xl bg-slate-100 p-1">
              {(["hourly", "daily", "monthly"] as PayBasis[]).map((basis) => (
                <button
                  key={basis}
                  type="button"
                  onClick={() => setPayBasis(basis)}
                  className={
                    "rounded-xl px-4 py-2 text-sm font-bold transition " +
                    (payBasis === basis ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700")
                  }
                >
                  {basisConfig[basis].label}
                </button>
              ))}
            </div>

            <div className={"mt-6 grid gap-4 " + (payBasis === "monthly" ? "md:grid-cols-2" : "md:grid-cols-3")}>
              <NumberField
                id="hourlyRate"
                label={basisConfig[payBasis].rateLabel}
                value={hourlyRate}
                onChange={setHourlyRate}
                prefix="₱"
              />

              {payBasis !== "monthly" && (
                <NumberField
                  id="regularHours"
                  label={basisConfig[payBasis].unitLabel}
                  value={regularHours}
                  onChange={setRegularHours}
                />
              )}

              <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">Computed basic salary</p>
                <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
                  {formatCurrency(estimate.basicSalary)}
                </p>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div>
              <p className="eyebrow">Step 3</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Additional earnings</h3>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <NumberField
                id="allowances"
                label="Allowances"
                value={allowances}
                onChange={setAllowances}
                error={fieldErrors?.allowances}
                prefix="₱"
              />

              <NumberField
                id="bonus"
                label="Bonus"
                value={bonus}
                onChange={setBonus}
                error={fieldErrors?.bonus}
                prefix="₱"
              />

              <NumberField
                id="overtimeHours"
                label="Overtime hours"
                value={overtimeHours}
                onChange={setOvertimeHours}
                error={fieldErrors?.overtimeHours}
              />

              <NumberField
                id="overtimeRate"
                label="Overtime rate per hour"
                value={overtimeRate}
                onChange={setOvertimeRate}
                error={fieldErrors?.overtimeRate}
                prefix="₱"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Overtime pay</p>
              <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
                {formatCurrency(estimate.overtimePay)}
              </p>
            </div>
          </div>

          <div className="section-card">
            <div>
              <p className="eyebrow">Step 4</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Statutory deductions</h3>
              <p className="mt-2 text-sm text-slate-500">
                SSS, Pag-IBIG, and PhilHealth are computed from gross monthly earnings.
                Employee shares reduce net pay; employer shares are added to employer cost.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatutoryContributionCard
                label="SSS"
                employee={estimate.governmentContributions.sss.employee}
                employer={estimate.governmentContributions.sss.employer}
                total={estimate.governmentContributions.sss.total}
              />

              <StatutoryContributionCard
                label="Pag-IBIG"
                employee={estimate.governmentContributions.pagIbig.employee}
                employer={estimate.governmentContributions.pagIbig.employer}
                total={estimate.governmentContributions.pagIbig.total}
              />

              <StatutoryContributionCard
                label="PhilHealth"
                employee={estimate.governmentContributions.philHealth.employee}
                employer={estimate.governmentContributions.philHealth.employer}
                total={estimate.governmentContributions.philHealth.total}
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <NumberField
                id="loanDeduction"
                label="Loan / other deductions"
                value={loanDeduction}
                onChange={setLoanDeduction}
                error={fieldErrors?.loanDeduction}
                prefix="₱"
              />

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">All deductions</p>
                <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
                  {formatCurrency(estimate.totalDeductions)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="section-card text-white" style={{ background: "rgb(15 23 42)" }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Live PHP preview</p>
            <h3 className="mt-2 text-2xl font-black">Payroll summary</h3>

            <div className="mt-6 space-y-3">
              <SummaryGroupTitle label="Employee details" />
              <SummaryRow label="Employee" value={employeeName || "Not selected"} />
              <SummaryRow label="Pay period" value={payPeriod || "Not set"} />

              <SummaryGroupTitle label="Payroll schedule" />
              <SummaryRow label="Pay frequency" value={payFrequency === "monthly" ? "Monthly" : "Semi-monthly"} />
              <SummaryRow label="Release schedule" value={payoutSchedule} />
              <SummaryRow label="Attendance period" value={`${attendanceStartDate} to ${attendanceEndDate}`} />
              {payFrequency === "monthly" ? (
                <SummaryRow label="Payout day" value={dayLabel(payoutDay)} />
              ) : (
                <>
                  <SummaryRow label="First payout day" value={dayLabel(firstCutoffDay)} />
                  <SummaryRow label="Second payout day" value={dayLabel(secondCutoffDay)} />
                </>
              )}

              {attendanceSummary && (
                <>
                  <SummaryGroupTitle label="Attendance from Supabase" />
                  <SummaryRow label="Records found" value={String(attendanceSummary.totalRecords)} />
                  <SummaryRow label="Paid days" value={String(attendanceSummary.paidDays)} />
                  <SummaryRow label="Regular hours" value={`${attendanceSummary.regularHours} hrs`} />
                  <SummaryRow label="Present" value={String(attendanceSummary.presentDays)} />
                  <SummaryRow label="Remote" value={String(attendanceSummary.remoteDays)} />
                  <SummaryRow label="Leave" value={String(attendanceSummary.leaveDays)} />
                  <SummaryRow label="Late" value={String(attendanceSummary.lateDays)} />
                  <SummaryRow label="Absent" value={String(attendanceSummary.absentDays)} />
                </>
              )}

              <SummaryGroupTitle label="Basic pay inputs" />
              <SummaryRow label="Pay basis" value={basisConfig[payBasis].label} />
              <SummaryRow label={basisConfig[payBasis].rateLabel} value={formatCurrency(hourlyRate)} />
              {payBasis !== "monthly" ? (
                <SummaryRow label={basisConfig[payBasis].unitLabel} value={`${regularHours} ${basisConfig[payBasis].unitSuffix}`} />
              ) : (
                <SummaryRow label="Regular units" value="Fixed monthly salary" />
              )}
              <SummaryRow label="Computed basic salary" value={formatCurrency(estimate.basicSalary)} />

              <SummaryGroupTitle label="Additional earnings inputs" />
              <SummaryRow label="Allowances" value={formatCurrency(allowances)} />
              <SummaryRow label="Bonus" value={formatCurrency(bonus)} />
              <SummaryRow label="Overtime hours" value={`${overtimeHours} hrs`} />
              <SummaryRow label="Overtime rate" value={formatCurrency(overtimeRate)} />
              <SummaryRow label="Overtime pay" value={formatCurrency(estimate.overtimePay)} />
              <SummaryRow label="Gross earnings" value={formatCurrency(estimate.grossEarnings)} />

              <SummaryGroupTitle label="Employee deductions" />
              <SummaryRow label="SSS employee" value={formatCurrency(estimate.governmentContributions.sss.employee)} />
              <SummaryRow label="Pag-IBIG employee" value={formatCurrency(estimate.governmentContributions.pagIbig.employee)} />
              <SummaryRow label="PhilHealth employee" value={formatCurrency(estimate.governmentContributions.philHealth.employee)} />
              <SummaryRow label="Loan / other deductions" value={formatCurrency(loanDeduction)} />
              <SummaryRow label="Withholding tax" value="Disabled for now" />
              <SummaryRow label="Total deductions" value={formatCurrency(estimate.totalDeductions)} />

              <SummaryGroupTitle label="Employer contributions" />
              <SummaryRow label="SSS employer" value={formatCurrency(estimate.governmentContributions.sss.employer)} />
              <SummaryRow label="Pag-IBIG employer" value={formatCurrency(estimate.governmentContributions.pagIbig.employer)} />
              <SummaryRow label="PhilHealth employer" value={formatCurrency(estimate.governmentContributions.philHealth.employer)} />
              <SummaryRow label="Total employer share" value={formatCurrency(estimate.governmentContributions.totalEmployerContribution)} />
              <SummaryRow label="Employer cost" value={formatCurrency(estimate.employerCost)} />
            </div>

            <div className="mt-6 rounded-3xl bg-white p-5 text-slate-950">
              <p className="text-sm font-bold text-slate-500">Estimated net pay</p>
              <p className="mt-2 break-words text-3xl font-black sm:text-4xl">{formatCurrency(estimate.netPay)}</p>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <div className="mt-6 grid gap-3">
              <button type="submit" disabled={loading} className="primary-button bg-white text-slate-950 hover:bg-sky-100">
                {loading ? "Calculating..." : "Calculate final payroll"}
              </button>
              <button type="button" onClick={resetForm} className="secondary-button border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                Reset form
              </button>
            </div>
          </section>

          {result && (
            <section className="section-card">
              <p className="eyebrow">Final result</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Payroll engine output</h3>

              <div className="mt-6 space-y-3">
                <ResultRow label="Gross earnings" value={result.grossEarnings} />
                <ResultRow label="SSS employee" value={result.governmentContributions.sss.employee} />
                <ResultRow label="Pag-IBIG employee" value={result.governmentContributions.pagIbig.employee} />
                <ResultRow label="PhilHealth employee" value={result.governmentContributions.philHealth.employee} />
                <ResultRow label="Total deductions" value={result.totalDeductions} />
                <ResultRow label="Net pay" value={result.netPay} strong />
                <ResultRow label="Employer contributions" value={result.governmentContributions.totalEmployerContribution} />
                <ResultRow label="Employer cost" value={result.employerCost} />
              </div>

              {saveSuccess && (
                <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  ✓ {saveSuccess}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !!saveSuccess}
                className="primary-button mt-6 w-full disabled:opacity-50"
              >
                {saving ? "Saving..." : saveSuccess ? "Saved to Supabase" : "Save to Supabase"}
              </button>
            </section>
          )}
        </aside>
      </form>
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  step?: string;
  prefix?: string;
};

function NumberField({ id, label, value, onChange, error, step = "1", prefix }: NumberFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <div className="relative mt-2 min-w-0">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-slate-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className={
            "w-full min-w-0 rounded-2xl border bg-white py-3 text-sm " +
            (prefix ? "pl-9 pr-4 " : "px-4 ") +
            (error ? "border-red-500" : "border-slate-200")
          }
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}

function AttendanceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-xs font-bold text-emerald-700">{label}</p>
      <p className="mt-1 text-xl font-black text-emerald-950">{value}</p>
    </div>
  );
}

function StatutoryContributionCard({ label, employee, employer, total }: { label: string; employee: number; employer: number; total: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-600">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Computed automatically</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
          Auto
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Employee deduction</span>
          <span className="font-black text-slate-950">{formatCurrency(employee)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Employer share</span>
          <span className="font-black text-slate-950">{formatCurrency(employer)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
          <span className="font-bold text-slate-600">Total</span>
          <span className="font-black text-slate-950">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function SummaryGroupTitle({ label }: { label: string }) {
  return (
    <p className="pt-3 text-[11px] font-black uppercase tracking-[0.18em] text-sky-300 first:pt-0">
      {label}
    </p>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-white/10 pb-3 text-sm">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-white">{value}</span>
    </div>
  );
}

function ResultRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
      <span className="font-bold text-slate-600">{label}</span>
      <span className={strong ? "break-words text-right text-xl font-black text-emerald-700" : "break-words text-right font-black text-slate-950"}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
