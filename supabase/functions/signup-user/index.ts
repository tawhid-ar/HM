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
    } catch { /* legacy fallback below */ }
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

function normalizeBangladeshPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { email, password, full_name, phone } = await req.json();
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const normalizedName = String(full_name ?? '').trim();
    const normalizedPhone = normalizeBangladeshPhone(String(phone ?? ''));

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return json({ error: 'Enter a valid email address' }, 400);
    if (normalizedName.length < 2) return json({ error: 'Full name is required' }, 400);
    if (String(password ?? '').length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
    if (!normalizedPhone) return json({ error: 'Enter a valid Bangladeshi mobile number' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      readDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: normalizedName, phone: normalizedPhone },
    });

    if (error || !data.user) {
      const message = error?.message ?? 'Account creation failed';
      const duplicate = /already|registered|exists/i.test(message);
      return json({ error: duplicate ? 'An account with this email already exists' : message }, 400);
    }

    // Trigger creates the row; this update also covers an older trigger already deployed remotely.
    const { error: profileError } = await admin
      .from('profiles')
      .update({ full_name: normalizedName, phone: normalizedPhone })
      .eq('id', data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: profileError.message }, 500);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
