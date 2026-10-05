-- Payroll status history table
-- Apply this after `payroll_runs` already exists.

create table if not exists public.payroll_status_history (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_at timestamptz not null default now(),
  changed_by_user_id uuid null,
  changed_by_name text null,
  changed_by_role text null,
  reason text null,
  source text null
);

create index if not exists payroll_status_history_run_id_idx
  on public.payroll_status_history (payroll_run_id, changed_at desc);

create index if not exists payroll_status_history_changed_at_idx
  on public.payroll_status_history (changed_at desc);

-- Optional backfill from notes.statusHistory if you already store audit history there.
-- Adjust the JSON path if your notes structure differs.
/*
insert into public.payroll_status_history (
  payroll_run_id,
  from_status,
  to_status,
  changed_at,
  changed_by_user_id,
  changed_by_name,
  changed_by_role,
  reason,
  source
)
select
  pr.id,
  coalesce(hist->>'from', 'Draft') as from_status,
  coalesce(hist->>'to', hist->>'status') as to_status,
  coalesce(nullif(hist->>'changedAt', '')::timestamptz, pr.created_at) as changed_at,
  nullif((hist->'changedBy'->>'userId'), '') as changed_by_user_id,
  nullif((hist->'changedBy'->>'name'), '') as changed_by_name,
  nullif((hist->'changedBy'->>'role'), '') as changed_by_role,
  nullif(hist->>'reason', '') as reason,
  'notes-backfill' as source
from public.payroll_runs pr
cross join lateral jsonb_array_elements(
  coalesce(
    case
      when jsonb_typeof(pr.notes::jsonb) = 'object' then pr.notes::jsonb->'statusHistory'
      else '[]'::jsonb
    end,
    '[]'::jsonb
  )
) as hist
where pr.notes is not null;
*/

-- Optional trigger function if you want automatic history writes from the database.
-- Keep this commented until you decide to move status writes into the DB layer.
/*
create or replace function public.log_payroll_status_history()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into public.payroll_status_history (
      payroll_run_id,
      from_status,
      to_status,
      changed_at,
      changed_by_user_id,
      changed_by_name,
      changed_by_role,
      reason,
      source
    ) values (
      old.id,
      coalesce(old.status, 'Draft'),
      new.status,
      now(),
      null,
      null,
      null,
      null,
      'trigger'
    );
  end if;
  return new;
end;
$$;

create trigger payroll_runs_status_history_trigger
after update of status on public.payroll_runs
for each row
execute function public.log_payroll_status_history();
*/
