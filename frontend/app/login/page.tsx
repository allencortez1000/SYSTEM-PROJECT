"use client";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 px-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-blue-600/10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
              <img src="/rabino-logo.svg" alt="Rabino Home Builders Corporation logo" className="h-full w-full object-contain" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Rabino Home Builders Corporation</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-2 text-sm text-slate-600">Preparing your HR workspace.</p>
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
