import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Profile, UserRole } from '../../types/database.types';
import { useAdminCreateAccount } from './useAdminCreateAccount';
import { useAdminUpdateUserDetails } from './useAdminUpdateUserDetails';
import { useAdminToggleUserActive } from './useAdminToggleUserActive';
import { useChangeRole } from '../super-admin/useChangeRole';
import { useUpdateUserEmail } from '../super-admin/useUpdateUserEmail';
import { useResetUserPassword } from '../super-admin/useResetUserPassword';
import { Badge, ModalShell, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

const ROLE_TONES: Record<UserRole, 'gray' | 'blue' | 'orange' | 'red'> = {
  user: 'gray',
  sub_admin: 'blue',
  moderator: 'blue',
  admin: 'orange',
  super_admin: 'red',
};

function makeCreateSchema(tr: (english: string, bangla: string) => string) {
  return z.object({
    full_name: z.string().min(2, tr('Name must be at least 2 characters', 'নাম কমপক্ষে ২ অক্ষর হতে হবে')),
    email: z.string().email(tr('Enter a valid email address', 'সঠিক ইমেইল দিন')),
    password: z.string().min(6, tr('Password must be at least 6 characters', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে')),
    role: z.enum(['user', 'moderator']),
    phone: z.string().optional(),
    address: z.string().optional(),
  });
}
type CreateFormShape = z.infer<ReturnType<typeof makeCreateSchema>>;

function makeDetailsSchema(tr: (english: string, bangla: string) => string) {
  return z.object({
    full_name: z.string().min(2, tr('Name must be at least 2 characters', 'নাম কমপক্ষে ২ অক্ষর হতে হবে')),
    phone: z.string().optional(),
    address: z.string().optional(),
  });
}
type DetailsFormShape = z.infer<ReturnType<typeof makeDetailsSchema>>;

interface StaffFormModalProps {
  /** undefined/null = create mode. A Profile = view/edit mode for that user. */
  user?: Profile | null;
  onClose: () => void;
}

/**
 * Admin's own version of Super Admin's UserFormModal — deliberately kept as
 * a separate, smaller component rather than a shared one with role-based
 * branching, because the two dashboards' permissions genuinely differ (no
 * promoting to admin/super_admin here, ever) and keeping that boundary at
 * the component level is harder to accidentally break than a runtime prop.
 */
export function StaffFormModal({ user, onClose }: StaffFormModalProps) {
  const { tr, locale } = useLanguage();
  const createSchema = useMemo(() => makeCreateSchema(tr), [tr]);
  const detailsSchema = useMemo(() => makeDetailsSchema(tr), [tr]);
  const isEdit = !!user;

  const createAccount = useAdminCreateAccount();
  const updateDetails = useAdminUpdateUserDetails();
  const toggleActive = useAdminToggleUserActive();
  const changeRole = useChangeRole();
  const updateEmail = useUpdateUserEmail();
  const resetPassword = useResetUserPassword();

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const createForm = useForm<CreateFormShape>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'user' },
  });

  const detailsForm = useForm<DetailsFormShape>({
    resolver: zodResolver(detailsSchema),
    defaultValues: user
      ? { full_name: user.full_name, phone: user.phone ?? '', address: user.address ?? '' }
      : undefined,
  });

  const handleCreateSubmit = async (values: CreateFormShape) => {
    await createAccount.mutateAsync(values);
    onClose();
  };

  const handleDetailsSubmit = (values: DetailsFormShape) => {
    if (!user) return;
    updateDetails.mutate({ userId: user.id, ...values });
  };

  const handleRoleChange = (newRole: 'user' | 'moderator') => {
    if (!user) return;
    const targetRole = newRole === 'moderator' ? tr('Moderator', 'মডারেটর') : tr('User', 'ইউজার');
    const confirmed = window.confirm(tr(`Change \"${user.full_name}\" to \"${targetRole}\"?`, `\"${user.full_name}\"-এর রোল \"${targetRole}\"-এ পরিবর্তন করবেন?`));
    if (confirmed) changeRole.mutate({ targetUserId: user.id, newRole });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) return;
    updateEmail.mutate({ targetUserId: user.id, newEmail: newEmail.trim() }, { onSuccess: () => setNewEmail('') });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newPassword.length < 6) return;
    resetPassword.mutate({ targetUserId: user.id, newPassword }, { onSuccess: () => setNewPassword('') });
  };

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-lg" panelClassName="animate-slide-up">
        {!isEdit ? (
          <>
            <h3 className="font-display font-bold text-lg text-gray-900 mb-5">{tr('New Moderator / User Account', 'নতুন মডারেটর / ইউজার অ্যাকাউন্ট')}</h3>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <label className="field-label">{tr('Full name', 'পূর্ণ নাম')}</label>
                <input className="input" {...createForm.register('full_name')} />
                {createForm.formState.errors.full_name && (
                  <p className="field-error">{createForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div>
                <label className="field-label">{tr('Email', 'ইমেইল')}</label>
                <input type="email" className="input" {...createForm.register('email')} />
                {createForm.formState.errors.email && (
                  <p className="field-error">{createForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="field-label">{tr('Password', 'পাসওয়ার্ড')}</label>
                <input type="password" className="input" {...createForm.register('password')} />
                {createForm.formState.errors.password && (
                  <p className="field-error">{createForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="field-label">{tr('Role', 'রোল')}</label>
                <select className="select" {...createForm.register('role')}>
                  <option value="user">{tr('User', 'ইউজার')}</option>
                  <option value="moderator">{tr('Moderator', 'মডারেটর')}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">{tr('Phone (optional)', 'ফোন (ঐচ্ছিক)')}</label>
                  <input className="input" {...createForm.register('phone')} />
                </div>
                <div>
                  <label className="field-label">{tr('Address (optional)', 'ঠিকানা (ঐচ্ছিক)')}</label>
                  <input className="input" {...createForm.register('address')} />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={onClose} className="btn-ghost border border-gray-200">
                  {tr('Cancel', 'বাতিল')}
                </button>
                <button type="submit" disabled={createAccount.isPending} className="btn-primary">
                  {createAccount.isPending && <Spinner className="w-3.5 h-3.5" />}
                  {createAccount.isPending ? tr('Creating...', 'তৈরি হচ্ছে...') : tr('Create Account', 'অ্যাকাউন্ট তৈরি করুন')}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary-50 ring-4 ring-white shadow-soft overflow-hidden flex items-center justify-center shrink-0">
                {user!.avatar_url ? (
                  <img src={user!.avatar_url} alt={user!.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-300 text-xl font-display font-bold">
                    {user!.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-lg text-gray-900 truncate">{user!.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone={ROLE_TONES[user!.role]}>{user!.role === 'moderator' ? tr('Moderator', 'মডারেটর') : tr('User', 'ইউজার')}</Badge>
                  <Badge tone={user!.is_active ? 'green' : 'red'}>{user!.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-5">
              {tr('Joined', 'যোগ দিয়েছেন')}: {new Date(user!.created_at).toLocaleDateString(locale)}
            </div>

            <form onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)} className="space-y-4 mb-6">
              <div>
                <label className="field-label">{tr('Name', 'নাম')}</label>
                <input className="input" {...detailsForm.register('full_name')} />
                {detailsForm.formState.errors.full_name && (
                  <p className="field-error">{detailsForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">{tr('Phone', 'ফোন')}</label>
                  <input className="input" {...detailsForm.register('phone')} />
                </div>
                <div>
                  <label className="field-label">{tr('Address', 'ঠিকানা')}</label>
                  <input className="input" {...detailsForm.register('address')} />
                </div>
              </div>
              <button
                type="submit"
                disabled={!detailsForm.formState.isDirty || updateDetails.isPending}
                className="btn-primary btn-sm w-full"
              >
                {updateDetails.isPending && <Spinner className="w-3.5 h-3.5" />}
                {updateDetails.isPending ? tr('Saving...', 'সেভ হচ্ছে...') : tr('Update Details', 'তথ্য আপডেট করুন')}
              </button>
            </form>

            <div className="border-t border-gray-100 pt-4 mb-4 space-y-3">
              <div>
                <label className="field-label">{tr('Role', 'রোল')}</label>
                <select
                  className="select"
                  value={user!.role === 'moderator' ? 'moderator' : 'user'}
                  disabled={changeRole.isPending}
                  onChange={(e) => handleRoleChange(e.target.value as 'user' | 'moderator')}
                >
                  <option value="user">{tr('User', 'ইউজার')}</option>
                  <option value="moderator">{tr('Moderator', 'মডারেটর')}</option>
                </select>
              </div>

              <button
                type="button"
                disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate({ userId: user!.id, isActive: !user!.is_active })}
                className="btn-outline btn-sm w-full"
              >
                {user!.is_active ? tr('Deactivate Account', 'অ্যাকাউন্ট নিষ্ক্রিয় করুন') : tr('Activate Account', 'অ্যাকাউন্ট সক্রিয় করুন')}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1.5">{tr('Change Email', 'ইমেইল পরিবর্তন')}</div>
                <p className="text-xs text-gray-400 mb-2">{tr('Current', 'বর্তমান')}: {user!.email}</p>
                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder={tr('New email', 'নতুন ইমেইল')}
                    className="input py-1.5 flex-1 min-w-0"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <button type="submit" disabled={!newEmail.trim() || updateEmail.isPending} className="btn-outline btn-sm sm:shrink-0 w-full sm:w-auto">
                    {updateEmail.isPending && <Spinner className="w-3.5 h-3.5" />}
                    {tr('Update', 'আপডেট')}
                  </button>
                </form>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1.5">{tr('Reset Password', 'পাসওয়ার্ড রিসেট')}</div>
                <form onSubmit={handlePasswordSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder={tr('New password (minimum 6 characters)', 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)')}
                    className="input py-1.5 flex-1 min-w-0"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={newPassword.length < 6 || resetPassword.isPending}
                    className="btn-outline btn-sm sm:shrink-0 w-full sm:w-auto"
                  >
                    {resetPassword.isPending && <Spinner className="w-3.5 h-3.5" />}
                    {tr('Reset', 'রিসেট')}
                  </button>
                </form>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="btn-ghost border border-gray-200">
                {tr('Close', 'বন্ধ করুন')}
              </button>
            </div>
          </>
        )}
    </ModalShell>
  );
}
