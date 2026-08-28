import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePayroll } from './payroll';

test('calculatePayroll uses centralized overtime rate for gross and net pay', () => {
  const result = calculatePayroll({
    basicSalary: 1300,
    overtimeHours: 3.5,
    overtimeRate: 211.25,
    bonus: 0,
    allowances: 0,
    taxRate: 0,
    loanDeduction: 0,
  });

  assert.equal(result.grossEarnings, 2039.38);
  assert.equal(result.totalDeductions, 540.79);
  assert.equal(result.netPay, 1498.59);
  assert.equal(result.governmentContributions.sss.employee, 250);
  assert.equal(result.governmentContributions.philHealth.employee, 250);
  assert.equal(result.governmentContributions.pagIbig.employee, 40.79);
});
