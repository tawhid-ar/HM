import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, EmptyState, PageLoader } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import type { RequestStatus } from '../../types/database.types';
import { ProductFormModal } from './ProductFormModal';
import { useCreateProduct } from './useProductMutations';
import { useAdminProductRequests, useReviewProductRequest, type AdminProductRequest } from './useProductRequests';

const TONES: Record<RequestStatus, 'yellow' | 'green' | 'red'> = { pending: 'yellow', approved: 'green', rejected: 'red' };
export default function ProductRequestsPage() {
  const { tr, locale } = useLanguage();
  const [status, setStatus] = useState<RequestStatus | 'all'>('pending');
  const { data = [], isLoading } = useAdminProductRequests(status);
  const review = useReviewProductRequest();
  const create = useCreateProduct();
  const [adding, setAdding] = useState<AdminProductRequest | null>(null);
  const label = (s: RequestStatus) => s === 'pending' ? tr('Pending', 'পেন্ডিং') : s === 'approved' ? tr('Approved', 'অনুমোদিত') : tr('Rejected', 'বাতিল');

  const reject = async (request: AdminProductRequest) => {
    try { await review.mutateAsync({ id: request.id, status: 'rejected' }); toast.success(tr('Request rejected', 'রিকোয়েস্ট বাতিল হয়েছে')); }
    catch (e) { toast.error(e instanceof Error ? e.message : tr('Could not update request', 'রিকোয়েস্ট আপডেট করা যায়নি')); }
  };

  return <div>
    <div className="dashboard-page-header mb-5"><h2 className="section-title">{tr('Product Requests', 'প্রোডাক্ট রিকোয়েস্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('Review customer requests. Add the requested product or reject the request.', 'কাস্টমারের রিকোয়েস্ট দেখুন। প্রোডাক্ট যোগ করুন অথবা বাতিল করুন।')}</p></div>
    <div className="dashboard-panel mb-4"><select className="select w-full sm:w-52" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | 'all')}><option value="all">{tr('All requests', 'সব রিকোয়েস্ট')}</option><option value="pending">{tr('Pending', 'পেন্ডিং')}</option><option value="approved">{tr('Approved', 'অনুমোদিত')}</option><option value="rejected">{tr('Rejected', 'বাতিল')}</option></select></div>
    {isLoading ? <PageLoader /> : !data.length ? <EmptyState icon="📝" title={tr('No product requests', 'কোনো প্রোডাক্ট রিকোয়েস্ট নেই')} /> : <div className="space-y-3">{data.map((request) => <div key={request.id} className="card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{request.product_name}</h3><p className="mt-1 text-sm text-gray-600">{request.description || '—'}</p></div><Badge tone={TONES[request.status]}>{label(request.status)}</Badge></div><div className="mt-3 grid gap-1 text-xs text-gray-500 sm:grid-cols-4"><span>{tr('User', 'ইউজার')}: {request.requester?.full_name ?? '—'}</span><span>{tr('Email', 'ইমেইল')}: {request.requester?.email ?? '—'}</span><span>{tr('Phone', 'ফোন')}: {request.requester?.phone ?? '—'}</span><span>{new Date(request.created_at).toLocaleString(locale)}</span></div>{request.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary btn-sm" onClick={() => setAdding(request)}>+ {tr('Add this product', 'এই প্রোডাক্ট যোগ করুন')}</button><button className="btn-outline btn-sm border-red-200 text-red-600" disabled={review.isPending} onClick={() => void reject(request)}>{tr('Reject', 'বাতিল')}</button></div>}</div>)}</div>}
    {adding && <ProductFormModal prefill={{ name: adding.product_name, description: adding.description ?? '' }} onClose={() => setAdding(null)} onSubmit={async (values) => { await create.mutateAsync(values); await review.mutateAsync({ id: adding.id, status: 'approved' }); toast.success(tr('Product added and request approved', 'প্রোডাক্ট যোগ হয়েছে এবং রিকোয়েস্ট অনুমোদিত হয়েছে')); setAdding(null); }} isSubmitting={create.isPending || review.isPending} />}
  </div>;
}
