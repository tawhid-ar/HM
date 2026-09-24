// Supabase Edge Function: manage-user
// Deploy: supabase functions deploy manage-user
//
// Handles the three user-management operations that genuinely need the
// Admin API (and therefore the service-role key), which is why they can't
// just be a normal `supabase.from('profiles').update(...)` call from the
// browser like is_active toggling or full_name/phone/address edits are:
//   - create:          makes a brand new auth.users row (+ profiles row via
//                       the handle_new_user trigger) and, if a non-'user'
//                       role was requested, promotes it afterwards.
//   - update_email:    auth.users.email is the actual login credential;
//                       writing to profiles.email directly would desync it.
//   - reset_password:  there is no client-side API for setting someone
//                       else's password.
//
// Role changes themselves still go through manage-role, unchanged.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function readDefaultKey(mapEnv: string, legacyEnv: string): string {
  const raw = Deno.env.get(mapEnv);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through to legacy env below
    }
  }
  const legacy = Deno.env.get(legacyEnv);
  if (legacy) return legacy;
  throw new Error(`Missing ${mapEnv} / ${legacyEnv}`);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const ALLOWED_ROLES = ['user', 'sub_admin', 'moderator', 'admin', 'super_admin'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth' }, 401);

    // Client scoped to the CALLER's JWT — used only to verify who's asking.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      readDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid session' }, 401);

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    const callerRole = callerProfile?.role;
    if (profileErr || (callerRole !== 'super_admin' && callerRole !== 'admin')) {
      return json({ error: 'Forbidden: admin or super_admin only' }, 403);
    }
    if (callerProfile?.is_active === false) {
      return json({ error: 'Your account has been deactivated' }, 403);
    }

    const body = await req.json();
    const action = body.action as string;

    // Admin client — secret/service-role credentials exist only in the Edge Function runtime.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      readDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
    );

    if (action === 'create') {
      const { email, password, full_name, role, phone, address } = body;

      if (!email || !password || !full_name || !ALLOWED_ROLES.includes(role)) {
        return json({ error: 'Invalid input' }, 400);
      }
      if (password.length < 6) {
        return json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' }, 400);
      }

      // Same split as manage-role: plain admins can only ever produce a
      // 'user' or 'moderator' account, never admin/super_admin.
      if (callerRole === 'admin' && !['user', 'moderator'].includes(role)) {
        return json({ error: 'Admins can only create user or moderator accounts' }, 403);
      }

      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // staff-created accounts skip the confirmation email
        user_metadata: { full_name },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'Account creation failed' }, 400);
      }

      const newUserId = created.user.id;

      // handle_new_user already inserted a profiles row with role='user' —
      // patch it with whatever else was requested.
      const { error: patchErr } = await adminClient
        .from('profiles')
        .update({ role, phone: phone || null, address: address || null })
        .eq('id', newUserId);

      if (patchErr) {
        return json({ error: patchErr.message }, 500);
      }

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'user_create',
        target_table: 'profiles',
        target_id: newUserId,
        meta: { email, role },
      });

      return json({ success: true, user_id: newUserId });
    }

    if (action === 'update_email') {
      const { target_user_id, new_email } = body;
      if (!target_user_id || !new_email) return json({ error: 'Invalid input' }, 400);

      // Mirrors manage-role's caller-target restriction.
      if (callerRole === 'admin') {
        const { data: targetProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', target_user_id)
          .single();
        if (['admin', 'super_admin'].includes(targetProfile?.role ?? '')) {
          return json({ error: 'Admins can only manage moderator/user accounts' }, 403);
        }
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
        email: new_email,
        email_confirm: true,
      });
      if (updateErr) return json({ error: updateErr.message }, 400);

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'email_change',
        target_table: 'profiles',
        target_id: target_user_id,
        meta: { new_email },
      });

      return json({ success: true });
    }

    if (action === 'reset_password') {
      const { target_user_id, new_password } = body;
      if (!target_user_id || !new_password) return json({ error: 'Invalid input' }, 400);
      if (new_password.length < 6) {
        return json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' }, 400);
      }

      if (callerRole === 'admin') {
        const { data: targetProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', target_user_id)
          .single();
        if (['admin', 'super_admin'].includes(targetProfile?.role ?? '')) {
          return json({ error: 'Admins can only manage moderator/user accounts' }, 403);
        }
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });
      if (updateErr) return json({ error: updateErr.message }, 400);

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'password_reset',
        target_table: 'profiles',
        target_id: target_user_id,
        meta: {},
      });

      return json({ success: true });
    }

    if (action === 'update_details') {
      const { target_user_id, full_name, phone, address } = body;
      if (!target_user_id || !full_name) return json({ error: 'Invalid input' }, 400);

      if (callerRole === 'admin') {
        const { data: targetProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', target_user_id)
          .single();
        if (!['user', 'moderator'].includes(targetProfile?.role ?? '')) {
          return json({ error: 'Admins can only manage moderator/user accounts' }, 403);
        }
      }

      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({ full_name, phone: phone || null, address: address || null })
        .eq('id', target_user_id);
      if (updateErr) return json({ error: updateErr.message }, 500);

      return json({ success: true });
    }

    if (action === 'toggle_active') {
      const { target_user_id, is_active } = body;
      if (!target_user_id || typeof is_active !== 'boolean') return json({ error: 'Invalid input' }, 400);

      if (target_user_id === user.id) {
        return json({ error: 'নিজের অ্যাকাউন্ট নিজে নিষ্ক্রিয় করা যাবে না' }, 400);
      }

      if (callerRole === 'admin') {
        const { data: targetProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', target_user_id)
          .single();
        if (!['user', 'moderator'].includes(targetProfile?.role ?? '')) {
          return json({ error: 'Admins can only manage moderator/user accounts' }, 403);
        }
      }

      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({ is_active })
        .eq('id', target_user_id);
      if (updateErr) return json({ error: updateErr.message }, 500);

      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'toggle_active',
        target_table: 'profiles',
        target_id: target_user_id,
        meta: { is_active },
      });

      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
