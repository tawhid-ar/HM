import { useState } from 'react';
import { useModeratorOrders } from './useModeratorOrders';
import { OrderDetailPanel } from './OrderDetailPanel';
import { STATUS_COLORS, ALL_STATUSES, getStatusLabel } from './orderStatusMeta';
import type { OrderStatus } from '../../types/database.types';
import { PageLoader, EmptyState, ModalShell } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

const PAGE_SIZE = 15;

export default function OrderQueuePage() {
  const { tr, language, locale } = useLanguage();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useModeratorOrders({ page, pageSize: PAGE_SIZE, status, search });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selectedOrder = data?.orders.find((order) => order.id === selectedOrderId) ?? null;

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Order Management', 'অর্ডার ম্যানেজমেন্ট')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Review orders, open details by clicking a row, and manage fulfilment status.', 'অর্ডার রিভিউ করুন, কার্ড/রো-তে ক্লিক করে বিস্তারিত দেখুন এবং স্ট্যাটাস পরিচালনা করুন।')}</p>
        </div>
      </div>

      <div className="dashboard-panel mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="text" placeholder={tr('Search by order number...', 'অর্ডার নম্বর দিয়ে খুঁজুন...')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="input w-full sm:max-w-sm" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | 'all'); setPage(0); }} className="select w-full sm:w-auto">
          <option value="all">{tr('All statuses', 'সব স্ট্যাটাস')}</option>
          {ALL_STATUSES.map((value) => <option key={value} value={value}>{getStatusLabel(value, language)}</option>)}
        </select>
        {isFetching && <span className="text-xs font-medium text-gray-400">{tr('Updating...', 'আপডেট হচ্ছে...')}</span>}
      </div>

      {isLoading ? <PageLoader /> : data && data.orders.length > 0 ? (
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[760px]">
            <thead><tr><th>{tr('Order number', 'অর্ডার নম্বর')}</th><th>{tr('Customer', 'কাস্টমার')}</th><th>{tr('Total', 'মোট')}</th><th>{tr('Status', 'স্ট্যাটাস')}</th><th>{tr('Date', 'তারিখ')}</th><th className="text-right">{tr('Details', 'বিস্তারিত')}</th></tr></thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id} role="button" tabIndex={0} aria-label={tr(`View details for order ${order.order_number}`, `${order.order_number} অর্ডারের বিস্তারিত দেখুন`)} onClick={() => setSelectedOrderId(order.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedOrderId(order.id); } }} className="cursor-pointer focus:bg-primary-50/60 focus:outline-none">
                  <td className="font-mono text-xs text-gray-600">{order.order_number}</td>
                  <td><div className="font-medium text-gray-800">{order.customer?.full_name ?? '—'}</div>{order.customer?.phone && <div className="text-xs text-gray-500">{order.customer.phone}</div>}{order.customer?.email && <div className="text-xs text-gray-400">{order.customer.email}</div>}</td>
                  <td className="font-semibold text-gray-800">৳{order.total_amount}</td>
                  <td><span className={`badge ${STATUS_COLORS[order.status]}`}>{getStatusLabel(order.status, language)}</span></td>
                  <td className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString(locale)}</td>
                  <td className="text-right text-xs font-semibold text-primary-700">{tr('Click to view', 'ক্লিক করুন')} →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon="📭" title={tr('No orders found', 'কোনো অর্ডার পাওয়া যায়নি')} />}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের')}</button>
          <span className="text-xs text-gray-500">{tr('Page', 'পৃষ্ঠা')} {page + 1} / {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের')}</button>
        </div>
      )}

      {selectedOrder && (
        <ModalShell onClose={() => setSelectedOrderId(null)} maxWidthClass="max-w-4xl" labelledBy="moderator-order-details-title" contentClassName="p-0 pt-14">
          <div className="border-b border-gray-100 px-4 pb-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{tr('Order details', 'অর্ডারের বিস্তারিত')}</p>
                <h3 id="moderator-order-details-title" className="mt-1 font-display text-xl font-bold text-gray-900">{selectedOrder.order_number}</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedOrder.customer?.full_name ?? tr('Name unavailable', 'নাম পাওয়া যায়নি')}</p><p className="mt-0.5 text-xs text-gray-400">{selectedOrder.customer?.phone ?? '—'} · {selectedOrder.customer?.email ?? '—'}</p>
              </div>
              <span className={`badge ${STATUS_COLORS[selectedOrder.status]}`}>{getStatusLabel(selectedOrder.status, language)}</span>
            </div>
          </div>
          <OrderDetailPanel order={selectedOrder} />
        </ModalShell>
      )}
    </div>
  );
}
