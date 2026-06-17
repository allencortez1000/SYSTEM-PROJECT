"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useNotification } from '../../components/notification';

type Result = {
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxAmount: number;
  employerCost: number;
};

export default function NewPayrollPage() {
  const [basicSalary, setBasicSalary] = useState(5000);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(50);
  const [bonus, setBonus] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [taxRate, setTaxRate] = useState(0.1);
  const [insuranceDeduction, setInsuranceDeduction] = useState(0);
  const [loanDeduction, setLoanDeduction] = useState(0);

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const { notify } = useNotification();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setFieldErrors(null);

    try {
      const res = await fetch('http://localhost:4000/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicSalary: Number(basicSalary),
          overtimeHours: Number(overtimeHours),
          overtimeRate: Number(overtimeRate),
          bonus: Number(bonus),
          allowances: Number(allowances),
          taxRate: Number(taxRate),
          insuranceDeduction: Number(insuranceDeduction),
          loanDeduction: Number(loanDeduction),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          setFieldErrors(data.errors);
          setError('Please fix the highlighted fields');
          return;
        }
        throw new Error(data?.message || 'Payroll calculation failed');
      }

      setResult(data as Result);
      notify('Payroll calculated successfully');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold">New Payroll Run</h1>
        <p className="mt-2 text-slate-600">Fill components and calculate payroll.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Basic Salary</span>
              <input id="basicSalary" type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.basicSalary ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.basicSalary ? 'true' : 'false'} aria-describedby={fieldErrors?.basicSalary ? 'basicSalary-error' : undefined} />
              {fieldErrors?.basicSalary && <p id="basicSalary-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.basicSalary}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Overtime Hours</span>
              <input id="overtimeHours" type="number" value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.overtimeHours ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.overtimeHours ? 'true' : 'false'} aria-describedby={fieldErrors?.overtimeHours ? 'overtimeHours-error' : undefined} />
              {fieldErrors?.overtimeHours && <p id="overtimeHours-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.overtimeHours}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Overtime Rate</span>
              <input id="overtimeRate" type="number" value={overtimeRate} onChange={(e) => setOvertimeRate(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.overtimeRate ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.overtimeRate ? 'true' : 'false'} aria-describedby={fieldErrors?.overtimeRate ? 'overtimeRate-error' : undefined} />
              {fieldErrors?.overtimeRate && <p id="overtimeRate-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.overtimeRate}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Bonus</span>
              <input id="bonus" type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.bonus ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.bonus ? 'true' : 'false'} aria-describedby={fieldErrors?.bonus ? 'bonus-error' : undefined} />
              {fieldErrors?.bonus && <p id="bonus-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.bonus}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Allowances</span>
              <input id="allowances" type="number" value={allowances} onChange={(e) => setAllowances(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.allowances ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.allowances ? 'true' : 'false'} aria-describedby={fieldErrors?.allowances ? 'allowances-error' : undefined} />
              {fieldErrors?.allowances && <p id="allowances-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.allowances}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Tax Rate (0-1)</span>
              <input id="taxRate" step="0.01" type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.taxRate ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.taxRate ? 'true' : 'false'} aria-describedby={fieldErrors?.taxRate ? 'taxRate-error' : undefined} />
              {fieldErrors?.taxRate && <p id="taxRate-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.taxRate}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Insurance Deduction</span>
              <input id="insuranceDeduction" type="number" value={insuranceDeduction} onChange={(e) => setInsuranceDeduction(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.insuranceDeduction ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.insuranceDeduction ? 'true' : 'false'} aria-describedby={fieldErrors?.insuranceDeduction ? 'insuranceDeduction-error' : undefined} />
              {fieldErrors?.insuranceDeduction && <p id="insuranceDeduction-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.insuranceDeduction}</p>}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Loan Deduction</span>
              <input id="loanDeduction" type="number" value={loanDeduction} onChange={(e) => setLoanDeduction(Number(e.target.value))} className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.loanDeduction ? 'border-red-500' : ''}`} aria-invalid={fieldErrors?.loanDeduction ? 'true' : 'false'} aria-describedby={fieldErrors?.loanDeduction ? 'loanDeduction-error' : undefined} />
              {fieldErrors?.loanDeduction && <p id="loanDeduction-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.loanDeduction}</p>}
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              {loading ? 'Calculating…' : 'Calculate'}
            </button>
            <Link href="/" className="text-sm text-slate-600">← Back to dashboard</Link>
          </div>
        </form>

        {error && <p className="mt-3 text-red-600">Error: {error}</p>}

        {result && (
          <div className="mt-4 rounded-md border p-4">
            <p>Gross Earnings: ${result.grossEarnings}</p>
            <p>Tax Amount: ${result.taxAmount}</p>
            <p>Total Deductions: ${result.totalDeductions}</p>
            <p className="font-semibold">Net Pay: ${result.netPay}</p>
            <p>Employer Cost: ${result.employerCost}</p>
          </div>
        )}
        {/* notification displayed by NotificationProvider */}
      </div>
    </div>
  );
}
