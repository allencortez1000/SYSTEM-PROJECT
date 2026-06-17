import { Router } from 'express';

const router = Router();

interface AttendanceRecord {
  id: number;
  employeeName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Remote';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

const attendanceRecords: AttendanceRecord[] = [
  {
    id: 1,
    employeeName: 'Amelia Hart',
    date: '2026-06-16',
    status: 'Present',
    checkIn: '09:02',
    checkOut: '17:45',
  },
  {
    id: 2,
    employeeName: 'Noah Bennett',
    date: '2026-06-16',
    status: 'Remote',
    checkIn: '08:55',
    checkOut: '17:15',
    notes: 'Worked from home',
  },
];

router.get('/', (_, res) => {
  res.json({ attendance: attendanceRecords });
});

router.post('/', (req, res) => {
  const { employeeName, date, status, checkIn, checkOut, notes } = req.body;

  if (!employeeName || !date || !status) {
    return res.status(400).json({ message: 'employeeName, date and status are required' });
  }

  const newRecord: AttendanceRecord = {
    id: attendanceRecords.length ? attendanceRecords[attendanceRecords.length - 1].id + 1 : 1,
    employeeName,
    date,
    status,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    notes,
  };

  attendanceRecords.unshift(newRecord);

  res.status(201).json({ record: newRecord });
});

export default router;
