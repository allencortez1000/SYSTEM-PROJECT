import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

type AttendanceRow = {
  id: string;
  attendance_date: string;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  employees?: {
    full_name?: string | null;
  } | null;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || 'Employee';
  const lastName = parts.length ? parts.join(' ') : 'Record';

  return {
    firstName,
    lastName,
  };
}

function toAttendanceApi(row: AttendanceRow) {
  return {
    id: row.id,
    employeeName: row.employees?.full_name || 'Unknown employee',
    date: row.attendance_date,
    status: row.status,
    checkIn: row.check_in || undefined,
    checkOut: row.check_out || undefined,
    notes: row.notes || undefined,
  };
}

async function getDefaultOrganizationId() {
  const { data: existingOrg, error: existingOrgError } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existingOrgError) {
    throw existingOrgError;
  }

  if (existingOrg?.id) {
    return existingOrg.id as string;
  }

  const { data: newOrg, error: newOrgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Company',
      legal_name: 'Demo Company Philippines Inc.',
      currency: 'PHP',
    })
    .select('id')
    .single();

  if (newOrgError) {
    throw newOrgError;
  }

  return newOrg.id as string;
}

async function findOrCreateEmployeeByName(employeeName: string) {
  const name = employeeName.trim();

  const { data: existing, error: existingError } = await supabase
    .from('employees')
    .select('id')
    .ilike('full_name', name)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const organizationId = await getDefaultOrganizationId();
  const { firstName, lastName } = splitFullName(name);

  const { data: created, error: createError } = await supabase
    .from('employees')
    .insert({
      organization_id: organizationId,
      employee_no: `EMP-${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email: `${Date.now()}@placeholder.local`,
      status: 'Active',
      salary: 0,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id as string;
}

router.get('/', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        attendance_date,
        status,
        check_in,
        check_out,
        notes,
        employees(full_name)
      `)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      attendance: (data || []).map((row) => toAttendanceApi(row as AttendanceRow)),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load attendance from Supabase',
      error: (error as Error).message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employeeName, date, status, checkIn, checkOut, notes } = req.body;

    if (!employeeName || !date || !status) {
      return res.status(400).json({ message: 'employeeName, date and status are required' });
    }

    const employeeId = await findOrCreateEmployeeByName(employeeName);

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(
        {
          employee_id: employeeId,
          attendance_date: date,
          status,
          check_in: checkIn || null,
          check_out: checkOut || null,
          notes: notes || null,
        },
        {
          onConflict: 'employee_id,attendance_date',
        },
      )
      .select(`
        id,
        attendance_date,
        status,
        check_in,
        check_out,
        notes,
        employees(full_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      record: toAttendanceApi(data as AttendanceRow),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save attendance in Supabase',
      error: (error as Error).message,
    });
  }
});

export default router;
