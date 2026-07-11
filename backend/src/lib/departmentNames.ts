const DEPARTMENT_ALIASES: Record<string, string> = {
  'human resource': 'Human Resources',
  'human resources': 'Human Resources',
  hr: 'Human Resources',
  administration: 'Administration',
  admin: 'Administration',
  'marketing & sales': 'Marketing & Sales',
  'operations & logistics': 'Operations & Logistics',
  'health, safety & environment (hse)': 'Health, Safety & Environment (HSE)',
  construction: 'Construction',
  engineering: 'Engineering',
  'accounting & finance': 'Accounting & Finance',
  main: 'Main',
};

export function canonicalDepartmentName(name: string) {
  const normalized = String(name || '').trim().toLowerCase();
  return DEPARTMENT_ALIASES[normalized] || String(name || '').trim();
}

export function uniqueCanonicalDepartmentNames(names: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      names
        .map((name) => canonicalDepartmentName(String(name || '')))
        .filter(Boolean),
    ),
  );
}
