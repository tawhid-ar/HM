import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRequestModerator } from './useRequestModerator';
import { useMyModeratorRequests } from './useMyModeratorRequests';
import { Badge, Spinner, EmptyState, ModalShell } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

type FormShape = { candidate_email: string; candidate_name?: string; reason?: string };
type RequestStatus = 'pending' | 'approved' | 'rejected';
const statusTone: Record<RequestStatus, 'yellow' | 'green' | 'red'> = { pending: 'yellow', approved: 'green', rejected: 'red' };

type MyRequest = { id: string; candidate_email: string; candidate_name: string | null; reason: string | null; status: RequestStatus; created_at: string };

function SentRequestDetailsModal({ request, onClose }: { request: MyRequest; onClose: () => void }) {
  const { tr, locale } = useLanguage();
  const createdAt = new Date(request.created_at);
  const statusLabel = request.status === 'pending' ? tr('Pending', 'পেন্ডিং') : request.status === 'approved' ? tr('Approved', 'অনুমোদিত') : tr('Rejected', 'বাতিল');
  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-xl" contentClassName="p-0" labelledBy="sent-moderator-request-title">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4 pr-16 sm:px-6 sm:pr-16"><h3 id="sent-moderator-request-title" className="text-lg font-semibold text-gray-900 sm:text-xl">{tr('Sent request details', 'পাঠানো রিকোয়েস্টের বিস্তারিত')}</h3><p className="mt-1 break-all text-xs text-gray-400">{tr('Request ID', 'রিকোয়েস্ট আইডি')}: {request.id}</p></div>
      <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="text-xs font-medium text-gray-400">{tr('Candidate', 'প্রার্থী')}</div><div className="mt-1 break-words text-lg font-semibold text-gray-900">{request.candidate_name || request.candidate_email}</div><div className="mt-1 break-all text-sm text-gray-600">{request.candidate_email}</div></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><div className="text-xs font-medium text-gray-400">{tr('Status', 'স্ট্যাটাস')}</div><div className="mt-2"><Badge tone={statusTone[request.status]}>{statusLabel}</Badge></div></div><div><div className="text-xs font-medium text-gray-400">{tr('Requested at', 'রিকোয়েস্টের সময়')}</div><div className="mt-1 text-sm font-medium text-gray-800">{createdAt.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</div><div className="text-xs text-gray-500">{createdAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div></div></div>
        <div><div className="text-xs font-medium text-gray-400">{tr('Reason / details', 'কারণ / বিস্তারিত')}</div><div className="mt-2 min-h-24 whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">{request.reason?.trim() || tr('No reason was provided.', 'কোনো কারণ উল্লেখ করা হয়নি।')}</div></div>
      </div>
      <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-4 sm:px-6"><button type="button" onClick={onClose} className="btn-outline w-full sm:w-auto">{tr('Close', 'বন্ধ করুন')}</button></div>
    </ModalShell>
  );
}

export default function RequestModeratorPage() {
  const { tr, locale } = useLanguage();
  const schema = useMemo(() => z.object({ candidate_email: z.string().email(tr('Enter a valid email address', 'সঠিক ইমেইল দিন')), candidate_name: z.string().optional(), reason: z.string().optional() }), [tr]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormShape>({ resolver: zodResolver(schema) });
  const requestModerator = useRequestModerator();
  const { data: myRequests, isLoading } = useMyModeratorRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const selectedRequest = (myRequests?.find((request) => request.id === selectedRequestId) ?? null) as MyRequest | null;
  const getStatus = (status: RequestStatus) => status === 'pending' ? tr('Pending', 'পেন্ডিং') : status === 'approved' ? tr('Approved', 'অনুমোদিত') : tr('Rejected', 'বাতিল');

  return (
    <div className="max-w-3xl">
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5"><div><h2 className="section-title">{tr('Request a New Moderator', 'নতুন মডারেটর রিকোয়েস্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('The candidate must sign up as a regular user first. Their role changes only after an admin approves this request.', 'প্রার্থীকে আগে সাধারণ ইউজার হিসেবে সাইন আপ করতে হবে। অ্যাডমিন অনুমোদন করার পরেই তার রোল পরিবর্তন হবে।')}</p></div></div>
      <div className="dashboard-panel mb-8">
        <form onSubmit={handleSubmit((values) => requestModerator.mutate(values, { onSuccess: () => reset() }))} className="space-y-4">
          <div><label className="field-label">{tr('Candidate email', 'প্রার্থীর ইমেইল')} *</label><input {...register('candidate_email')} className="input" placeholder="example@mail.com" />{errors.candidate_email && <p className="field-error">{errors.candidate_email.message}</p>}</div>
          <div><label className="field-label">{tr('Candidate name', 'প্রার্থীর নাম')}</label><input {...register('candidate_name')} className="input" placeholder={tr('Optional', 'ঐচ্ছিক')} /></div>
          <div><label className="field-label">{tr('Reason', 'কারণ')}</label><textarea {...register('reason')} rows={4} className="textarea" placeholder={tr('Why should this person become a moderator?', 'কেন তাকে মডারেটর বানানো উচিত...')} /></div>
          <button type="submit" disabled={requestModerator.isPending} className="btn-primary w-full sm:w-auto">{requestModerator.isPending && <Spinner className="h-3.5 w-3.5" />}{requestModerator.isPending ? tr('Sending...', 'পাঠানো হচ্ছে...') : tr('Send Request', 'রিকোয়েস্ট পাঠান')}</button>
        </form>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-gray-700">{tr('Your sent requests', 'আপনার পাঠানো রিকোয়েস্ট')}</h3>
      {isLoading ? <p className="text-sm text-gray-500">{tr('Loading...', 'লোড হচ্ছে...')}</p> : myRequests && myRequests.length > 0 ? (
        <div className="space-y-2">
          {myRequests.map((request) => (
            <div key={request.id} role="button" tabIndex={0} aria-label={tr(`View request details for ${request.candidate_name || request.candidate_email}`, `${request.candidate_name || request.candidate_email} এর রিকোয়েস্টের বিস্তারিত দেখুন`)} className="card flex cursor-pointer items-start justify-between gap-3 p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40" onClick={() => setSelectedRequestId(request.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRequestId(request.id); } }}>
              <div className="min-w-0"><div className="break-words font-medium text-gray-800">{request.candidate_name || request.candidate_email}</div><div className="text-xs text-gray-400">{new Date(request.created_at).toLocaleDateString(locale)}</div>{request.reason && <div className="mt-1 line-clamp-1 break-words text-xs text-gray-500">{request.reason}</div>}<div className="mt-2 text-xs font-semibold text-primary-700">{tr('Click the card to view details', 'বিস্তারিত দেখতে কার্ডে ক্লিক করুন')}</div></div>
              <Badge tone={statusTone[request.status as RequestStatus]}>{getStatus(request.status as RequestStatus)}</Badge>
            </div>
          ))}
        </div>
      ) : <EmptyState icon="📝" title={tr('You have not sent any requests yet', 'এখনো কোনো রিকোয়েস্ট পাঠাননি')} />}
      {selectedRequest && <SentRequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequestId(null)} />}
    </div>
  );
}
