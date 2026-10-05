-- Leave withdrawal timestamp
-- Apply this after `leave_requests` already exists.

alter table public.leave_requests
  add column if not exists withdrawn_at timestamptz null;

create index if not exists leave_requests_withdrawn_at_idx
  on public.leave_requests (withdrawn_at desc);
