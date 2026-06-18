import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

const router = Router();

type AppUser = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  full_name: string;
  is_active: boolean;
};

function createToken(user: AppUser) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.full_name,
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
  const passwordHash = bcrypt.hashSync('admin', 10);

  const { data: existingUsers, error: existingError } = await supabase
    .from('app_users')
    .select('id, username, email, password_hash, role, full_name, is_active')
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
        password_hash: passwordHash,
        role: 'super-admin',
        full_name: 'System Administrator',
        is_active: true,
      })
      .eq('id', existingAdmin.id)
      .select('id, username, email, password_hash, role, full_name, is_active')
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
      password_hash: passwordHash,
      role: 'super-admin',
      is_active: true,
    })
    .select('id, username, email, password_hash, role, full_name, is_active')
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

    /*
      Guaranteed default admin login.
      This also creates/updates the admin record in Supabase.
    */
    if (loginName === 'admin' && loginPassword === 'admin') {
      const adminUser = await ensureAdminUser();
      const token = createToken(adminUser);

      return res.json({
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
          name: adminUser.full_name,
        },
      });
    }

    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, username, email, password_hash, role, full_name, is_active')
      .eq('username', loginName)
      .limit(1);

    if (error) {
      throw error;
    }

    const user = users && users.length > 0 ? users[0] : null;

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(loginPassword, user.password_hash || '');

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const typedUser = user as AppUser;
    const token = createToken(typedUser);

    res.json({
      token,
      user: {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        role: typedUser.role,
        name: typedUser.full_name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Login failed',
      error: (error as Error).message,
    });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    const cleanedFullName = String(fullName || '').trim();
    const cleanedUsername = String(username || '').trim();
    const cleanedEmail = String(email || '').trim().toLowerCase();
    const cleanedPassword = String(password || '');

    if (!cleanedFullName || !cleanedUsername || !cleanedEmail || !cleanedPassword) {
      return res.status(400).json({
        message: 'Full name, username, email, and password are required',
      });
    }

    if (cleanedPassword.length < 4) {
      return res.status(400).json({
        message: 'Password must be at least 4 characters',
      });
    }

    const { data: existingUsername, error: usernameError } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', cleanedUsername)
      .limit(1);

    if (usernameError) {
      throw usernameError;
    }

    if (existingUsername && existingUsername.length > 0) {
      return res.status(409).json({
        message: 'Username already exists',
      });
    }

    const { data: existingEmail, error: emailError } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', cleanedEmail)
      .limit(1);

    if (emailError) {
      throw emailError;
    }

    if (existingEmail && existingEmail.length > 0) {
      return res.status(409).json({
        message: 'Email already exists',
      });
    }

    const organizationId = await getDefaultOrganizationId();
    const passwordHash = bcrypt.hashSync(cleanedPassword, 10);

    const { data: createdUser, error: createError } = await supabase
      .from('app_users')
      .insert({
        organization_id: organizationId,
        full_name: cleanedFullName,
        email: cleanedEmail,
        username: cleanedUsername,
        password_hash: passwordHash,
        role: 'hr-admin',
        is_active: true,
      })
      .select('id, username, email, password_hash, role, full_name, is_active')
      .single();

    if (createError) {
      throw createError;
    }

    const typedUser = createdUser as AppUser;
    const token = createToken(typedUser);

    res.status(201).json({
      token,
      user: {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        role: typedUser.role,
        name: typedUser.full_name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Sign up failed',
      error: (error as Error).message,
    });
  }
});

export default router;
