import bcrypt from 'bcryptjs';

type AppUserRow = Record<string, unknown> & {
  password?: string | null;
  password_hash?: string | null;
  permissions?: unknown;
};

export function readPermissions(user: AppUserRow | null | undefined): string[] {
  const permissions = user?.permissions;

  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.map((value) => String(value).trim()).filter(Boolean);
}

export function readStoredPassword(user: AppUserRow | null | undefined): string {
  return String(user?.password ?? user?.password_hash ?? '');
}

export async function passwordMatches(storedPassword: string, inputPassword: string): Promise<boolean> {
  if (!storedPassword) {
    return false;
  }

  // Support both legacy plain-text demo values and bcrypt hashes.
  if (storedPassword.startsWith('$2')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return storedPassword === inputPassword;
}

export function hasAdminAccess(user: AppUserRow | null | undefined): boolean {
  const permissions = readPermissions(user);
  return permissions.includes('admin_access');
}

export function hasEmployeeAccess(user: AppUserRow | null | undefined): boolean {
  const permissions = readPermissions(user);
  return permissions.includes('employees') || permissions.includes('payroll') || permissions.includes('attendance') || permissions.includes('admin_access');
}

export function hasAttendanceAccess(user: AppUserRow | null | undefined): boolean {
  const permissions = readPermissions(user);
  return permissions.includes('attendance') || permissions.includes('payroll') || permissions.includes('admin_access');
}

export function hasPayrollAccess(user: AppUserRow | null | undefined): boolean {
  const permissions = readPermissions(user);
  return permissions.includes('payroll') || permissions.includes('admin_access');
}
