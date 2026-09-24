import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSubmitProductRequest } from '../features/products/useProductRequest';
import { useMyProductRequests } from '../features/products/useMyProductRequests';
import { useLanguage } from '../contexts/LanguageContext';
import type { RequestStatus } from '../types/database.types';
import { Spinner, Badge } from '../components/common/ui';

type FormShape = { product_name: string; description: string };
const STATUS_TONES: Record<RequestStatus, 'yellow' | 'green' | 'red'> = { pending: 'yellow', approved: 'green', rejected: 'red' };

export default function ProductRequestPage() {
  const { tr, locale } = useLanguage();
  const submitRequest = useSubmitProductRequest();
  const { data: requests, isLoading } = useMyProductRequests();
  const schema = useMemo(() => z.object({ product_name: z.string().min(2, tr('Product name must be at least 2 characters', 'প্রোডাক্টের নাম কমপক্ষে ২ অক্ষর হতে হবে')), description: z.string().trim().min(3, tr('Description is required (minimum 3 characters)', 'বিবরণ আবশ্যক (কমপক্ষে ৩ অক্ষর)')) }), [tr]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormShape>({ resolver: zodResolver(schema) });
  const statusLabel = (status: RequestStatus) => status === 'pending' ? tr('Pending', 'পেন্ডিং') : status === 'approved' ? tr('Approved', 'গৃহীত') : tr('Rejected', 'বাতিল');

  return (
    <div className="page-shell-sm">
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">{tr('Can’t find something?', 'কোনো পণ্য খুঁজে পাচ্ছেন না?')}</p><h1 className="section-title mt-1">{tr('Request a product', 'নতুন প্রোডাক্ট রিকোয়েস্ট')}</h1><p className="mt-2 text-sm leading-6 text-gray-500">{tr('Tell us what you are looking for. Our team will review the request.', 'যে প্রোডাক্টটি খুঁজে পাচ্ছেন না, সেটা এখানে জানান — টিম রিভিউ করবে।')}</p></div>
      <div className="card mb-8 p-5 sm:p-6"><form onSubmit={handleSubmit((values) => submitRequest.mutate({ productName: values.product_name, description: values.description }, { onSuccess: () => reset() }))} className="space-y-4"><div><label className="field-label">{tr('Product name', 'প্রোডাক্টের নাম')}</label><input className="input" {...register('product_name')} />{errors.product_name && <p className="field-error">{errors.product_name.message}</p>}</div><div><label className="field-label">{tr('Description *', 'বিবরণ *')}</label><textarea className="textarea" rows={4} required {...register('description')} />{errors.description && <p className="field-error">{errors.description.message}</p>}</div><button type="submit" disabled={submitRequest.isPending} className="btn-primary w-full">{submitRequest.isPending && <Spinner />}{submitRequest.isPending ? tr('Sending...', 'পাঠানো হচ্ছে...') : tr('Send request', 'রিকোয়েস্ট পাঠান')}</button></form></div>
      <h2 className="mb-3 text-sm font-bold text-gray-700">{tr('Your previous requests', 'আপনার আগের রিকোয়েস্টগুলো')}</h2>
      {isLoading ? <p className="text-sm text-gray-500">{tr('Loading...', 'লোড হচ্ছে...')}</p> : !requests || requests.length === 0 ? <p className="text-sm text-gray-400">{tr('You have not sent any requests yet.', 'এখনো কোনো রিকোয়েস্ট পাঠাননি।')}</p> : <ul className="space-y-2">{requests.map((request) => <li key={request.id} className="card flex items-center justify-between gap-3 p-3.5"><div className="min-w-0"><div className="truncate font-medium text-gray-800">{request.product_name}</div>{request.description && <div className="truncate text-xs text-gray-500">{request.description}</div>}<div className="text-xs text-gray-400">{new Date(request.created_at).toLocaleDateString(locale)}</div></div><Badge tone={STATUS_TONES[request.status]}>{statusLabel(request.status)}</Badge></li>)}</ul>}
    </div>
  );
}
