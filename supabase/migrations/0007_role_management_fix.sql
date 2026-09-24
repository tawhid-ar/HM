-- ============================================================
-- Migration 0007: allow trusted Edge Functions to manage roles
-- ============================================================
-- `manage-role` and the `manage-user` create flow intentionally perform
-- privileged profile writes with a server-side service-role client after
-- authenticating/authorizing the human caller. The role-protection trigger
-- introduced in 0001/0006 only looked at get_user_role(), which is based on
-- auth.uid(). A service-role request has no end-user auth.uid(), so every
-- legitimate Edge Function role update was rejected with:
--   "Only super_admin can change roles"
--
-- service_role already bypasses RLS and is only available server-side. Let it
-- pass this trigger while preserving the super_admin-only rule for ordinary
-- authenticated browser requests.

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(public.get_user_role()::text, '') <> 'super_admin'
  then
    raise exception 'Only super_admin can change roles';
  end if;

  return new;
end;
$$;
