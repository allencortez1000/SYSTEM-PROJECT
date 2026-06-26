"use client";

import { useEffect, useRef } from "react";

type RecordDetailsModalProps = {
  title: string;
  subtitle?: string;
  row: Record<string, unknown> | null;
  isOpen: boolean;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CLOSE_EVENT = "record-details-modal-close";

export default function RecordDetailsModal({ title, subtitle, row, isOpen }: RecordDetailsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.dispatchEvent(new Event(CLOSE_EVENT));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!isOpen || !row) return null;

  const entries = Object.entries(row).filter(
    ([, value]) => typeof value !== "object" || value === null,
  );
  const nestedEntries = Object.entries(row).filter(
    ([, value]) => typeof value === "object" && value !== null,
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === overlayRef.current) window.dispatchEvent(new Event(CLOSE_EVENT)); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-slate-950">{title}</h2>
            {subtitle && <p className="mt-1 truncate text-sm font-semibold text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CLOSE_EVENT))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{formatKey(key)}</span>
                <span className="text-right text-sm font-semibold text-slate-800 break-all">{formatValue(value)}</span>
              </div>
            ))}

            {nestedEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{formatKey(key)}</p>
                <div className="space-y-2">
                  {Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => (
                    <div key={subKey} className="flex items-start justify-between gap-4">
                      <span className="text-xs font-semibold text-slate-500">{formatKey(subKey)}</span>
                      <span className="text-right text-xs text-slate-700 break-all">{formatValue(subVal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={() => window.dispatchEvent(new Event(CLOSE_EVENT))} className="primary-button w-full">Close</button>
        </div>
      </div>
    </div>
  );
}
