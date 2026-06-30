import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = Router();

type AppUser = {
  id: string;
  username: string;
  email: string;
  password?: string; // hashed password stored in DB column `password`
  password_hash?: string; // legacy fallback during migration
  role: string;
  full_name: string;
  is_active: boolean;
  permissions?: string[];
};

function createToken(user: AppUser) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.full_name,
      permissions: user.permissions || [],
    },
    process.env.JWT_SECRET ?? 'secret',
    { expiresIn: '8h' },
  );
}

async function getDefaultOrganizationId() {
  const { data: existingOrg, error: existingOrgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Demo Company')
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingOrgError) {
    throw existingOrgError;
  }

  if (existingOrg && existingOrg.length > 0) {
    return existingOrg[0].id as string;
  }

  const { data: newOrg, error: newOrgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Company',
      legal_name: 'Demo Company Philippines Inc.',
      country: 'Philippines',
      currency: 'PHP',
    })
    .select('id')
    .single();

  if (newOrgError) {
    throw newOrgError;
  }

  return newOrg.id as string;
}

async function ensureAdminUser() {
  const organizationId = await getDefaultOrganizationId();
  const passwordHash = 'admin';

  const { data: existingUsers, error: existingError } = await supabase
    .from('app_users')
    .select('id, username, email, password, role, full_name, is_active')
    .eq('username', 'admin')
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  const existingAdmin = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

  if (existingAdmin) {
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('app_users')
      .update({
              organization_id: organizationId,
              email: 'admin@hrpayroll.local',
              username: 'admin',
              password: passwordHash,
              role: 'super-admin',
              full_name: 'System Administrator',
              is_active: true,
            })
            .eq('id', existingAdmin.id)
            .select('id, username, email, password, role, full_name, is_active')
            .single();

    if (updateError) {
      throw updateError;
    }

    return updatedAdmin as AppUser;
  }

  const { data: createdAdmin, error: createError } = await supabase
    .from('app_users')
    .insert({
          organization_id: organizationId,
          full_name: 'System Administrator',
          email: 'admin@hrpayroll.local',
          username: 'admin',
          password: passwordHash,
          role: 'super-admin',
          is_active: true,
        })
        .select('id, username, email, password, role, full_name, is_active')
        .single();

  if (createError) {
    throw createError;
  }

  return createdAdmin as AppUser;
}

router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginName = String(username || email || '').trim();
    const loginPassword = String(password || '');

    if (!loginName || !loginPassword) {
      return res.status(400).json({ message: 'Username and password are required' });
    }



    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, username, email, password, role, full_name, is_active')
      .eq('username', loginName)
      .limit(1);

    if (error) {
      throw error;
    }

    const user = users && users.length > 0 ? (users[0] as AppUser) : null;

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const typedUser = user as AppUser;
    const isValid = String(typedUser.password || '') === loginPassword;

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // fetch permissions for the user if present in DB
    const { data: permsResult, error: permsError } = await supabase
      .from('app_users')
      .select('permissions')
      .eq('id', typedUser.id)
      .limit(1);

    if (permsError) throw permsError;
    const permsRow = permsResult && permsResult[0];
    const permissions = Array.isArray(permsRow?.permissions) ? permsRow.permissions.map((p: unknown) => String(p)) : [];

    // attach permissions to typedUser for token creation
    (typedUser as any).permissions = permissions;

    const token = createToken(typedUser);

    res.json({
      token,
      user: {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        role: typedUser.role,
        name: typedUser.full_name,
        permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Login failed',
      error: (error as Error).message,
    });
  }
});

router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'User not authenticated' });
    const { data, error } = await supabase.from('app_users').select('id, username, email, role, full_name, is_active, permissions').eq('id', req.user.userId).limit(1);
    if (error) throw error;
    const row = data && data[0];
    if (!row) return res.status(404).json({ message: 'User not found' });
    res.json({ user: { id: row.id, username: row.username, email: row.email, role: row.role, name: row.full_name, permissions: row.permissions || [] } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user', error: (err as Error).message });
  }
});

router.post('/signup', async (_, res) => {
  res.status(403).json({
    message: 'Public signup is disabled. Contact your system super admin.',
  });
});

export default router;
