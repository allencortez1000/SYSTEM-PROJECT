'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNotification } from '../components/notification';

const statusOptions = ['Present', 'Absent', 'Leave', 'Remote'] as const;

type AttendanceRecord = {
  id: number;
  employeeName: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeName: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Present',
    checkIn: '09:00',
    checkOut: '17:00',
    notes: '',
  });
  const { notify } = useNotification();

  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Leave: 0, Remote: 0 };
    records.forEach((record) => {
      const status = record.status as keyof typeof counts;
      if (status in counts) counts[status] += 1;
    });
    return counts;
  }, [records]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:4000/api/attendance');
        if (!res.ok) throw new Error('Failed to load attendance');
        const data = await res.json();
        setRecords(data.attendance || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Could not add attendance');

      setRecords((prev) => [data.record, ...prev]);
      setForm((prev) => ({ ...prev, employeeName: '', notes: '' }));
      notify('Attendance record added');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-2 text-slate-600">Track daily presence, leave, and remote work.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Summary</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(summary).map(([status, value]) => (
                  <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">{status}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-600">Employee name</span>
                  <input value={form.employeeName} onChange={(event) => handleChange('employeeName', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-600">Date</span>
                  <input type="date" value={form.date} onChange={(event) => handleChange('date', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm text-slate-600">Status</span>
                  <select value={form.status} onChange={(event) => handleChange('status', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none">
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-slate-600">Check-in</span>
                  <input type="time" value={form.checkIn} onChange={(event) => handleChange('checkIn', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-600">Check-out</span>
                  <input type="time" value={form.checkOut} onChange={(event) => handleChange('checkOut', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-slate-600">Notes</span>
                <textarea value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none" />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">Add attendance record</button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Latest attendance</h2>
              <p className="mt-1 text-sm text-slate-500">Most recent records for quick review.</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-slate-500">Employee</th>
                  <th className="px-4 py-3 text-slate-500">Date</th>
                  <th className="px-4 py-3 text-slate-500">Status</th>
                  <th className="px-4 py-3 text-slate-500">Check-in</th>
                  <th className="px-4 py-3 text-slate-500">Check-out</th>
                  <th className="px-4 py-3 text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading attendance…</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No attendance records yet.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-900">{record.employeeName}</td>
                      <td className="px-4 py-4 text-slate-600">{record.date}</td>
                      <td className="px-4 py-4 text-slate-600">{record.status}</td>
                      <td className="px-4 py-4 text-slate-600">{record.checkIn || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{record.checkOut || '—'}</td>
                      <td className="px-4 py-4 text-slate-600">{record.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
