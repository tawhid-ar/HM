import { useEffect, useState } from 'react';
import { useAllUsers } from './useAllUsers';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Profile, UserRole } from '../../types/database.types';
import { UserFormModal } from './UserFormModal';
import { Badge, PageLoader, EmptyState } from '../../components/common/ui';

const ROLE_TONES: Record<UserRole, 'gray' | 'blue' | 'orange' | 'red'> = { user: 'gray', sub_admin: 'blue', moderator: 'blue', admin: 'orange', super_admin: 'red' };

export default function UserManagementPage() {
  const { profile: currentUser } = useAuth();
  const { tr } = useLanguage();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [modalUser, setModalUser] = useState<Profile | null | undefined>(undefined);

  const roleLabel = (role: UserRole) => ({ user: tr('User', 'ইউজার'), sub_admin: tr('Sub Admin', 'সাব অ্যাডমিন'), moderator: tr('Moderator', 'মডারেটর'), admin: tr('Admin', 'অ্যাডমিন'), super_admin: tr('Super Admin', 'সুপার অ্যাডমিন') }[role]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAllUsers({ page, search, roleFilter });

  useEffect(() => {
    if (!modalUser) return;
    const fresh = data?.users.find((user) => user.id === modalUser.id);
    if (fresh && fresh !== modalUser) setModalUser(fresh);
  }, [data, modalUser]);

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('User Management', 'ইউজার ম্যানেজমেন্ট')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Manage all accounts, roles and access status from one place.', 'সব অ্যাকাউন্ট, রোল ও অ্যাক্সেস স্ট্যাটাস এক জায়গা থেকে পরিচালনা করুন।')}</p>
        </div>
        <button className="btn-primary btn-sm shrink-0 self-start whitespace-nowrap shadow-md" onClick={() => setModalUser(null)}>+ {tr('New Account', 'নতুন অ্যাকাউন্ট')}</button>
      </div>

      <div className="dashboard-panel mb-4 flex flex-col gap-3 sm:flex-row">
        <input className="input flex-1" placeholder={tr('Search by name or email...', 'নাম বা ইমেইল দিয়ে খুঁজুন...')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <select className="select sm:w-52" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as UserRole | 'all'); setPage(0); }}>
          <option value="all">{tr('All roles', 'সব রোল')}</option>
          <option value="user">{tr('User', 'ইউজার')}</option>
          <option value="sub_admin">{tr('Sub Admin', 'সাব অ্যাডমিন')}</option>
          <option value="moderator">{tr('Moderator', 'মডারেটর')}</option>
          <option value="admin">{tr('Admin', 'অ্যাডমিন')}</option>
          <option value="super_admin">{tr('Super Admin', 'সুপার অ্যাডমিন')}</option>
        </select>
      </div>

      {isLoading ? <PageLoader /> : !data?.users.length ? (
        <EmptyState icon="👥" title={tr('No users found', 'কোনো ইউজার পাওয়া যায়নি')} />
      ) : (
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[700px]">
            <thead><tr><th>{tr('Name', 'নাম')}</th><th>{tr('Email', 'ইমেইল')}</th><th>{tr('Role', 'রোল')}</th><th>{tr('Status', 'স্ট্যাটাস')}</th><th></th></tr></thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} onClick={() => setModalUser(user)} className="cursor-pointer">
                  <td className="font-medium text-gray-800">{user.full_name} {user.id === currentUser?.id && <span className="text-xs text-gray-400">({tr('You', 'আপনি')})</span>}</td>
                  <td className="text-gray-600">{user.email}</td>
                  <td><Badge tone={ROLE_TONES[user.role]}>{roleLabel(user.role)}</Badge></td>
                  <td><Badge tone={user.is_active ? 'green' : 'red'}>{user.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></td>
                  <td className="text-right"><span className="text-xs font-semibold text-primary-700">{tr('Details', 'বিস্তারিত')} →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-2">
        <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের পাতা')}</button>
        <span className="text-sm text-gray-500">{tr('Page', 'পাতা')} {page + 1}</span>
        <button disabled={isFetching || (data ? data.users.length < 20 : true)} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের পাতা')}</button>
      </div>

      {modalUser !== undefined && <UserFormModal user={modalUser} currentUserId={currentUser?.id} onClose={() => setModalUser(undefined)} />}
    </div>
  );
}
