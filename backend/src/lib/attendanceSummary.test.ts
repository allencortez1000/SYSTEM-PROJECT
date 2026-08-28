import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAttendanceDays } from './attendanceSummary';

test('summarizeAttendanceDays tracks Sunday rest-day work separately and includes it in paidDays', () => {
  const summary = summarizeAttendanceDays([
    {
      attendance_date: '2026-08-24',
      status: 'Present',
      worked_hours: 8,
      overtime_hours: 0,
    },
    {
      attendance_date: '2026-08-30',
      status: 'Present',
      worked_hours: 8,
      overtime_hours: 3.5,
    },
  ]);

  assert.equal(summary.paidDays, 2);
  assert.equal(summary.restDayDays, 1);
  assert.equal(summary.regularHours, 8);
  assert.equal(summary.overtimeHours, 3.5);
  assert.equal(summary.restDayOvertimeHours, 3.5);
  assert.equal(summary.presentDays, 1);
});

test('summarizeAttendanceDays preserves fractional paid days and Sunday fractions', () => {
  const summary = summarizeAttendanceDays([
    {
      attendance_date: '2026-08-25',
      status: 'Present',
      worked_hours: 6,
      overtime_hours: 0,
    },
    {
      attendance_date: '2026-08-30',
      status: 'Present',
      worked_hours: 4,
      overtime_hours: 0,
    },
  ]);

  assert.equal(summary.paidDays, 1.25);
  assert.equal(summary.restDayDays, 0.5);
  assert.equal(summary.regularHours, 6);
  assert.equal(summary.overtimeHours, 0);
  assert.equal(summary.restDayOvertimeHours, 0);
});

test('summarizeAttendanceDays ignores Sunday absences for paid rest-day values', () => {
  const summary = summarizeAttendanceDays([
    {
      attendance_date: '2026-08-30',
      status: 'Absent',
      worked_hours: 0,
      overtime_hours: 0,
    },
  ]);

  assert.equal(summary.paidDays, 0);
  assert.equal(summary.restDayDays, 0);
  assert.equal(summary.overtimeHours, 0);
  assert.equal(summary.restDayOvertimeHours, 0);
  assert.equal(summary.absentDays, 0);
});
