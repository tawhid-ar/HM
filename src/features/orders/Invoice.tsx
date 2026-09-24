import type { OrderItem } from '../../types/database.types';
import type { InvoiceOrder } from './useInvoice';
import logoIcon from '../../assets/logo-icon-transparent.png';
import { useLanguage } from '../../contexts/LanguageContext';
import { getPaymentMethodLabel, getPaymentStatusLabel } from './orderStatusMeta';

export function Invoice({ order, items }: { order: InvoiceOrder; items: OrderItem[] }) {
  const { tr, language, locale } = useLanguage();
  return (
    <div id="invoice-root" className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 text-sm shadow-soft sm:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3"><img src={logoIcon} alt="" className="h-12 w-12 object-contain" /><div><div className="font-display text-xl font-bold text-primary-800">Hadia Mart</div><div className="text-xs text-gray-400">{tr('Invoice', 'ইনভয়েস')}</div></div></div>
        <div className="break-all sm:text-right"><div className="font-semibold text-gray-800">{order.order_number}</div><div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString(locale)}</div></div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{tr('Delivery address', 'ডেলিভারি ঠিকানা')}</div><div className="text-gray-700">{order.shipping_address}</div></div>
        <div><div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{tr('Payment', 'পেমেন্ট')}</div><div className="text-gray-700">{getPaymentMethodLabel(order.payment_method ?? '', language) || '—'}</div><div className="text-xs text-gray-500">{getPaymentStatusLabel(order.payment_status, language)}</div>{order.payment_method === 'bkash' && order.payment_transaction_id && <div className="mt-1 text-xs text-gray-500">{tr('Transaction ID', 'ট্রানজেকশন আইডি')}: <span className="font-mono text-gray-700">{order.payment_transaction_id}</span></div>}{order.referral_code && <div className="mt-1 text-xs text-gray-500">{tr('Referral code', 'রেফার কোড')}: {order.referral_code}</div>}</div>
      </div>
      {order.delivery_partner && <div className="mb-6"><div className="mb-1 text-xs uppercase tracking-wide text-gray-400">{tr('Delivery partner', 'ডেলিভারি পার্টনার')}</div><div className="text-gray-700">{order.delivery_partner.name} — {order.delivery_partner.phone}</div></div>}
      <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin"><table className="mb-4 w-full min-w-[520px] text-sm"><thead><tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400"><th className="py-2 font-medium">{tr('Product', 'প্রোডাক্ট')}</th><th className="py-2 text-right font-medium">{tr('Price', 'দাম')}</th><th className="py-2 text-right font-medium">{tr('Qty', 'পরিমাণ')}</th><th className="py-2 text-right font-medium">{tr('Subtotal', 'সাবটোটাল')}</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-gray-50"><td className="py-2.5 text-gray-700">{item.product_name}</td><td className="py-2.5 text-right text-gray-500">৳{item.price}</td><td className="py-2.5 text-right text-gray-500">{item.quantity}</td><td className="py-2.5 text-right font-medium text-gray-800">৳{(item.price * item.quantity).toFixed(2)}</td></tr>)}</tbody></table></div>
      <div className="flex justify-end"><div className="flex w-52 justify-between border-t-2 border-primary-100 pt-3 text-base font-bold text-primary-800"><span>{tr('Grand total', 'সর্বমোট')}</span><span>৳{order.total_amount.toFixed(2)}</span></div></div>
      <p className="mt-8 text-center text-xs text-gray-400">{tr('Thank you for shopping with Hadia Mart.', 'Hadia Mart থেকে কেনাকাটার জন্য ধন্যবাদ।')}</p>
    </div>
  );
}
