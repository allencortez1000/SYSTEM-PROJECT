import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All admin-user routes require authentication. Fine-grained authorization is applied per-route.
router.use(verifyToken);

async function userHasAdminViewAccess(req: any) {
  // super-admins always have view access
  if (!req.user) return false;
  if (req.user.role === 'super-admin') return true;

  // sub-admins may have admin view permission stored in app_users.permissions
  if (req.user.role === 'sub-admin') {
    const { data, error } = await supabase.from('app_users').select('permissions').eq('id', req.user.userId).limit(1);
    if (error) return false;
    const row = data && data[0];
    const permissions = Array.isArray(row?.permissions) ? row.permissions.map((p: unknown) => String(p)) : [];
    return permissions.includes('admin_access');
  }

  return false;
}

type AppUserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name: string;
  is_active: boolean;
};

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

router.get('/departments', async (req: any, res) => {
  try {
    // Any authenticated user can read the departments list (needed for dropdowns).
    // Super-admins and users with admin_access get all departments.
    // Sub-admins without admin_access get only their assigned departments.
    // Department-head-admins also get only their assigned departments.
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const role: string = req.user.role || '';
    const userId: string = req.user.userId || '';

    // Super-admins always see everything
    if (role === 'super-admin') {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return res.json({ departments: data || [] });
    }

    // For sub-admins: check if they have admin_access permission → show all
    if (role === 'sub-admin') {
      const { data: userData } = await supabase
        .from('app_users')
        .select('permissions')
        .eq('id', userId)
        .limit(1);
      const permissions = Array.isArray(userData?.[0]?.permissions)
        ? userData![0].permissions.map((p: unknown) => String(p))
        : [];
      if (permissions.includes('admin_access')) {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name', { ascending: true });
        if (error) throw error;
        return res.json({ departments: data || [] });
      }
    }

    // For department-head-admins and sub-admins without admin_access:
    // return only the departments they are assigned to
    const { data: links, error: linksError } = await supabase
      .from('app_user_departments')
      .select('department_id')
      .eq('user_id', userId);
    if (linksError) throw linksError;

    const assignedIds = (links || []).map((l: any) => String(l.department_id));
    if (assignedIds.length === 0) {
      return res.json({ departments: [] });
    }

    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .in('id', assignedIds)
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ departments: data || [] });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load departments',
      error: (error as Error).message,
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const allowed = await userHasAdminViewAccess(req);
    if (!allowed) return res.status(403).json({ message: 'Insufficient permissions' });

    const [usersResult, linksResult, departmentsResult] = await Promise.all([
      supabase
        .from('app_users')
        .select('id, username, email, role, full_name, is_active')
        .order('created_at', { ascending: false }),
      supabase.from('app_user_departments').select('user_id, department_id'),
      supabase.from('departments').select('id, name'),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (linksResult.error) throw linksResult.error;
    if (departmentsResult.error) throw departmentsResult.error;

    const departmentNameMap = new Map((departmentsResult.data || []).map((d) => [d.id as string, d.name as string]));

    const userDepartmentsMap = new Map<string, { ids: string[]; names: string[] }>();
    (linksResult.data || []).forEach((link) => {
      const userId = link.user_id as string;
      const departmentId = link.department_id as string;
      const name = departmentNameMap.get(departmentId);
      const current = userDepartmentsMap.get(userId) || { ids: [], names: [] };

      current.ids.push(departmentId);
      if (name) current.names.push(name);

      userDepartmentsMap.set(userId, current);
    });

    const users = ((usersResult.data || []) as AppUserRow[]).map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      isActive: user.is_active,
      departmentIds: userDepartmentsMap.get(user.id)?.ids || [],
      departments: userDepartmentsMap.get(user.id)?.names || [],
    }));

    res.json({ users });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load admin users',
      error: (error as Error).message,
    });
  }
});

