"use client";

import type { ReactNode } from "react";
import { filterActionButtonClassName, filterSearchInputClassName } from "./filter-config";

type FilterBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  children?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  onClearFilters?: () => void;
  clearLabel?: string;
  showClear?: boolean;
};

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchLabel = "Search",
  children,
  actions,
  summary,
  onClearFilters,
  clearLabel = "Clear filters",
  showClear = true,
}: FilterBarProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(220px,1.3fr)_repeat(3,minmax(160px,1fr))] xl:items-end">
          {onSearchChange && (
            <div>
              <label className="text-sm font-semibold text-slate-700">{searchLabel}</label>
              <div className="relative mt-2">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
                <input
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={filterSearchInputClassName}
                />
              </div>
            </div>
          )}

          {children}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {summary}
          {showClear && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className={filterActionButtonClassName}
            >
              {clearLabel}
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
