import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Order } from '../../types/database.types';

export type MyOrderRow = Pick<
  Order,
  | 'id'
  | 'order_number'
  | 'user_id'
  | 'status'
  | 'total_amount'
  | 'shipping_address'
  | 'payment_method'
  | 'payment_status'
  | 'payment_transaction_id'
  | 'referral_code'
  | 'out_for_delivery_at'
  | 'returned_at'
  | 'created_at'
  | 'updated_at'
>;

interface UseMyOrdersOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Customer order history intentionally selects no delivery-partner, handler,
 * or internal processing identifiers. Staff use their separate order queue.
 */
export function useMyOrders({ page = 0, pageSize = 10 }: UseMyOrdersOptions = {}) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['orders', 'mine', session?.user.id, { page, pageSize }],
    enabled: !!session?.user,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('orders')
        .select('id,order_number,user_id,status,total_amount,shipping_address,payment_method,payment_status,payment_transaction_id,referral_code,out_for_delivery_at,returned_at,created_at,updated_at', { count: 'exact' })
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      return { orders: data as unknown as MyOrderRow[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
