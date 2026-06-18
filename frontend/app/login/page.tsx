"use client";

import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="section-card max-w-md text-center">
        <p className="eyebrow">Redirecting</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">Opening sign in...</h1>
      </div>
    </main>
  );
}
