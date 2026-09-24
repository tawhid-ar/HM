import { useState } from 'react';
import { useAuditLogs } from './useAuditLogs';
import { PageLoader, EmptyState } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AuditLogPage() {
  const { tr, locale } = useLanguage();
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = useAuditLogs({ page });

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Audit Log', 'অডিট লগ')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Review sensitive system changes such as role updates and other administrative actions.', 'রোল পরিবর্তনসহ সিস্টেমের গুরুত্বপূর্ণ প্রশাসনিক পরিবর্তনের রেকর্ড দেখুন।')}</p>
        </div>
      </div>

      {isLoading ? <PageLoader /> : data && data.logs.length > 0 ? (
        <div className="space-y-2.5">
          {data.logs.map((log) => (
            <div key={log.id} className="card p-4 text-sm sm:p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-gray-900">{log.action === 'role_change' ? tr('Role change', 'রোল পরিবর্তন') : log.action}</span>
                <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString(locale)}</span>
              </div>
              <div className="mt-1.5 text-gray-500">{tr('Performed by', 'করেছেন')}: <span className="font-medium text-gray-700">{log.actor?.full_name ?? tr('Unknown', 'অজানা')}</span> ({log.actor?.email})</div>
              {log.meta && <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-500 scrollbar-thin">{JSON.stringify(log.meta, null, 2)}</pre>}
            </div>
          ))}
        </div>
      ) : <EmptyState icon="🗂️" title={tr('No audit logs found', 'কোনো লগ পাওয়া যায়নি')} />}

      <div className="mt-5 flex items-center justify-center gap-2">
        <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের পাতা')}</button>
        <button disabled={isFetching || (data ? data.logs.length < 30 : true)} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের পাতা')}</button>
      </div>
    </div>
  );
}
