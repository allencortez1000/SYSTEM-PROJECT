import React from 'react';
import Link from 'next/link';

export default function PayrollIndex() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Payroll</h1>
      <p className="mt-4 text-slate-600">Manage payroll runs and calculations.</p>
      <div className="mt-6">
        <Link href="/payroll/new" className="rounded bg-brand-600 px-4 py-2 text-white">Create New Payroll</Link>
      </div>
    </div>
  );
}
