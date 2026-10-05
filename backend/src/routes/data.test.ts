import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { createDataRouter } from './data';

function makeQuery(result: any) {
  return {
    data: result.data,
    error: result.error ?? null,
    select() {
      return this;
    },
    order() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle: async () => result,
    single: async () => result,
  };
}

function createSupabaseMock(overrides: Record<string, any> = {}) {
  const calls: Array<{ table: string; method: string; payload?: any }> = [];

  const client = {
    calls,
    from(table: string) {
      return {
        select(select?: string) {
          calls.push({ table, method: 'select', payload: select });
          return overrides[`${table}:select`] ?? makeQuery({ data: overrides[table] ?? [], error: null });
        },
        insert(payload: any) {
          calls.push({ table, method: 'insert', payload });
          return {
            select() {
              return {
                single: async () => overrides[`${table}:insert`] ?? { data: overrides[`${table}:insertData`] ?? payload, error: null },
              };
            },
          };
        },
        update(payload: any) {
          calls.push({ table, method: 'update', payload });
          return {
            eq() {
              return {
                select() {
                  return {
                    single: async () => overrides[`${table}:update`] ?? { data: overrides[`${table}:updateData`] ?? payload, error: null },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return client as any;
}

async function startServer(router: ReturnType<typeof createDataRouter>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { userId: 'user-1', role: 'super-admin', name: 'Admin' };
    next();
  });
  app.use('/api/data', router);

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test server');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

test('leave routes return seeded rows and support the full workflow', async () => {
  const supabaseClient = createSupabaseMock({
    leave_requests: [{ id: 'leave-1', status: 'pending' }],
    employees: [{ id: 'emp-1', organization_id: 'org-1' }],
    leave_types: [{ id: 'lt-1', name: 'Vacation Leave', code: 'VL' }],
    'leave_requests:insert': { data: { id: 'leave-2', status: 'pending', requested_by: 'user-1' }, error: null },
    'leave_requests:update': { data: { id: 'leave-1', status: 'approved' }, error: null },
  });

  const router = createDataRouter({
    supabaseClient,
    verify: (req, _res, next) => {
      (req as any).user = { userId: 'user-1', role: 'super-admin', name: 'Admin' };
      next();
    },
    allowLeaveAccess: (req, _res, next) => {
      (req as any).user = { userId: 'user-1', role: 'super-admin', name: 'Admin' };
      next();
    },
    allowLeaveApprovalAccess: (req, _res, next) => {
      (req as any).user = { userId: 'user-1', role: 'super-admin', name: 'Admin' };
      next();
    },
  });

  const server = await startServer(router);
  try {
    const listResponse = await fetch(`${server.baseUrl}/api/data/leave`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual((await listResponse.json()).leave, [{ id: 'leave-1', status: 'pending' }]);

    const createResponse = await fetch(`${server.baseUrl}/api/data/leave`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        employee_id: 'emp-1',
        leave_type_id: 'VL',
        start_date: '2026-09-07',
        end_date: '2026-09-08',
        reason: 'Family trip',
      }),
    });
    assert.equal(createResponse.status, 201);
    assert.equal((await createResponse.json()).leave.id, 'leave-2');

    const approveResponse = await fetch(`${server.baseUrl}/api/data/leave/leave-1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert.equal(approveResponse.status, 200);
    assert.equal((await approveResponse.json()).leave.status, 'approved');

    const withdrawResponse = await fetch(`${server.baseUrl}/api/data/leave/leave-1/withdraw`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    assert.equal(withdrawResponse.status, 409);
    assert.equal((await withdrawResponse.json()).error, 'Only pending leave requests can be withdrawn');
  } finally {
    await server.close();
  }
});
