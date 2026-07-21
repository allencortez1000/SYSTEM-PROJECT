-- Compatibility fix for older backend processes and a bcrypt-based admin password.
-- Run this in the Supabase SQL editor.

alter table public.app_users
  add column if not exists password_hash text;

update public.app_users
set password_hash = coalesce(password_hash, password)
where password_hash is null
  and password is not null;

create or replace function public.sync_app_users_password_hash()
returns trigger
language plpgsql
as $$
begin
  if new.password is not null and (new.password_hash is null or new.password_hash = '') then
    new.password_hash := new.password;
  end if;

  if new.password is null and new.password_hash is not null then
    new.password := new.password_hash;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_users_sync_password_hash on public.app_users;

create trigger trg_app_users_sync_password_hash
before insert or update on public.app_users
for each row
execute function public.sync_app_users_password_hash();

update public.app_users
set
  full_name = 'System Administrator',
  email = 'admin@hrpayroll.local',
  username = 'admin',
  password = '$2a$10$q71lNGEAaz5OBAiSeISEuutAMIQwEMMVKwvh.0TeiBsRllXojUj.G',
  password_hash = '$2a$10$q71lNGEAaz5OBAiSeISEuutAMIQwEMMVKwvh.0TeiBsRllXojUj.G',
  role = 'super-admin',
  is_active = true
where username = 'admin';

insert into public.app_users (
  organization_id,
  full_name,
  email,
  username,
  password,
  password_hash,
  role,
  is_active
)
select
  o.id,
  'System Administrator',
  'admin@hrpayroll.local',
  'admin',
  '$2a$10$q71lNGEAaz5OBAiSeISEuutAMIQwEMMVKwvh.0TeiBsRllXojUj.G',
  '$2a$10$q71lNGEAaz5OBAiSeISEuutAMIQwEMMVKwvh.0TeiBsRllXojUj.G',
  'super-admin',
  true
from public.organizations o
where not exists (
  select 1 from public.app_users where username = 'admin'
)
order by o.created_at asc
limit 1;
