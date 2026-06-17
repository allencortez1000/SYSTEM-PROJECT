"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from '../../components/notification';

export default function NewEmployeePage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Human Resources');
  const [position, setPosition] = useState('Employee');
  const [salary, setSalary] = useState(0);
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, department, position, salary, manager, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data && data.errors) {
          setFieldErrors(data.errors);
          setError('Please fix the highlighted fields');
          return;
        }
        throw new Error(data?.message || 'Failed to create employee');
      }
      notify('Employee created');
      router.push('/employees');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold">Add New Employee</h1>
        <p className="mt-2 text-slate-600">Fill details to create a new employee.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Full Name</span>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.fullName ? 'border-red-500' : ''}`}
              aria-label="Full name"
              aria-invalid={fieldErrors?.fullName ? 'true' : 'false'}
              aria-describedby={fieldErrors?.fullName ? 'fullName-error' : undefined}
              required
            />
            {fieldErrors?.fullName && (
              <p id="fullName-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
            )}
          </label>
          <label className="flex flex-col">
            <span className="text-sm text-slate-600">Email</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.email ? 'border-red-500' : ''}`}
              aria-label="Email"
              aria-invalid={fieldErrors?.email ? 'true' : 'false'}
              aria-describedby={fieldErrors?.email ? 'email-error' : undefined}
              required
            />
            {fieldErrors?.email && (
              <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Department</span>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Position</span>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Salary</span>
              <input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className={`mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${fieldErrors?.salary ? 'border-red-500' : ''}`}
                aria-invalid={fieldErrors?.salary ? 'true' : 'false'}
                aria-describedby={fieldErrors?.salary ? 'salary-error' : undefined}
              />
              {fieldErrors?.salary && (
                <p id="salary-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.salary}</p>
              )}
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-slate-600">Manager</span>
              <input
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="mt-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">{loading ? 'Creating…' : 'Create'}</button>
            <Link href="/employees" className="text-sm text-slate-600">← Back to employees</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
