"use client";
/* eslint-disable @next/next/no-serialize */

import type { ReactNode } from "react";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function EmployeeTextField({ id, label, value, onValueChange, error, type = "text", required = false, disabled = false, icon }: TextFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={"w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 " + (error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        required={required}
        disabled={disabled}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </label>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  icon?: ReactNode;
  disabled?: boolean;
  error?: string;
};

export function EmployeeSelectField({ id, label, value, onValueChange, options, icon, disabled, error }: SelectFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={"w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed " + (error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200")}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1 text-sm font-semibold text-red-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </label>
  );
}
