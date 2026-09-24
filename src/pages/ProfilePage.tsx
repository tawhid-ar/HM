import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUpdateProfile } from '../features/profile/useUpdateProfile';
import { useAvatarUpload } from '../features/profile/useAvatarUpload';
import { PageLoader, Spinner, Badge } from '../components/common/ui';

type FormShape = { full_name: string; phone?: string };

const ROLE_TONES: Record<string, 'green' | 'indigo' | 'orange' | 'purple'> = {
  user: 'green', moderator: 'indigo', admin: 'orange', super_admin: 'purple',
};

export default function ProfilePage() {
  const { tr } = useLanguage();
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schema = useMemo(() => z.object({
    full_name: z.string().min(2, tr('Name must be at least 2 characters', 'নাম কমপক্ষে ২ অক্ষর হতে হবে')),
    phone: z.string().optional(),
  }), [tr]);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormShape>({
    resolver: zodResolver(schema),
    values: profile ? { full_name: profile.full_name, phone: profile.phone ?? '' } : undefined,
  });

  if (!profile) return <PageLoader />;

  const roleLabel = profile.role === 'user' ? tr('User', 'ইউজার')
    : profile.role === 'sub_admin' ? tr('Sub Admin', 'সাব অ্যাডমিন')
    : profile.role === 'moderator' ? tr('Moderator', 'মডারেটর')
    : profile.role === 'admin' ? tr('Admin', 'অ্যাডমিন')
    : tr('Super Admin', 'সুপার অ্যাডমিন');

  return (
    <div className="page-shell-sm">
      <div className="mb-5 sm:mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">{tr('Account', 'অ্যাকাউন্ট')}</p>
        <h1 className="section-title mt-1">{tr('Profile', 'প্রোফাইল')}</h1>
      </div>

      <div className="card mb-5 p-4 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 ring-4 ring-white shadow-soft">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" /> : <span className="font-display text-2xl font-bold text-primary-300">{profile.full_name.charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) avatarUpload.mutate(file);
              event.target.value = '';
            }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUpload.isPending} className="btn-outline btn-sm">
              {avatarUpload.isPending && <Spinner className="h-3.5 w-3.5" />}
              {avatarUpload.isPending ? tr('Uploading...', 'আপলোড হচ্ছে...') : tr('Change photo', 'ছবি পরিবর্তন করুন')}
            </button>
            <div className="mt-2"><Badge tone={ROLE_TONES[profile.role] ?? 'gray'}>{roleLabel}</Badge></div>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <form onSubmit={handleSubmit((values) => updateProfile.mutate({ full_name: values.full_name, phone: values.phone || null }))} className="space-y-4">
          <div><label className="field-label">{tr('Full name', 'নাম')}</label><input className="input" {...register('full_name')} />{errors.full_name && <p className="field-error">{errors.full_name.message}</p>}</div>
          <div><label className="field-label">{tr('Email', 'ইমেইল')}</label><input className="input bg-gray-50 text-gray-400" value={profile.email ?? ''} disabled /></div>
          <div><label className="field-label">{tr('Phone', 'ফোন')}</label><input className="input" {...register('phone')} /></div>
          <button type="submit" disabled={!isDirty || updateProfile.isPending} className="btn-primary w-full">
            {updateProfile.isPending && <Spinner />}
            {updateProfile.isPending ? tr('Saving...', 'সেভ হচ্ছে...') : tr('Update profile', 'প্রোফাইল আপডেট করুন')}
          </button>
        </form>
      </div>
    </div>
  );
}
