import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { hasAttendanceAccess, hasEmployeeAccess, hasPayrollAccess } from '../lib/appUser';
import { supabase } from '../lib/supabase';

export interface AuthPayload {
  userId: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ message: 'Only super admin can perform this action' });
  }

  next();
}

async function loadAppUser(userId: string) {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data || null) as Record<string, unknown> | null;
}

export function requireModuleAccess(moduleName: 'employees' | 'attendance' | 'payroll') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role === 'super-admin') {
      return next();
    }

    if (req.user.role === 'department-head-admin') {
      if (moduleName === 'employees' || moduleName === 'attendance' || moduleName === 'payroll') {
        return next();
      }
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (req.user.role !== 'sub-admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    try {
      const appUser = await loadAppUser(req.user.userId);
      const allowed = moduleName === 'employees'
        ? hasEmployeeAccess(appUser)
        : moduleName === 'attendance'
          ? hasAttendanceAccess(appUser)
          : hasPayrollAccess(appUser);

      if (!allowed) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Failed to verify user permissions', error: (error as Error).message });
    }
  };
}
