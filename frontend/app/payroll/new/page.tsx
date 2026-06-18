"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNotification } from "../../components/notification";

type Result = {
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxAmount: number;
  employerCost: number;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function computeSssContribution(monthlyCompensation: number) {
  if (monthlyCompensation <= 4250) return 180;
  if (monthlyCompensation <= 4750) return 202.5;
  if (monthlyCompensation <= 5250) return 225;
  if (monthlyCompensation <= 5750) return 247.5;
  if (monthlyCompensation <= 6250) return 270;
  if (monthlyCompensation <= 6750) return 292.5;
  if (monthlyCompensation <= 7250) return 315;
  if (monthlyCompensation <= 7750) return 337.5;
  if (monthlyCompensation <= 8250) return 360;
  if (monthlyCompensation <= 8750) return 382.5;
  if (monthlyCompensation <= 9250) return 405;
  if (monthlyCompensation <= 9750) return 427.5;
  if (monthlyCompensation <= 10250) return 450;
  if (monthlyCompensation <= 10750) return 472.5;
  if (monthlyCompensation <= 11250) return 495;
  if (monthlyCompensation <= 11750) return 517.5;
  if (monthlyCompensation <= 12250) return 540;
  if (monthlyCompensation <= 12750) return 562.5;
  if (monthlyCompensation <= 13250) return 585;
  if (monthlyCompensation <= 13750) return 607.5;
  if (monthlyCompensation <= 14250) return 630;
  if (monthlyCompensation <= 14750) return 652.5;
  if (monthlyCompensation <= 15250) return 675;
  if (monthlyCompensation <= 15750) return 697.5;
  if (monthlyCompensation <= 16250) return 720;
  if (monthlyCompensation <= 16750) return 742.5;
  if (monthlyCompensation <= 17250) return 765;
  if (monthlyCompensation <= 17750) return 787.5;
  if (monthlyCompensation <= 18250) return 810;
  if (monthlyCompensation <= 18750) return 832.5;
  if (monthlyCompensation <= 19250) return 855;
  if (monthlyCompensation <= 19750) return 877.5;
  return 900;
}

function computePagIbigContribution(monthlyCompensation: number) {
  const rate = monthlyCompensation <= 1500 ? 0.01 : 0.02;
  return Math.min(monthlyCompensation * rate, 200);
}

function computePhilHealthContribution(monthlyCompensation: number) {
  const premium = monthlyCompensation * 0.05;
  const monthlyPremium = Math.min(Math.max(premium, 500), 5000);
  return monthlyPremium / 2;
}

export default function NewPayrollPage() {
  const [employeeName, setEmployeeName] = useState("Juan Dela Cruz");
  const [payPeriod, setPayPeriod] = useState("May 2026");

  const [hourlyRate, setHourlyRate] = useState(120);
  const [regularHours, setRegularHours] = useState(160);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(150);
  const [bonus, setBonus] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [loanDeduction, setLoanDeduction] = useState(0);

  const [sssContribution, setSssContribution] = useState(0);
  const [pagIbigContribution, setPagIbigContribution] = useState(0);
  const [philHealthContribution, setPhilHealthContribution] = useState(0);
  const [deductionsEdited, setDeductionsEdited] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const { notify } = useNotification();

  const grossBeforeDeductions = useMemo(() => {
    const basicSalary = hourlyRate * regularHours;
    const overtimePay = overtimeHours * overtimeRate;
    return basicSalary + overtimePay + bonus + allowances;
  }, [allowances, bonus, hourlyRate, overtimeHours, overtimeRate, regularHours]);

  const suggestedDeductions = useMemo(() => {
    return {
      sss: computeSssContribution(grossBeforeDeductions),
      pagIbig: computePagIbigContribution(grossBeforeDeductions),
      philHealth: computePhilHealthContribution(grossBeforeDeductions),
    };
  }, [grossBeforeDeductions]);

  useEffect(() => {
    if (!deductionsEdited) {
      setSssContribution(suggestedDeductions.sss);
      setPagIbigContribution(suggestedDeductions.pagIbig);
      setPhilHealthContribution(suggestedDeductions.philHealth);
    }
  }, [deductionsEdited, suggestedDeductions.sss, suggestedDeductions.pagIbig, suggestedDeductions.philHealth]);

  const estimate = useMemo(() => {
    const basicSalary = hourlyRate * regularHours;
    const overtimePay = overtimeHours * overtimeRate;
    const grossEarnings = basicSalary + overtimePay + bonus + allowances;
    const statutoryDeductions = sssContribution + pagIbigContribution + philHealthContribution;
    const totalDeductions = statutoryDeductions + loanDeduction;
    const netPay = Math.max(0, grossEarnings - totalDeductions);
    const employerCost = grossEarnings + statutoryDeductions;

    return {
      basicSalary,
      overtimePay,
      grossEarnings,
      sssContribution,
      pagIbigContribution,
      philHealthContribution,
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
    pagIbigContribution,
    philHealthContribution,
    regularHours,
    sssContribution,
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

  function resetForm() {
    setEmployeeName("");
    setPayPeriod("May 2026");
    setHourlyRate(120);
    setRegularHours(160);
    setOvertimeHours(0);
    setOvertimeRate(150);
    setBonus(0);
    setAllowances(0);
    setLoanDeduction(0);
    setDeductionsEdited(false);
    setResult(null);
    setError(null);
    setFieldErrors(null);
  }

  function useSuggestedDeductions() {
    setSssContribution(suggestedDeductions.sss);
    setPagIbigContribution(suggestedDeductions.pagIbig);
    setPhilHealthContribution(suggestedDeductions.philHealth);
    setDeductionsEdited(false);
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
              Basic salary is calculated from hourly rate and regular hours.
              SSS, Pag-IBIG, and PhilHealth are auto-suggested but editable.
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
          </div>

          <div className="section-card">
            <div>
              <p className="eyebrow">Step 2</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Hourly basic pay</h3>
              <p className="mt-2 text-sm text-slate-500">
                Basic salary = hourly rate × regular hours.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <NumberField
                id="hourlyRate"
                label="Hourly rate"
                value={hourlyRate}
                onChange={setHourlyRate}
                prefix="₱"
              />

              <NumberField
                id="regularHours"
                label="Regular hours"
                value={regularHours}
                onChange={setRegularHours}
              />

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow">Step 4</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Statutory deductions</h3>
                <p className="mt-2 text-sm text-slate-500">
                  SSS, Pag-IBIG, and PhilHealth are auto-suggested from gross earnings.
                  You can edit each amount manually.
                </p>
              </div>

              <button type="button" onClick={useSuggestedDeductions} className="secondary-button">
                Use suggested
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <EditableDeductionField
                id="sssContribution"
                label="SSS"
                value={sssContribution}
                suggestedValue={suggestedDeductions.sss}
                onChange={(value) => {
                  setSssContribution(value);
                  setDeductionsEdited(true);
                }}
              />

              <EditableDeductionField
                id="pagIbigContribution"
                label="Pag-IBIG"
                value={pagIbigContribution}
                suggestedValue={suggestedDeductions.pagIbig}
                onChange={(value) => {
                  setPagIbigContribution(value);
                  setDeductionsEdited(true);
                }}
              />

              <EditableDeductionField
                id="philHealthContribution"
                label="PhilHealth"
                value={philHealthContribution}
                suggestedValue={suggestedDeductions.philHealth}
                onChange={(value) => {
                  setPhilHealthContribution(value);
                  setDeductionsEdited(true);
                }}
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
          <section className="section-card bg-slate-950 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Live PHP preview</p>
            <h3 className="mt-2 text-2xl font-black">Payroll summary</h3>

            <div className="mt-6 space-y-3">
              <SummaryRow label="Employee" value={employeeName || "Not selected"} />
              <SummaryRow label="Pay period" value={payPeriod || "Not set"} />
              <SummaryRow label="Hourly rate" value={formatCurrency(hourlyRate)} />
              <SummaryRow label="Regular hours" value={`${regularHours} hrs`} />
              <SummaryRow label="Basic salary" value={formatCurrency(estimate.basicSalary)} />
              <SummaryRow label="Overtime pay" value={formatCurrency(estimate.overtimePay)} />
              <SummaryRow label="Gross earnings" value={formatCurrency(estimate.grossEarnings)} />
              <SummaryRow label="SSS" value={formatCurrency(estimate.sssContribution)} />
              <SummaryRow label="Pag-IBIG" value={formatCurrency(estimate.pagIbigContribution)} />
              <SummaryRow label="PhilHealth" value={formatCurrency(estimate.philHealthContribution)} />
              <SummaryRow label="Loan / other deductions" value={formatCurrency(loanDeduction)} />
              <SummaryRow label="Total deductions" value={formatCurrency(estimate.totalDeductions)} />
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
                <ResultRow label="SSS" value={estimate.sssContribution} />
                <ResultRow label="Pag-IBIG" value={estimate.pagIbigContribution} />
                <ResultRow label="PhilHealth" value={estimate.philHealthContribution} />
                <ResultRow label="Total deductions" value={result.totalDeductions} />
                <ResultRow label="Net pay" value={result.netPay} strong />
                <ResultRow label="Employer cost" value={result.employerCost} />
              </div>
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

type EditableDeductionFieldProps = {
  id: string;
  label: string;
  value: number;
  suggestedValue: number;
  onChange: (value: number) => void;
};

function EditableDeductionField({ id, label, value, suggestedValue, onChange }: EditableDeductionFieldProps) {
  const isEdited = Math.abs(value - suggestedValue) > 0.01;

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="text-sm font-bold text-slate-600">
            {label}
          </label>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Suggested: {formatCurrency(suggestedValue)}
          </p>
        </div>

        <span
          className={
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black " +
            (isEdited ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")
          }
        >
          {isEdited ? "Edited" : "Auto"}
        </span>
      </div>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-slate-400">
          ₱
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm"
        />
      </div>
    </div>
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
