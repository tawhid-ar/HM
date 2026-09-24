-- ============================================================
-- Migration 0011: Home + Office delivery addresses per user
-- ============================================================
-- Exactly two logical slots are possible because address_type is restricted
-- to ('home', 'office') and (user_id, address_type) is UNIQUE.
-- Orders continue storing shipping_address as a snapshot so historical orders
-- never change when the user later edits a saved address.

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  address_type text not null check (address_type in ('home', 'office')),
  address text not null check (char_length(trim(address)) between 5 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, address_type)
);

create index if not exists idx_user_addresses_user_id on public.user_addresses(user_id);

-- Reuse the schema's standard updated_at trigger helper from 0001.
drop trigger if exists trg_user_addresses_updated on public.user_addresses;
create trigger trg_user_addresses_updated
before update on public.user_addresses
for each row execute function public.set_updated_at();

alter table public.user_addresses enable row level security;

drop policy if exists "user_addresses_select_own" on public.user_addresses;
create policy "user_addresses_select_own"
on public.user_addresses for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_addresses_insert_own" on public.user_addresses;
create policy "user_addresses_insert_own"
on public.user_addresses for insert
to authenticated
with check (auth.uid() = user_id and public.is_current_user_active());

drop policy if exists "user_addresses_update_own" on public.user_addresses;
create policy "user_addresses_update_own"
on public.user_addresses for update
to authenticated
using (auth.uid() = user_id and public.is_current_user_active())
with check (auth.uid() = user_id and public.is_current_user_active());

drop policy if exists "user_addresses_delete_own" on public.user_addresses;
create policy "user_addresses_delete_own"
on public.user_addresses for delete
to authenticated
using (auth.uid() = user_id and public.is_current_user_active());

grant select, insert, update, delete on table public.user_addresses to authenticated;

-- Preserve existing user data: copy the legacy single profile address into the
-- Home slot only when that user does not already have a Home address.
insert into public.user_addresses (user_id, address_type, address)
select p.id, 'home', trim(p.address)
from public.profiles p
where p.address is not null
  and char_length(trim(p.address)) between 5 and 1000
on conflict (user_id, address_type) do nothing;

notify pgrst, 'reload schema';
