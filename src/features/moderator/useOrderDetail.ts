import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OrderItem, OrderStatus } from '../../types/database.types';

export interface OrderStatusHistoryRow {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  changer?: { full_name: string } | null;
}

/** Only fetched when a queue row is expanded — keeps the list query itself cheap. */
export function useOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ['order-detail', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [itemsRes, historyRes] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', orderId as string),
        supabase
          .from('order_status_history')
          .select('*, changer:profiles!order_status_history_changed_by_fkey(full_name)')
          .eq('order_id', orderId as string)
          .order('created_at', { ascending: true }),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (historyRes.error) throw historyRes.error;
      return {
        items: itemsRes.data as OrderItem[],
        history: historyRes.data as unknown as OrderStatusHistoryRow[],
      };
    },
  });
}

// Server-side validated in `update_order_status` (see migration 0005) — this
// mirrors those rules just to grey-out invalid buttons in the UI. The DB is
// the real enforcement point, not this list.
//
// The dashboard now offers a simplified action flow. New pending orders can
// be confirmed directly; 'processing' remains supported for historical rows.
// Moving a confirmed order to out_for_delivery still requires
// assign_delivery_partner() because a partner must be selected.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  processing: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
  shipped: ['delivered', 'returned'], // deprecated status, only reachable on old rows
};

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ orderId, newStatus, note }: { orderId: string; newStatus: OrderStatus; note?: string }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_changed_by: profile.id,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(tr('Order status updated', 'অর্ডার স্ট্যাটাস আপডেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['moderator-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['return-report'] });
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not update status', 'স্ট্যাটাস আপডেট করা যায়নি')),
  });
}
