import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyOrders } from '../features/orders/useMyOrders';
import { OrderTrackingPanel } from '../features/orders/OrderTrackingPanel';
import { getStatusLabel, STATUS_COLORS } from '../features/orders/orderStatusMeta';
import { useLanguage } from '../contexts/LanguageContext';
import { PageLoader, EmptyState } from '../components/common/ui';

export default function OrderHistoryPage() {
  const { tr, language, locale } = useLanguage();
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useMyOrders({ page });

  if (isLoading) return <PageLoader />;
  if (!data || data.orders.length === 0) return <EmptyState icon="📦" title={tr('You have no orders yet', 'আপনার এখনো কোনো অর্ডার নেই')} action={<Link to="/" className="btn-primary btn-sm">{tr('Start shopping', 'কেনাকাটা শুরু করুন')}</Link>} />;

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-5 sm:mb-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">{tr('Account', 'অ্যাকাউন্ট')}</p><h1 className="section-title mt-1">{tr('Order history', 'অর্ডার হিস্ট্রি')}</h1></div>
      <div className="space-y-3">
        {data.orders.map((order) => {
          const isOpen = expandedId === order.id;
          return (
            <div key={order.id} className="card overflow-hidden">
              <div role="button" tabIndex={0} onClick={() => setExpandedId(isOpen ? null : order.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setExpandedId(isOpen ? null : order.id); }} className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left transition-colors hover:bg-gray-50/80 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div><div className="font-semibold text-gray-850">{order.order_number}</div><div className="mt-0.5 text-xs text-gray-400">{new Date(order.created_at).toLocaleString(locale)}</div></div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3"><span className="font-bold text-primary-700">৳{order.total_amount}</span><span className={`badge ${STATUS_COLORS[order.status]}`}>{getStatusLabel(order.status, language)}</span><Link to={`/orders/${order.id}/invoice`} onClick={(event) => event.stopPropagation()} className="text-xs font-semibold text-primary-600 hover:underline">{tr('Invoice', 'ইনভয়েস')}</Link><span className={`text-sm text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span></div>
              </div>
              {isOpen && <OrderTrackingPanel order={order} />}
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center gap-2"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের পাতা')}</button><button disabled={data.orders.length < 10} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের পাতা')}</button></div>
    </div>
  );
}
