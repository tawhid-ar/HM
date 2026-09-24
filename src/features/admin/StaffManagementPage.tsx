import { useEffect, useState } from 'react';
import { useAdminStaffUsers } from './useAdminStaffUsers';
import type { Profile } from '../../types/database.types';
import { StaffFormModal } from './StaffFormModal';
import { Badge, PageLoader, EmptyState } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

export default function StaffManagementPage() {
  const { tr } = useLanguage();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'moderator'>('all');
  const [modalUser, setModalUser] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminStaffUsers({ page, search, roleFilter });

  useEffect(() => {
    if (!modalUser) return;
    const fresh = data?.users.find((user) => user.id === modalUser.id);
    if (fresh && fresh !== modalUser) setModalUser(fresh);
  }, [data, modalUser]);

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Moderators & Users', 'মডারেটর ও ইউজার')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Create moderator or user accounts and manage their profile, role and status.', 'নতুন মডারেটর/ইউজার অ্যাকাউন্ট তৈরি এবং প্রোফাইল, রোল ও স্ট্যাটাস পরিচালনা করুন।')}</p>
        </div>
        <button className="btn-primary btn-sm shrink-0 self-start whitespace-nowrap shadow-md" onClick={() => setModalUser(null)}>+ {tr('New Account', 'নতুন অ্যাকাউন্ট')}</button>
      </div>

      <div className="dashboard-panel mb-4 flex flex-col gap-3 sm:flex-row">
        <input className="input flex-1" placeholder={tr('Search by name or email...', 'নাম বা ইমেইল দিয়ে খুঁজুন...')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <select className="select sm:w-48" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as 'all' | 'user' | 'moderator'); setPage(0); }}>
          <option value="all">{tr('All roles', 'সব রোল')}</option>
          <option value="user">{tr('User', 'ইউজার')}</option>
          <option value="moderator">{tr('Moderator', 'মডারেটর')}</option>
        </select>
      </div>

      {isLoading ? <PageLoader /> : !data?.users.length ? (
        <EmptyState icon="👥" title={tr('No users found', 'কোনো ইউজার পাওয়া যায়নি')} />
      ) : (
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[620px]">
            <thead><tr><th>{tr('Name', 'নাম')}</th><th>{tr('Email', 'ইমেইল')}</th><th>{tr('Role', 'রোল')}</th><th>{tr('Status', 'স্ট্যাটাস')}</th><th></th></tr></thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} onClick={() => setModalUser(user)} className="cursor-pointer">
                  <td className="font-medium text-gray-800">{user.full_name}</td>
                  <td className="text-gray-600">{user.email}</td>
                  <td><Badge tone={user.role === 'moderator' ? 'blue' : 'gray'}>{user.role === 'moderator' ? tr('Moderator', 'মডারেটর') : tr('User', 'ইউজার')}</Badge></td>
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

      {modalUser !== undefined && <StaffFormModal user={modalUser} onClose={() => setModalUser(undefined)} />}
    </div>
  );
}
