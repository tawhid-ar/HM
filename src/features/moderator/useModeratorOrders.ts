import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Order, OrderStatus } from '../../types/database.types';

export interface OrderRow extends Order {
  customer?: { full_name: string; phone: string | null; email: string | null } | null;
  delivery_partner?: { name: string; phone: string } | null;
}

interface UseModeratorOrdersOptions {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | 'all';
  search?: string; // matches order_number
}

/**
 * Order queue for moderator/admin/super_admin. RLS (`orders_select_own_or_staff`)
 * already restricts a plain 'user' to their own rows, so no role check needed here.
 */
export function useModeratorOrders({ page = 0, pageSize = 20, status = 'all', search }: UseModeratorOrdersOptions = {}) {
  return useQuery({
    queryKey: ['moderator-orders', { page, pageSize, status, search }],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(
          '*, customer:profiles!orders_user_id_fkey(full_name, phone, email), delivery_partner:delivery_partners(name, phone)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (status !== 'all') query = query.eq('status', status);
      if (search) query = query.ilike('order_number', `%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: data as unknown as OrderRow[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
