import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid';

/**
 * Unlike order *status* (which goes through the `update_order_status`
 * RPC because it validates the transition graph server-side), payment
 * status has no such state machine to protect — the `orders_update_staff_only`
 * RLS policy already lets any moderator/admin/super_admin write it directly.
 * This exists mainly so a moderator can confirm a bKash payment after
 * checking the transaction manually (there's no payment gateway wired up
 * yet — see the chat note about that).
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: string; paymentStatus: PaymentStatus }) => {
      const { error } = await supabase.from('orders').update({ payment_status: paymentStatus }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Payment status updated', 'পেমেন্ট স্ট্যাটাস আপডেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['moderator-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] }); // user-facing order history
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not update payment status', 'পেমেন্ট স্ট্যাটাস আপডেট করা যায়নি')),
  });
}
