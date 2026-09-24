import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { UserRole } from '../../types/database.types';

const ROLE_LABELS: Record<UserRole, { en: string; bn: string }> = {
  user: { en: 'User', bn: 'ইউজার' },
  sub_admin: { en: 'Sub Admin', bn: 'সাব অ্যাডমিন' },
  moderator: { en: 'Moderator', bn: 'মডারেটর' },
  admin: { en: 'Admin', bn: 'অ্যাডমিন' },
  super_admin: { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
};

export function accountProfilePath(role: UserRole | undefined) {
  switch (role) {
    case 'super_admin':
      return '/super-admin/profile';
    case 'admin':
      return '/admin/profile';
    case 'sub_admin':
    case 'moderator':
      return '/moderator/profile';
    case 'user':
      return '/user/profile';
    default:
      return '/profile';
  }
}

/**
 * Shared signed-in account controls used by both the storefront and every
 * dashboard shell. The identity pill is the profile link; logout always sits
 * immediately after it so the account UI stays consistent everywhere.
 */
export function AccountHeaderControls({
  onNavigate,
  className = '',
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { session, profile, signOut } = useAuth();
  const { tr } = useLanguage();
  const navigate = useNavigate();

  if (!session) return null;

  const metadataName = typeof session.user.user_metadata?.full_name === 'string'
    ? session.user.user_metadata.full_name.trim()
    : '';
  const displayName = profile?.full_name?.trim() || metadataName || session.user.email || tr('Account', 'অ্যাকাউন্ট');
  const initial = displayName.charAt(0).toUpperCase() || 'U';
  const roleLabel = profile ? ROLE_LABELS[profile.role] : null;
  const profilePath = accountProfilePath(profile?.role);

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className={`flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 ${className}`}>
      <Link
        to={profilePath}
        onClick={onNavigate}
        className="group flex min-w-0 items-center gap-2 rounded-full border border-gray-200/90 bg-white px-1.5 py-1.5 shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary-100 sm:px-2.5"
        aria-label={tr('Open my profile', 'আমার প্রোফাইল খুলুন')}
        title={tr('Open my profile', 'আমার প্রোফাইল খুলুন')}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-xs font-bold text-primary-700 ring-1 ring-primary-100 sm:h-9 sm:w-9">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="hidden min-w-0 text-left min-[520px]:block">
          <div className="max-w-[9rem] truncate text-xs font-semibold text-gray-800 group-hover:text-primary-800 sm:max-w-[11rem]">
            {displayName}
          </div>
          {profile && profile.role !== 'user' && roleLabel && (
            <div className="text-[10px] text-gray-400">
              {tr(roleLabel.en, roleLabel.bn)}
            </div>
          )}
        </div>

      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm sm:font-semibold"
        aria-label={tr('Logout', 'লগআউট')}
        title={tr('Logout', 'লগআউট')}
      >
        <svg className="h-4 w-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3-6l3 3m0 0l-3 3m3-3H9" />
        </svg>
        <span className="hidden sm:inline">{tr('Logout', 'লগআউট')}</span>
      </button>
    </div>
  );
}
