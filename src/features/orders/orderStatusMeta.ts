import type { OrderStatus } from '../../types/database.types';
import type { AppLanguage } from '../../contexts/LanguageContext';

export const STATUS_LABELS_BN: Record<OrderStatus, string> = {
  pending: 'পেন্ডিং', processing: 'প্রসেসিং', confirmed: 'কনফার্মড', out_for_delivery: 'ডেলিভারির জন্য বের হয়েছে', delivered: 'ডেলিভারড', cancelled: 'বাতিল', returned: 'রিটার্নড', shipped: 'শিপড',
};
export const STATUS_LABELS_EN: Record<OrderStatus, string> = {
  pending: 'Pending', processing: 'Processing', confirmed: 'Confirmed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned', shipped: 'Shipped',
};
export const STATUS_LABELS = STATUS_LABELS_BN;
export const getStatusLabel = (status: OrderStatus, language: AppLanguage) => language === 'bn' ? STATUS_LABELS_BN[status] : STATUS_LABELS_EN[status];

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800', processing: 'bg-indigo-100 text-indigo-800', confirmed: 'bg-blue-100 text-blue-800', out_for_delivery: 'bg-accent-100 text-accent-800', delivered: 'bg-primary-100 text-primary-800', cancelled: 'bg-red-100 text-red-800', returned: 'bg-gray-200 text-gray-800', shipped: 'bg-accent-100 text-accent-800',
};
export const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];

export const PAYMENT_METHOD_LABELS_BN: Record<string, string> = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'বিকাশ' };
export const PAYMENT_METHOD_LABELS_EN: Record<string, string> = { cod: 'Cash on Delivery', bkash: 'bKash' };
export const PAYMENT_STATUS_LABELS_BN: Record<string, string> = { unpaid: 'অপরিশোধিত', pending_verification: 'যাচাই করা হচ্ছে', paid: 'পরিশোধিত' };
export const PAYMENT_STATUS_LABELS_EN: Record<string, string> = { unpaid: 'Unpaid', pending_verification: 'Pending verification', paid: 'Paid' };
export const PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS_BN;
export const PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS_BN;
export const getPaymentMethodLabel = (value: string, language: AppLanguage) => (language === 'bn' ? PAYMENT_METHOD_LABELS_BN : PAYMENT_METHOD_LABELS_EN)[value] ?? value;
export const getPaymentStatusLabel = (value: string, language: AppLanguage) => (language === 'bn' ? PAYMENT_STATUS_LABELS_BN : PAYMENT_STATUS_LABELS_EN)[value] ?? value;
export const PAYMENT_STATUS_COLORS: Record<string, string> = { unpaid: 'bg-gray-200 text-gray-700', pending_verification: 'bg-amber-100 text-amber-800', paid: 'bg-primary-100 text-primary-800' };
