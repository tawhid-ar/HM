import { useState } from 'react';
import { useModeratorRequests, type ModeratorRequestRow } from './useModeratorRequests';
import { useApproveModeratorRequest, useRejectModeratorRequest } from './useModeratorRequestActions';
import { PageLoader, EmptyState, ModalShell } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

function RequestDetailsModal({ request, onClose }: { request: ModeratorRequestRow; onClose: () => void }) {
  const { tr, locale } = useLanguage();
  const createdAt = new Date(request.created_at);

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-2xl" contentClassName="p-0" labelledBy="moderator-request-title">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4 pr-16 sm:px-6 sm:pr-16">
        <h3 id="moderator-request-title" className="text-lg font-semibold text-gray-900 sm:text-xl">{tr('Moderator request details', 'মডারেটর রিকোয়েস্টের বিস্তারিত')}</h3>
        <p className="mt-0.5 break-all text-xs text-gray-500 sm:text-sm">{tr('Request ID', 'রিকোয়েস্ট আইডি')}: {request.id}</p>
      </div>
      <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{tr('Candidate', 'প্রার্থী')}</div>
          <div className="break-words text-lg font-semibold text-gray-900">{request.candidate_name || request.candidate_email}</div>
          <div className="mt-1 break-all text-sm text-gray-600">{request.candidate_email}</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><div className="text-xs font-medium text-gray-400">{tr('Status', 'স্ট্যাটাস')}</div><div className="mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700">{tr('Pending', 'পেন্ডিং')}</div></div>
          <div><div className="text-xs font-medium text-gray-400">{tr('Requested at', 'রিকোয়েস্টের তারিখ')}</div><div className="mt-1 text-sm font-medium text-gray-800">{createdAt.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</div><div className="text-xs text-gray-500">{createdAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div></div>
        </div>
        <div><div className="text-xs font-medium text-gray-400">{tr('Requested by', 'অনুরোধ করেছেন')}</div><div className="mt-1 text-sm font-medium text-gray-800">{request.requester?.full_name ?? tr('Unknown', 'অজানা')}</div></div>
        <div><div className="text-xs font-medium text-gray-400">{tr('Reason / details', 'কারণ / বিস্তারিত')}</div><div className="mt-2 min-h-24 whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">{request.reason?.trim() || tr('No reason was provided.', 'কোনো কারণ উল্লেখ করা হয়নি।')}</div></div>
      </div>
      <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-4 sm:px-6"><button type="button" onClick={onClose} className="btn-outline w-full sm:w-auto">{tr('Close', 'বন্ধ করুন')}</button></div>
    </ModalShell>
  );
}

export default function ModeratorRequestsPage() {
  const { tr, locale } = useLanguage();
  const { data: requests, isLoading } = useModeratorRequests('pending');
  const approve = useApproveModeratorRequest();
  const reject = useRejectModeratorRequest();
  const [selectedRequest, setSelectedRequest] = useState<ModeratorRequestRow | null>(null);

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div><h2 className="section-title">{tr('Moderator Requests', 'মডারেটর রিকোয়েস্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('Review requests submitted by moderators to promote another user to moderator.', 'নতুন মডারেটর যোগ করার জন্য মডারেটরদের পাঠানো রিকোয়েস্ট রিভিউ করুন।')}</p></div>
      </div>
      {isLoading ? <PageLoader /> : requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} role="button" tabIndex={0} aria-label={tr(`View moderator request for ${request.candidate_name || request.candidate_email}`, `${request.candidate_name || request.candidate_email} এর মডারেটর রিকোয়েস্টের বিস্তারিত দেখুন`)} className="card cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/40 sm:flex sm:items-start sm:justify-between sm:gap-3" onClick={() => setSelectedRequest(request)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRequest(request); } }}>
              <div className="min-w-0">
                <div className="break-words font-semibold text-gray-900">{request.candidate_name || request.candidate_email}</div>
                <div className="break-all text-sm text-gray-500">{request.candidate_email}</div>
                {request.reason && <div className="mt-1 line-clamp-2 break-words text-sm text-gray-600">{tr('Reason', 'কারণ')}: {request.reason}</div>}
                <div className="mt-1 text-xs text-gray-400">{tr('Requested by', 'অনুরোধ করেছেন')}: {request.requester?.full_name ?? tr('Unknown', 'অজানা')} · {new Date(request.created_at).toLocaleDateString(locale)}</div>
                <div className="mt-2 text-xs font-semibold text-emerald-700">{tr('Click the card to view details', 'বিস্তারিত দেখতে কার্ডে ক্লিক করুন')}</div>
              </div>
              <div className="mt-3 flex w-full gap-2 sm:mt-0 sm:w-auto sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <button className="btn-primary btn-sm" disabled={approve.isPending} onClick={() => approve.mutate(request)}>{tr('Approve', 'অনুমোদন')}</button>
                <button className="btn-outline btn-sm" disabled={reject.isPending} onClick={() => reject.mutate(request.id)}>{tr('Reject', 'বাতিল')}</button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon="✅" title={tr('No pending requests', 'কোনো পেন্ডিং রিকোয়েস্ট নেই')} />}
      {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}
