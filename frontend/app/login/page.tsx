"use client";

import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 px-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-blue-600/10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Signing you in...</h1>
            <p className="mt-2 text-sm text-slate-600">Please wait while we redirect you</p>
            <div className="mt-8">
              <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-blue-700"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
