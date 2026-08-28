import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOvertimePay,
  computeRegularOvertimeRate,
  computeRestDayHourlyRate,
  computeRestDayOvertimeRate,
  computeRestDayRate,
} from './payrollRules';

test('computes regular and Sunday rest-day rates from a daily rate', () => {
  assert.equal(computeRegularOvertimeRate(1000), 156.25);
  assert.equal(computeRestDayRate(1000), 1300);
  assert.equal(computeRestDayHourlyRate(1000), 162.5);
  assert.equal(computeRestDayOvertimeRate(1000), 211.25);
  assert.equal(computeOvertimePay(3.5, computeRestDayOvertimeRate(1000)), 739.38);
});

test('rounds overtime pay consistently', () => {
  assert.equal(computeOvertimePay(2.25, 156.25), 351.56);
});
