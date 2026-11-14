create extension if not exists pgcrypto with schema extensions;

create type public.chore_frequency as enum ('once','daily','weekly','monthly','yearly');
create type public.completion_status as enum ('pending','approved','rejected');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  name text not null,
  parent_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.families to authenticated;
grant all on public.families to service_role;
alter table public.families enable row level security;
create policy "owner all families" on public.families for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.families where owner_id = auth.uid() limit 1
$$;

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  avatar text not null default '🦊',
  pin_hash text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.children to authenticated;
grant all on public.children to service_role;
alter table public.children enable row level security;
create policy "family children" on public.children for all to authenticated
  using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  points integer not null default 10,
  frequency public.chore_frequency not null default 'once',
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chores to authenticated;
grant all on public.chores to service_role;
alter table public.chores enable row level security;
create policy "family chores" on public.chores for all to authenticated
  using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());

create table public.chore_assignments (
  chore_id uuid not null references public.chores(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (chore_id, child_id)
);
grant select, insert, update, delete on public.chore_assignments to authenticated;
grant all on public.chore_assignments to service_role;
alter table public.chore_assignments enable row level security;
create policy "family assignments" on public.chore_assignments for all to authenticated
  using (exists (select 1 from public.chores c where c.id = chore_id and c.family_id = public.my_family_id()))
  with check (exists (select 1 from public.chores c where c.id = chore_id and c.family_id = public.my_family_id()));

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  chore_id uuid not null references public.chores(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_key text not null,
  status public.completion_status not null default 'pending',
  points integer not null,
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (chore_id, child_id, period_key)
);
grant select, update, delete on public.completions to authenticated;
grant all on public.completions to service_role;
alter table public.completions enable row level security;
create policy "family completions read" on public.completions for select to authenticated
  using (family_id = public.my_family_id());
create policy "family completions update" on public.completions for update to authenticated
  using (family_id = public.my_family_id()) with check (family_id = public.my_family_id());
create policy "family completions delete" on public.completions for delete to authenticated
  using (family_id = public.my_family_id());

-- auto-create family on signup
create or replace function public.handle_new_parent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.families (owner_id, name, parent_name)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'family_name',''), 'Moja družina'),
          coalesce(new.raw_user_meta_data->>'parent_name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_parent();

-- child management with hashed PIN
create or replace function public.add_child(_name text, _pin text, _avatar text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare fid uuid := public.my_family_id(); nid uuid;
begin
  if fid is null then raise exception 'Ni družine'; end if;
  if _pin !~ '^[0-9]{6}$' then raise exception 'PIN mora imeti točno 6 številk'; end if;
  if length(trim(_name)) = 0 then raise exception 'Ime je obvezno'; end if;
  insert into public.children(family_id, name, avatar, pin_hash)
  values (fid, trim(_name), coalesce(_avatar,'🦊'), crypt(_pin, gen_salt('bf')))
  returning id into nid;
  return nid;
end $$;

create or replace function public.reset_child_pin(_child_id uuid, _pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if _pin !~ '^[0-9]{6}$' then raise exception 'PIN mora imeti točno 6 številk'; end if;
  update public.children set pin_hash = crypt(_pin, gen_salt('bf'))
  where id = _child_id and family_id = public.my_family_id();
  if not found then raise exception 'Otrok ne obstaja'; end if;
end $$;

create or replace function public.verify_child_pin(_child_id uuid, _pin text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.children
    where id = _child_id and family_id = public.my_family_id()
      and pin_hash = crypt(_pin, pin_hash))
$$;

create or replace function public.child_submit(_child_id uuid, _pin text, _chore_id uuid, _period_key text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare ch public.chores%rowtype;
begin
  if not public.verify_child_pin(_child_id, _pin) then raise exception 'Napačen PIN'; end if;
  select * into ch from public.chores where id = _chore_id and family_id = public.my_family_id();
  if not found or not exists (select 1 from public.chore_assignments where chore_id = _chore_id and child_id = _child_id)
    then raise exception 'Opravilo ni dodeljeno'; end if;
  insert into public.completions(family_id, chore_id, child_id, period_key, points)
  values (ch.family_id, ch.id, _child_id, _period_key, ch.points)
  on conflict (chore_id, child_id, period_key) do update
    set status = 'pending', note = null, submitted_at = now(), reviewed_at = null, points = excluded.points
    where public.completions.status = 'rejected';
end $$;

revoke execute on function public.add_child, public.reset_child_pin, public.verify_child_pin, public.child_submit from anon, public;
grant execute on function public.add_child, public.reset_child_pin, public.verify_child_pin, public.child_submit, public.my_family_id to authenticated;
revoke select (pin_hash) on public.children from authenticated;