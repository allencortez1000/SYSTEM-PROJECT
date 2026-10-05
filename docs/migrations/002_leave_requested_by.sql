-- Leave request requester tracking
-- Apply this after `leave_requests` already exists.

alter table public.leave_requests
  add column if not exists requested_by uuid null references public.app_users(id) on delete set null;

create index if not exists leave_requests_requested_by_idx
  on public.leave_requests (requested_by);

-- Optional backfill: if you have a reliable way to infer the filer from audit data,
-- populate requested_by here before enforcing stricter withdraw rules.
