-- ============================================================
-- Migration 0002: sync auth email into profiles
-- Needed so Super Admin can list/search users by email without
-- exposing the protected auth.users table directly to the client.
-- ============================================================

alter table profiles add column if not exists email text;

-- backfill existing rows
update profiles p set email = u.email from auth.users u where p.id = u.id;

-- keep it in sync on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- keep it in sync if email changes in auth.users (password reset flows etc.)
create or replace function sync_profile_email()
returns trigger as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function sync_profile_email();

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_profiles_role on profiles(role);
