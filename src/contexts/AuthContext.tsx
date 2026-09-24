import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database.types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) {
      console.error('Failed to load profile', error);
      setProfile(null);
      return;
    }
    if (!data.is_active) {
      // Account was deactivated after this session's JWT was issued — the
      // token itself stays valid until it expires, so the only place this
      // can actually be enforced client-side is here, right after we learn
      // about it. (The real enforcement is server-side: get_user_role()
      // and the SECURITY DEFINER functions all check is_active too — see
      // migration 0006 — so this is about giving a clear message and a
      // clean logged-out state, not the actual security boundary.)
      console.warn('Account is deactivated, signing out');
      setProfile(null);
      setSession(null);
      await supabase.auth.signOut();
      toast.error('আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।', { duration: 6000 });
      return;
    }
    setProfile(data as Profile);
  };

  useEffect(() => {
    // load existing session on first mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // keep session in sync on login/logout/token refresh
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;

    // Keep local auth state in sync before the page redirects. The Supabase
    // auth listener will also receive this event, but setting it here avoids a
    // brief signed-out/header state immediately after a successful login.
    if (data.session) setSession(data.session);
    if (data.user) await fetchProfile(data.user.id);
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    // Use Supabase Auth directly for public registration. This avoids making
    // registration depend on a separately deployed public Edge Function and
    // keeps Supabase's built-in signup rate limiting / abuse protection.
    //
    // Remote Auth must have email confirmation disabled for this storefront
    // flow (supabase/config.toml -> auth.email.enable_confirmations = false).
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
          phone,
        },
      },
    });

    if (error) {
      if (/confirmation email|sending confirmation|email.*confirm/i.test(error.message)) {
        throw new Error(
          'Registration is enabled, but Supabase email confirmation is still turned on. Push the project Auth config with email confirmations disabled and try again.'
        );
      }
      throw error;
    }

    if (!data.user) throw new Error('Account could not be created. Please try again.');

    // Migration 0017 creates the profile from auth metadata. If sign-up also
    // returned a session, make a best-effort sync so older databases that have
    // not yet refreshed the trigger still keep the mandatory phone/name.
    if (data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: normalizedName, email: normalizedEmail, phone })
        .eq('id', data.user.id);

      if (profileError) console.warn('Profile metadata sync after signup failed', profileError);

      // Existing UX asks the customer to sign in after successful registration.
      await supabase.auth.signOut();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
