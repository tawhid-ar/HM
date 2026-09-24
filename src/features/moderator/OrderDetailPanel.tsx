import { useMemo, useState } from 'react';
import { useOrderDetail, useUpdateOrderStatus } from './useOrderDetail';
import { useDeliveryPartners, useAssignDeliveryPartner } from './useDeliveryPartners';
import { useUpdatePaymentStatus, type PaymentStatus } from './useUpdatePaymentStatus';
import {
  STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  getStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from './orderStatusMeta';
import type { OrderRow } from './useModeratorOrders';
import type { OrderStatus } from '../../types/database.types';
import { Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

type OrderAction = '' | 'confirm' | 'cancel' | 'handover' | 'delivered' | 'returned';

function getAvailableActions(status: OrderStatus): OrderAction[] {
  switch (status) {
    case 'pending':
    case 'processing':
      return ['confirm', 'cancel'];
    case 'confirmed':
      return ['handover', 'cancel'];
    case 'out_for_delivery':
    case 'shipped':
      return ['delivered', 'returned'];
    case 'delivered':
      return ['returned'];
    default:
      return [];
  }
}

export function OrderDetailPanel({ order }: { order: OrderRow }) {
  const { tr, language, locale } = useLanguage();
  const { data, isLoading } = useOrderDetail(order.id);
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  const { data: partners, isLoading: partnersLoading } = useDeliveryPartners();
  const assignPartner = useAssignDeliveryPartner();

  const [selectedAction, setSelectedAction] = useState<OrderAction>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [actionNote, setActionNote] = useState('');

  const availableActions = useMemo(() => getAvailableActions(order.status), [order.status]);
  const actionPending = updateStatus.isPending || assignPartner.isPending;
  const handoverSelected = selectedAction === 'handover';
  const noActivePartners = handoverSelected && !partnersLoading && (!partners || partners.length === 0);

  const actionLabel = (action: OrderAction) => {
    switch (action) {
      case 'confirm':
        return tr('Confirm order', 'অর্ডার কনফার্ম করুন');
      case 'cancel':
        return tr('Cancel order', 'অর্ডার বাতিল করুন');
      case 'handover':
        return tr('Hand over to delivery partner', 'ডেলিভারি পার্টনারকে হস্তান্তর করুন');
      case 'delivered':
        return tr('Mark as delivered', 'ডেলিভারড হিসেবে চিহ্নিত করুন');
      case 'returned':
        return tr('Mark as returned', 'রিটার্ন হিসেবে চিহ্নিত করুন');
      default:
        return tr('Select an action', 'একটি অ্যাকশন নির্বাচন করুন');
    }
  };

  const resetAction = () => {
    setSelectedAction('');
    setSelectedPartnerId('');
    setActionNote('');
  };

  const handleActionConfirm = () => {
    if (!selectedAction || actionPending) return;

    if (selectedAction === 'handover') {
      if (!selectedPartnerId) return;
      assignPartner.mutate(
        {
          orderId: order.id,
          deliveryPartnerId: selectedPartnerId,
          note: actionNote.trim() || undefined,
        },
        { onSuccess: resetAction },
      );
      return;
    }

    const statusMap: Record<Exclude<OrderAction, '' | 'handover'>, OrderStatus> = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      delivered: 'delivered',
      returned: 'returned',
    };

    updateStatus.mutate(
      {
        orderId: order.id,
        newStatus: statusMap[selectedAction],
        note: actionNote.trim() || undefined,
      },
      { onSuccess: resetAction },
    );
  };

  if (isLoading) {
    return <div className="p-5 text-sm text-gray-500">{tr('Loading...', 'লোড হচ্ছে...')}</div>;
  }

  return (
    <div className="space-y-5 bg-gray-50/70 p-4 sm:p-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-800">{tr('Customer information', 'কাস্টমার তথ্য')}</div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div><span className="text-gray-400">{tr('Name', 'নাম')}:</span> <span className="font-medium text-gray-800">{order.customer?.full_name ?? '—'}</span></div>
          <div><span className="text-gray-400">{tr('Phone', 'ফোন')}:</span> <span className="text-gray-800">{order.customer?.phone ?? '—'}</span></div>
          <div><span className="text-gray-400">{tr('Email', 'ইমেইল')}:</span> <span className="break-all text-gray-800">{order.customer?.email ?? '—'}</span></div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-100 bg-white p-3 sm:p-4">
        <div className="mb-2 text-sm font-semibold text-gray-800">{tr('Products', 'প্রোডাক্ট সমূহ')}</div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[520px]">
            <thead>
              <tr>
                <th>{tr('Product', 'প্রোডাক্ট')}</th>
                <th>{tr('Price', 'দাম')}</th>
                <th>{tr('Quantity', 'পরিমাণ')}</th>
                <th>{tr('Subtotal', 'সাবটোটাল')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>৳{item.price}</td>
                  <td>{item.quantity}</td>
                  <td className="font-medium">৳{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm">
        <div>
          <span className="text-gray-500">{tr('Delivery address', 'ডেলিভারি ঠিকানা')}: </span>
          <span className="text-gray-800">{order.shipping_address}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order.payment_method && (
            <span className="text-gray-500">
              {tr('Payment method', 'পেমেন্ট পদ্ধতি')}:{' '}
              <span className="text-gray-800">{getPaymentMethodLabel(order.payment_method, language)}</span>
            </span>
          )}
          <span className={`badge ${PAYMENT_STATUS_COLORS[order.payment_status] ?? 'bg-gray-100 text-gray-700'}`}>
            {getPaymentStatusLabel(order.payment_status, language)}
          </span>
        </div>

        {order.payment_method === 'bkash' && (
          <div>
            <span className="text-gray-500">{tr('bKash transaction ID', 'বিকাশ ট্রানজেকশন আইডি')}: </span>
            <span className="font-mono font-semibold text-gray-900">
              {order.payment_transaction_id || tr('Not recorded (legacy order)', 'রেকর্ড করা নেই (পুরনো অর্ডার)')}
            </span>
          </div>
        )}

        {order.referral_code && (
          <div>
            <span className="text-gray-500">{tr('Referral code', 'রেফার কোড')}: </span>
            <span className="text-gray-800">{order.referral_code}</span>
          </div>
        )}

        {order.payment_status !== 'paid' ? (
          <button
            onClick={() => updatePayment.mutate({ orderId: order.id, paymentStatus: 'paid' as PaymentStatus })}
            disabled={updatePayment.isPending}
            className="btn-primary btn-sm"
          >
            {updatePayment.isPending && <Spinner className="h-3.5 w-3.5" />}
            {tr('Payment received — mark as paid', 'পেমেন্ট পাওয়া গেছে — পরিশোধিত হিসেবে চিহ্নিত করুন')}
          </button>
        ) : (
          <button
            onClick={() => updatePayment.mutate({ orderId: order.id, paymentStatus: 'unpaid' as PaymentStatus })}
            disabled={updatePayment.isPending}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            {tr('Made a mistake? Mark as unpaid', 'ভুল হয়েছে? অপরিশোধিত হিসেবে ফিরিয়ে দিন')}
          </button>
        )}

        {order.delivery_partner && (
          <div className="text-gray-500">
            {tr('Delivery partner', 'ডেলিভারি পার্টনার')}:{' '}
            <span className="text-gray-800">{order.delivery_partner.name} ({order.delivery_partner.phone})</span>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 text-sm font-semibold text-gray-800">{tr('Status history', 'স্ট্যাটাস হিস্ট্রি')}</div>
        <ul className="space-y-2 text-sm">
          {data?.history.map((history) => (
            <li key={history.id} className="flex flex-wrap items-baseline gap-2 rounded-xl border border-gray-100 bg-white p-3">
              <span className={`badge ${STATUS_COLORS[history.status]}`}>{getStatusLabel(history.status, language)}</span>
              <span className="text-xs text-gray-500">
                {new Date(history.created_at).toLocaleString(locale)} · {history.changer?.full_name ?? tr('System', 'সিস্টেম')}
              </span>
              {history.note && <span className="text-xs text-gray-600">— {history.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      {availableActions.length > 0 ? (
        <section className="rounded-2xl border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 text-sm font-bold text-gray-900">{tr('Order action', 'অর্ডার অ্যাকশন')}</div>
          <p className="mb-4 text-xs text-gray-500">
            {tr(
              `Current stage: ${getStatusLabel(order.status, 'en')}. Choose the next action, then confirm it.`,
              `বর্তমান ধাপ: ${getStatusLabel(order.status, 'bn')}। পরের অ্যাকশন নির্বাচন করে কনফার্ম করুন।`,
            )}
          </p>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label className="field-label" htmlFor={`order-action-${order.id}`}>
                {tr('Next action', 'পরের অ্যাকশন')}
              </label>
              <select
                id={`order-action-${order.id}`}
                className="select"
                value={selectedAction}
                onChange={(event) => {
                  const nextAction = event.target.value as OrderAction;
                  setSelectedAction(nextAction);
                  if (nextAction !== 'handover') setSelectedPartnerId('');
                }}
                disabled={actionPending}
              >
                <option value="">{tr('Select an action...', 'অ্যাকশন নির্বাচন করুন...')}</option>
                {availableActions.map((action) => (
                  <option key={action} value={action}>{actionLabel(action)}</option>
                ))}
              </select>
            </div>

            {!handoverSelected && (
              <button
                type="button"
                className="btn-primary min-w-[150px] justify-center"
                disabled={!selectedAction || actionPending}
                onClick={handleActionConfirm}
              >
                {actionPending && <Spinner className="h-4 w-4" />}
                {actionPending ? tr('Updating...', 'আপডেট হচ্ছে...') : tr('Confirm action', 'অ্যাকশন কনফার্ম করুন')}
              </button>
            )}
          </div>

          {selectedAction && !handoverSelected && (
            <div className="mt-3">
              <label className="field-label" htmlFor={`order-action-note-${order.id}`}>{tr('Note (optional)', 'নোট (ঐচ্ছিক)')}</label>
              <input
                id={`order-action-note-${order.id}`}
                type="text"
                className="input"
                value={actionNote}
                onChange={(event) => setActionNote(event.target.value)}
                placeholder={tr('Add a short note if needed', 'প্রয়োজনে ছোট নোট লিখুন')}
                disabled={actionPending}
              />
            </div>
          )}

          {handoverSelected && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3 sm:p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                {tr('Choose delivery partner', 'ডেলিভারি পার্টনার নির্বাচন করুন')}
              </div>

              {partnersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Spinner className="h-4 w-4" /> {tr('Loading delivery partners...', 'ডেলিভারি পার্টনার লোড হচ্ছে...')}
                </div>
              ) : !partners || partners.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-white px-3 py-3 text-sm text-amber-800">
                  {tr(
                    'No active delivery partner is available. An Admin or Super Admin must add or activate a partner in Delivery Partners before this order can be handed over.',
                    'কোনো সক্রিয় ডেলিভারি পার্টনার নেই। অর্ডার হস্তান্তরের আগে Admin বা Super Admin-কে Delivery Partners থেকে পার্টনার যোগ বা সক্রিয় করতে হবে।',
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor={`delivery-partner-${order.id}`}>
                      {tr('Delivery partner', 'ডেলিভারি পার্টনার')}
                    </label>
                    <select
                      id={`delivery-partner-${order.id}`}
                      className="select"
                      value={selectedPartnerId}
                      onChange={(event) => setSelectedPartnerId(event.target.value)}
                      disabled={actionPending}
                    >
                      <option value="">{tr('Choose a partner...', 'পার্টনার নির্বাচন করুন...')}</option>
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>{partner.name} — {partner.phone}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`handover-note-${order.id}`}>{tr('Note (optional)', 'নোট (ঐচ্ছিক)')}</label>
                    <input
                      id={`handover-note-${order.id}`}
                      type="text"
                      className="input"
                      value={actionNote}
                      onChange={(event) => setActionNote(event.target.value)}
                      placeholder={tr('Handover note', 'হস্তান্তর নোট')}
                      disabled={actionPending}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn-accent mt-3 w-full justify-center sm:w-auto"
                disabled={!selectedPartnerId || actionPending || noActivePartners}
                onClick={handleActionConfirm}
              >
                {actionPending && <Spinner className="h-4 w-4" />}
                {actionPending ? tr('Handing over...', 'হস্তান্তর হচ্ছে...') : tr('Confirm handover', 'হস্তান্তর কনফার্ম করুন')}
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className="border-t border-gray-200 pt-3 text-xs text-gray-500">
          {tr('This order status can no longer be changed.', 'এই অর্ডারের স্ট্যাটাস আর পরিবর্তন করা যাবে না।')}
        </p>
      )}
    </div>
  );
}
