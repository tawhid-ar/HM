import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface DashboardStats {
  totalUsers: number;
  totalModerators: number;
  totalAdmins: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
}

/**
 * Uses `head: true, count: 'exact'` requests — these ask Postgres for a row
 * count only (no data transferred), which is cheap even as tables grow into
 * the tens of thousands of rows.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [users, mods, admins, products, orders, pending] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'moderator'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        totalUsers: users.count ?? 0,
        totalModerators: mods.count ?? 0,
        totalAdmins: admins.count ?? 0,
        totalProducts: products.count ?? 0,
        totalOrders: orders.count ?? 0,
        pendingOrders: pending.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}
