-- ============================================================
-- Avatar upload storage (Profile edit — avatar_url)
-- ============================================================
-- Public bucket: avatar images aren't sensitive and the app renders them
-- directly as <img src>, so public read is fine (same as most e-commerce
-- profile photos). Writes are still locked down per-user below.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Path convention enforced by the app: `${user_id}/avatar.<ext>` — the
-- policies below trust (storage.foldername(name))[1] as the owning user id,
-- so the client must never let a user upload into another user's folder.

create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
