import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeaveDays, formatLeaveStatus, isLeaveWithdrawable, validateLeaveRequestInput } from './leave';

test('calculateLeaveDays counts inclusive calendar days', () => {
  assert.equal(calculateLeaveDays('2026-09-07', '2026-09-07'), 1);
  assert.equal(calculateLeaveDays('2026-09-07', '2026-09-10'), 4);
});

test('calculateLeaveDays falls back to one day for invalid input', () => {
  assert.equal(calculateLeaveDays('invalid', '2026-09-10'), 1);
});

test('isLeaveWithdrawable only allows pending requests', () => {
  assert.equal(isLeaveWithdrawable('pending'), true);
  assert.equal(isLeaveWithdrawable('Pending'), true);
  assert.equal(isLeaveWithdrawable('approved'), false);
  assert.equal(isLeaveWithdrawable('cancelled'), false);
});

test('formatLeaveStatus normalizes the display label', () => {
  assert.equal(formatLeaveStatus('pending'), 'Pending');
  assert.equal(formatLeaveStatus('cancelled'), 'Cancelled');
  assert.equal(formatLeaveStatus(''), '—');
});

test('validateLeaveRequestInput requires the leave payload fields', () => {
  assert.equal(
    validateLeaveRequestInput({ employeeId: '', leaveTypeId: '1', startDate: '2026-09-07', endDate: '2026-09-08', reason: 'Family trip' }),
    'employee_id, leave_type_id, start_date, end_date, and reason are required',
  );
});

test('validateLeaveRequestInput rejects inverted dates', () => {
  assert.equal(
    validateLeaveRequestInput({ employeeId: 'emp-1', leaveTypeId: 'lt-1', startDate: '2026-09-10', endDate: '2026-09-07', reason: 'Travel' }),
    'End date cannot be earlier than start date',
  );
});

test('validateLeaveRequestInput accepts a valid leave request payload', () => {
  assert.equal(
    validateLeaveRequestInput({ employeeId: 'emp-1', leaveTypeId: 'lt-1', startDate: '2026-09-07', endDate: '2026-09-10', reason: 'Travel' }),
    null,
  );
});
