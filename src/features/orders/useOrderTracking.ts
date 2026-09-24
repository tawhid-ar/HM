import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { OrderItem, OrderStatus } from '../../types/database.types';

export interface OrderStatusHistoryRow {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

type SafeTrackingResult = {
  items: OrderItem[];
  history: OrderStatusHistoryRow[];
};

/** Customer-safe tracking RPC strips delivery-partner identity server-side. */
export function useOrderTracking(orderId: string | null) {
  return useQuery({
    queryKey: ['order-tracking', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_order_tracking', { p_order_id: orderId as string });
      if (error) throw error;
      const result = data as SafeTrackingResult | null;
      return { items: result?.items ?? [], history: result?.history ?? [] };
    },
  });
}
