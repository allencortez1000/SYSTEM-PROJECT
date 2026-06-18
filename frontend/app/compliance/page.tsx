const complianceItems = [
  ["Labor filings", "Ready", "bg-emerald-50 text-emerald-700"],
  ["Tax forms", "Review", "bg-amber-50 text-amber-700"],
  ["Policy acknowledgements", "92%", "bg-blue-50 text-blue-700"],
  ["Audit evidence", "Updated", "bg-violet-50 text-violet-700"],
];

export default function CompliancePage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Compliance command</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Stay audit-ready every day</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Monitor compliance tasks, labor reporting, policy acknowledgements, and payroll evidence.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {complianceItems.map(([label, value, tone]) => (
          <div key={label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-black ${tone}`}>{value}</span>
          </div>
        ))}
      </section>

      <section className="section-card">
        <p className="eyebrow">Risk overview</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Compliance checklist</h3>
        <div className="mt-6 space-y-3">
          {["Verify payroll tax settings", "Confirm employee contracts", "Export monthly labor report", "Archive approval trail"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-700">{item}</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">Open</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