router.post('/department-head', requireSuperAdmin, async (req, res) => {
  try {
    const { fullName, username, email, password, departmentId, departmentIds } = req.body;

    const cleanedFullName = String(fullName || '').trim();
    const cleanedUsername = String(username || '').trim();
    const cleanedEmail = String(email || '').trim().toLowerCase();
    const cleanedPassword = String(password || '');

    const cleanedDepartmentIds = Array.isArray(departmentIds)
      ? departmentIds.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [String(departmentId || '').trim()].filter(Boolean);

    if (!cleanedFullName || !cleanedUsername || !cleanedEmail || !cleanedPassword || cleanedDepartmentIds.length === 0) {
      return res.status(400).json({
        message: 'fullName, username, email, password, and at least one department are required',
      });
    }

    if (cleanedPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const { data: departments, error: departmentError } = await supabase
      .from('departments')
      .select('id, name')
      .in('id', cleanedDepartmentIds);

    if (departmentError) throw departmentError;
    if (!departments || departments.length !== cleanedDepartmentIds.length) {
      return res.status(404).json({ message: 'One or more departments were not found' });
    }

    const [existingUsername, existingEmail] = await Promise.all([
      supabase.from('app_users').select('id').eq('username', cleanedUsername).limit(1),
      supabase.from('app_users').select('id').eq('email', cleanedEmail).limit(1),
    ]);

    if (existingUsername.error) throw existingUsername.error;
    if (existingEmail.error) throw existingEmail.error;

    if ((existingUsername.data || []).length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    if ((existingEmail.data || []).length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const organizationId = await getDefaultOrganizationId();
    const passwordHash = bcrypt.hashSync(cleanedPassword, 10);

    const { data: createdUser, error: createUserError } = await supabase
      .from('app_users')
      .insert({
        organization_id: organizationId,
        full_name: cleanedFullName,
        email: cleanedEmail,
        username: cleanedUsername,
        password_hash: passwordHash,
        role: 'department-head-admin',
        is_active: true,
      })
      .select('id, username, email, role, full_name, is_active')
      .single();

    if (createUserError) throw createUserError;

    const { error: mapError } = await supabase
      .from('app_user_departments')
      .insert(
        cleanedDepartmentIds.map((id: string) => ({
          user_id: (createdUser as AppUserRow).id,
          department_id: id,
        })),
      );

    if (mapError) throw mapError;

    res.status(201).json({
      user: {
        id: (createdUser as AppUserRow).id,
        username: (createdUser as AppUserRow).username,
        email: (createdUser as AppUserRow).email,
        role: (createdUser as AppUserRow).role,
        fullName: (createdUser as AppUserRow).full_name,
        isActive: (createdUser as AppUserRow).is_active,
        departmentIds: cleanedDepartmentIds,
        departments: departments.map((department) => department.name as string),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create department head admin',
      error: (error as Error).message,
    });
  }
});

router.post('/sub-admin', requireSuperAdmin, async (req, res) => {
  try {
    const { fullName, username, email, password, permissions } = req.body;

    const cleanedFullName = String(fullName || '').trim();
    const cleanedUsername = String(username || '').trim();
    const cleanedEmail = String(email || '').trim().toLowerCase();
    const cleanedPassword = String(password || '');

    const cleanedPermissions = Array.isArray(permissions)
      ? permissions.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];

    if (!cleanedFullName || !cleanedUsername || !cleanedEmail || !cleanedPassword || cleanedPermissions.length === 0) {
      return res.status(400).json({
        message: 'fullName, username, email, password, and at least one permission are required',
      });
    }

    if (cleanedPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const [existingUsername, existingEmail] = await Promise.all([
      supabase.from('app_users').select('id').eq('username', cleanedUsername).limit(1),
      supabase.from('app_users').select('id').eq('email', cleanedEmail).limit(1),
    ]);

    if (existingUsername.error) throw existingUsername.error;
    if (existingEmail.error) throw existingEmail.error;

    if ((existingUsername.data || []).length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    if ((existingEmail.data || []).length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const organizationId = await getDefaultOrganizationId();
    const passwordHash = bcrypt.hashSync(cleanedPassword, 10);

    const { data: createdUser, error: createUserError } = await supabase
      .from('app_users')
      .insert({
        organization_id: organizationId,
        full_name: cleanedFullName,
        email: cleanedEmail,
        username: cleanedUsername,
        password_hash: passwordHash,
        role: 'sub-admin',
        is_active: true,
        permissions: cleanedPermissions,
      })
      .select('id, username, email, role, full_name, is_active')
      .single();

    if (createUserError) throw createUserError;

    res.status(201).json({
      user: {
        id: (createdUser as AppUserRow).id,
        username: (createdUser as AppUserRow).username,
        email: (createdUser as AppUserRow).email,
        role: (createdUser as AppUserRow).role,
        fullName: (createdUser as AppUserRow).full_name,
        isActive: (createdUser as AppUserRow).is_active,
        permissions: cleanedPermissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create sub-admin',
      error: (error as Error).message,
    });
  }
});

router.patch('/:id/departments', requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const departmentIds = Array.isArray(req.body?.departmentIds)
      ? req.body.departmentIds.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];

    if (departmentIds.length === 0) {
      return res.status(400).json({ message: 'departmentIds is required' });
    }

    const { data: userRows, error: userError } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('id', userId)
      .limit(1);

    if (userError) throw userError;
    const user = userRows && userRows[0];

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user.role) !== 'department-head-admin') {
      return res.status(400).json({ message: 'Only department-head-admin can be assigned departments' });
    }

    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .select('id')
      .in('id', departmentIds);

    if (departmentsError) throw departmentsError;
    if (!departments || departments.length !== departmentIds.length) {
      return res.status(400).json({ message: 'One or more departmentIds are invalid' });
    }

    const { error: deleteError } = await supabase
      .from('app_user_departments')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('app_user_departments')
      .insert(departmentIds.map((departmentId: string) => ({ user_id: userId, department_id: departmentId })));

    if (insertError) throw insertError;

    res.json({ message: 'Department assignments updated' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update department assignments',
      error: (error as Error).message,
    });
  }
});

router.patch('/:id/active', requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const isActive = req.body?.isActive === true || req.body?.isActive === "true";

    const { error } = await supabase
      .from('app_users')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update user status',
      error: (error as Error).message,
    });
  }
});

export default router;
