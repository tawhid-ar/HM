# Hadiya Mart → Supabase migration

Target project ref: `kxsghquufxfgaahfynjb`

## Frontend connection

This app is Vite + React, so it uses `VITE_*` variables, not `NEXT_PUBLIC_*`.
The local `.env` is already prepared with:

```env
VITE_SUPABASE_URL=https://kxsghquufxfgaahfynjb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your sb_publishable key>
```

## Apply database migrations

From the project root in PowerShell:

```powershell
npm install
npx supabase@latest login
npx supabase@latest init
npx supabase@latest link --project-ref kxsghquufxfgaahfynjb
npx supabase@latest db push --dry-run
npx supabase@latest db push
```

When `link` asks for a database password, enter the database password for this Supabase project.
Do not paste the publishable key as the database password.

The migration order is:

1. `0001_init.sql`
2. `0002_profile_email_sync.sql`
3. `0003_secure_order_functions.sql`
4. `0004_avatar_storage.sql`
5. `0005_delivery_partner_flow.sql`
6. `0006_qa_fixes.sql` — enforces `is_active` (deactivated accounts are now actually blocked everywhere, not just in the UI) plus a handful of smaller correctness fixes; see the "Full QA pass" section in `README.md` for the full list.

## Deploy role-management Edge Functions

After the database push succeeds:

```powershell
npx supabase@latest functions deploy manage-role --project-ref kxsghquufxfgaahfynjb
npx supabase@latest functions deploy manage-user --project-ref kxsghquufxfgaahfynjb
```

`manage-role` handles role changes; `manage-user` handles Super Admin's "নতুন অ্যাকাউন্ট" account creation plus per-user email change / password reset — all three need the Admin API's service-role key, which only Edge Functions have access to.

Hosted Supabase Edge Functions expose publishable/secret key maps automatically. Both functions also keep legacy-key fallback for compatibility.

## Create the first super admin

1. Sign up normally in the app.
2. In Supabase Dashboard → SQL Editor, find your user and promote it once:

```sql
select id, email from auth.users order by created_at desc;

update public.profiles
set role = 'super_admin'
where id = '<AUTH_USER_ID>';
```

After this bootstrap, use the app's role-management flow rather than direct client updates.

## Verify

```sql
select id, full_name, email, role, is_active from public.profiles;
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
select id, name, public from storage.buckets where id = 'avatars';
```

Then run:

```powershell
npm run build
npm run dev
```
