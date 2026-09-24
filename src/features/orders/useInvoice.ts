import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem } from '../../types/database.types';

export interface InvoiceOrder extends Order {
  delivery_partner?: { name: string; phone: string } | null;
}

/**
 * RLS (`orders_select_own_or_staff`) already scopes this: a plain user only
 * ever gets their own order back, staff can open any order's invoice.
 */
export function useInvoice(orderId: string | null) {
  return useQuery({
    queryKey: ['invoice', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, delivery_partner:delivery_partners(name, phone)')
          .eq('id', orderId as string)
          .single(),
        supabase.from('order_items').select('*').eq('order_id', orderId as string),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return {
        order: orderRes.data as unknown as InvoiceOrder,
        items: itemsRes.data as OrderItem[],
      };
    },
  });
}
