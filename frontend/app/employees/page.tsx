"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/notification';

type Employee = {
  id: number;
  fullName: string;
  position: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotification();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('http://localhost:4000/api/employees');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEmployees(data.employees || []);
        notify('Employees loaded');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Employees</h1>
          <Link href="/employees/new" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add Employee</Link>
        </div>

        {loading && <p className="text-slate-600">Loading employees...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          {employees?.map((e) => (
            <Link key={e.id} href={`/employees/${e.id}`} className="block rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-rose-400 to-purple-500 flex items-center justify-center text-white font-semibold">{e.fullName.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{e.fullName}</p>
                  <p className="text-sm text-slate-500">{e.position}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-600">← Back to dashboard</Link>
          <Link href="/employees/new" className="text-sm text-brand-600 font-semibold">+ Add new employee</Link>
        </div>
      </div>
      {/* notifications shown by NotificationProvider */}
    </div>
  );
}
