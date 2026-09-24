// Supabase Edge Function: manage-role
// Deploy: supabase functions deploy manage-role
// Admin/super_admin role management. Uses Supabase's server-side secret key
// (legacy service_role fallback supported) only after verifying the caller JWT + role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Browsers preflight cross-origin POSTs with an OPTIONS request and refuse
// to send the real request unless it sees these headers on the response.
// Without this, supabase.functions.invoke('manage-role', ...) fails silently
// in every browser even though it works fine from curl/Postman.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing auth' }, 401);
    }

    // Client scoped to the CALLER's JWT — used only to verify who's asking.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      readDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'Invalid session' }, 401);
    }

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

    const { target_user_id, new_role } = await req.json();
    const allowedRoles = ['user', 'sub_admin', 'moderator', 'admin', 'super_admin'];
    if (!target_user_id || !allowedRoles.includes(new_role)) {
      return json({ error: 'Invalid input' }, 400);
    }

    // Defense in depth: nobody changes their own role through this function.
    // The DB trigger separately blocks role changes from normal browser sessions.
    if (target_user_id === user.id) {
      return json({ error: 'You cannot change your own role' }, 403);
    }

    // Admin client — secret/service-role credentials exist only in the Edge Function runtime.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      readDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
    );

    // Plain admins may only move someone between 'user' <-> 'moderator'.
    // They cannot create/touch admin or super_admin accounts — only super_admin can.
    if (callerRole === 'admin') {
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', target_user_id)
        .single();

      const restrictedRoles = ['sub_admin', 'admin', 'super_admin'];
      const moveAllowed = ['user', 'moderator'].includes(new_role);
      const targetIsRestricted = restrictedRoles.includes(targetProfile?.role ?? '');

      if (!moveAllowed || targetIsRestricted) {
        return json({ error: 'Admins can only manage moderator <-> user roles' }, 403);
      }
    }

    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({ role: new_role })
      .eq('id', target_user_id);

    if (updateErr) {
      return json({ error: updateErr.message }, 500);
    }

    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'role_change',
      target_table: 'profiles',
      target_id: target_user_id,
      meta: { new_role },
    });

    return json({ success: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
