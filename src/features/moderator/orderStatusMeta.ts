import type { OrderStatus } from '../../types/database.types';
import type { AppLanguage } from '../../contexts/LanguageContext';

type Bilingual = { en: string; bn: string };

export const STATUS_LABELS_I18N: Record<OrderStatus, Bilingual> = {
  pending: { en: 'Pending', bn: 'পেন্ডিং' },
  processing: { en: 'Processing', bn: 'প্রসেসিং' },
  confirmed: { en: 'Confirmed', bn: 'কনফার্মড' },
  out_for_delivery: { en: 'Out for delivery', bn: 'ডেলিভারির জন্য বের হয়েছে' },
  delivered: { en: 'Delivered', bn: 'ডেলিভারড' },
  cancelled: { en: 'Cancelled', bn: 'বাতিল' },
  returned: { en: 'Returned', bn: 'রিটার্নড' },
  shipped: { en: 'Shipped', bn: 'শিপড' },
};

// Backward-compatible English defaults. Dashboard pages should prefer getStatusLabel().
export const STATUS_LABELS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_LABELS_I18N).map(([key, value]) => [key, value.en]),
) as Record<OrderStatus, string>;

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-indigo-100 text-indigo-800',
  confirmed: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-accent-100 text-accent-800',
  delivered: 'bg-primary-100 text-primary-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-200 text-gray-800',
  shipped: 'bg-accent-100 text-accent-800',
};

export const ALL_STATUSES: OrderStatus[] = [
  'pending', 'processing', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'returned',
];

const PAYMENT_METHOD_LABELS_I18N: Record<string, Bilingual> = {
  cod: { en: 'Cash on Delivery', bn: 'ক্যাশ অন ডেলিভারি' },
  bkash: { en: 'bKash', bn: 'বিকাশ' },
};

const PAYMENT_STATUS_LABELS_I18N: Record<string, Bilingual> = {
  unpaid: { en: 'Unpaid', bn: 'অপরিশোধিত' },
  pending_verification: { en: 'Pending verification', bn: 'যাচাই বাকি' },
  paid: { en: 'Paid', bn: 'পরিশোধিত' },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PAYMENT_METHOD_LABELS_I18N).map(([key, value]) => [key, value.en]),
);

export const PAYMENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PAYMENT_STATUS_LABELS_I18N).map(([key, value]) => [key, value.en]),
);

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-gray-200 text-gray-700',
  pending_verification: 'bg-amber-100 text-amber-800',
  paid: 'bg-primary-100 text-primary-800',
};

export function getStatusLabel(status: OrderStatus, language: AppLanguage) {
  return STATUS_LABELS_I18N[status]?.[language] ?? status;
}

export function getPaymentMethodLabel(method: string, language: AppLanguage) {
  return PAYMENT_METHOD_LABELS_I18N[method]?.[language] ?? method;
}

export function getPaymentStatusLabel(status: string, language: AppLanguage) {
  return PAYMENT_STATUS_LABELS_I18N[status]?.[language] ?? status;
}
