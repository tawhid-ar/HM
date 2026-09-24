import { useOrderTracking } from './useOrderTracking';
import { STATUS_COLORS, PAYMENT_STATUS_COLORS, getStatusLabel, getPaymentMethodLabel, getPaymentStatusLabel } from './orderStatusMeta';
import { useLanguage } from '../../contexts/LanguageContext';
import type { MyOrderRow } from './useMyOrders';

export function OrderTrackingPanel({ order }: { order: MyOrderRow }) {
  const { tr, language, locale } = useLanguage();
  const { data, isLoading } = useOrderTracking(order.id);
  if (isLoading) return <div className="p-4 text-sm text-gray-500">{tr('Loading...', 'লোড হচ্ছে...')}</div>;

  return (
    <div className="space-y-4 border-t border-gray-100 bg-gray-50/70 p-4 sm:p-5">
      <div>
        <div className="mb-2 text-sm font-bold text-gray-700">{tr('Products', 'প্রোডাক্টসমূহ')}</div>
        <div className="overflow-x-auto scrollbar-thin"><table className="table-clean min-w-[520px]"><thead><tr><th>{tr('Product', 'প্রোডাক্ট')}</th><th>{tr('Price', 'দাম')}</th><th>{tr('Qty', 'পরিমাণ')}</th><th>{tr('Subtotal', 'সাবটোটাল')}</th></tr></thead><tbody>{data?.items.map((item) => <tr key={item.id}><td>{item.product_name}</td><td>৳{item.price}</td><td>{item.quantity}</td><td className="font-medium">৳{(item.price * item.quantity).toFixed(2)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-3 text-sm">
        <div><span className="text-gray-500">{tr('Address', 'ঠিকানা')}: </span>{order.shipping_address}</div>
        <div className="flex flex-wrap items-center gap-2">{order.payment_method && <span className="text-gray-500">{tr('Payment', 'পেমেন্ট')}: <span className="text-gray-800">{getPaymentMethodLabel(order.payment_method, language)}</span></span>}<span className={`badge ${PAYMENT_STATUS_COLORS[order.payment_status] ?? 'bg-gray-100 text-gray-700'}`}>{getPaymentStatusLabel(order.payment_status, language)}</span>{order.payment_method === 'bkash' && order.payment_transaction_id && <span className="text-gray-500">{tr('Transaction ID', 'ট্রানজেকশন আইডি')}: <span className="font-mono text-gray-800">{order.payment_transaction_id}</span></span>}{order.referral_code && <span className="text-gray-500">{tr('Referral code', 'রেফার কোড')}: <span className="text-gray-800">{order.referral_code}</span></span>}</div>
        {order.payment_method === 'bkash' && order.payment_status === 'pending_verification' && <p className="text-xs text-amber-600">{tr('Your bKash payment is being verified.', 'আপনার বিকাশ পেমেন্ট যাচাই করা হচ্ছে।')}</p>}
      </div>
      <div><div className="mb-2 text-sm font-bold text-gray-700">{tr('Status history', 'স্ট্যাটাস হিস্ট্রি')}</div><ul className="space-y-1.5 text-sm">{data?.history.map((history) => <li key={history.id} className="flex flex-wrap items-baseline gap-2"><span className={`badge ${STATUS_COLORS[history.status]}`}>{getStatusLabel(history.status, language)}</span><span className="text-xs text-gray-400">{new Date(history.created_at).toLocaleString(locale)}</span>{history.status === 'out_for_delivery' ? <span className="text-xs text-gray-600">— {tr('Handed over to delivery partner', 'ডেলিভারি পার্টনারের কাছে হস্তান্তর করা হয়েছে')}</span> : history.note && <span className="text-xs text-gray-600">— {history.note}</span>}</li>)}</ul></div>
    </div>
  );
}
