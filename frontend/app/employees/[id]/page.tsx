"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Employee = {
  id: number;
  fullName: string;
  email?: string;
  department?: string;
  position?: string;
  salary?: number;
};

export default function EmployeeDetail() {
  const params = useParams();
  const id = params?.id ?? '0';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://localhost:4000/api/employees/${id}`);
        if (!res.ok) throw new Error('Employee not found');
        const data = await res.json();
        setEmployee(data.employee || null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-lg shadow-sm">
        {loading && <p className="text-slate-600">Loading...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {employee && (
          <>
            <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
            <p className="mt-2 text-slate-600">{employee.position}</p>
            <div className="mt-4 space-y-2">
              <p className="text-sm">Email: {employee.email}</p>
              <p className="text-sm">Department: {employee.department}</p>
              <p className="text-sm">Salary: ${employee.salary}</p>
            </div>
          </>
        )}
        <div className="mt-6">
          <Link href="/employees" className="text-sm text-slate-600">← Back to employees</Link>
        </div>
      </div>
    </div>
  );
}
