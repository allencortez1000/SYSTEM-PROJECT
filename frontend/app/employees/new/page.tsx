"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "../../components/notification";

export default function NewEmployeePage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Human Resources");
  const [position, setPosition] = useState("Employee");
  const [salary, setSalary] = useState(0);
  const [manager, setManager] = useState("");
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch("http://localhost:4000/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName, email, department, position, salary, manager, status }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data && data.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
          return;
        }

        throw new Error(data?.message || "Failed to create employee");
      }

      notify("Employee created");
      router.push("/employees");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">New employee</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Add employee record
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Create a new employee profile with Philippine Peso compensation details.
            </p>
          </div>

          <Link href="/employees" className="secondary-button">
            Back to employees
          </Link>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="section-card space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            error={fieldErrors?.fullName}
            required
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors?.email}
            required
          />

          <TextField
            id="department"
            label="Department"
            value={department}
            onChange={setDepartment}
          />

          <TextField
            id="position"
            label="Position"
            value={position}
            onChange={setPosition}
          />

          <label className="block min-w-0">
            <span className="text-sm font-bold text-slate-600">Salary / monthly rate</span>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-slate-400">
                ₱
              </span>
              <input
                id="salary"
                type="number"
                min="0"
                step="0.01"
                value={salary}
                onChange={(event) => setSalary(Math.max(0, Number(event.target.value)))}
                className={
                  "w-full rounded-2xl border bg-white py-3 pl-9 pr-4 text-sm " +
                  (fieldErrors?.salary ? "border-red-500" : "border-slate-200")
                }
                aria-invalid={fieldErrors?.salary ? "true" : "false"}
                aria-describedby={fieldErrors?.salary ? "salary-error" : undefined}
              />
            </div>
            {fieldErrors?.salary && (
              <p id="salary-error" role="alert" className="mt-2 text-sm font-semibold text-red-600">
                {fieldErrors.salary}
              </p>
            )}
          </label>

          <TextField
            id="manager"
            label="Manager"
            value={manager}
            onChange={setManager}
          />

          <label className="block min-w-0">
            <span className="text-sm font-bold text-slate-600">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="Active">Active</option>
              <option value="Onboarding">Onboarding</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={loading} className="primary-button">
            {loading ? "Creating..." : "Create employee"}
          </button>
          <Link href="/employees" className="secondary-button">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
};

function TextField({ id, label, value, onChange, error, type = "text", required = false }: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={
          "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm " +
          (error ? "border-red-500" : "border-slate-200")
        }
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}
