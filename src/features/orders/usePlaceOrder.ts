import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface OrderItemInput {
  product_id: string;
  quantity: number;
}

interface PlaceOrderInput {
  items: OrderItemInput[];
  shippingAddress: string;
  paymentMethod?: string;
  referralCode?: string;
  transactionId?: string;
}

/**
 * Calls the `place_order` Postgres function (see migration 0005), which
 * atomically locks stock rows, deducts inventory, and creates the order.
 * This avoids overselling when many users buy the same product at once.
 */
export function usePlaceOrder() {
  const { session } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, shippingAddress, paymentMethod, referralCode, transactionId }: PlaceOrderInput) => {
      if (!session?.user) throw new Error(tr('You must be logged in to place an order.', 'অর্ডার করতে আগে লগইন করুন।'));

      const { data, error } = await supabase.rpc('place_order', {
        p_user_id: session.user.id,
        p_items: items,
        p_shipping_address: shippingAddress,
        p_payment_method: paymentMethod ?? null,
        p_referral_code: referralCode ?? null,
        p_transaction_id: transactionId ?? null,
      });

      if (error) throw error;
      return data as string; // new order id
    },
    onSuccess: () => {
      toast.success(tr('Order placed successfully!', 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // stock changed
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not place the order.', 'অর্ডার সম্পন্ন করা যায়নি।'));
    },
  });
}
