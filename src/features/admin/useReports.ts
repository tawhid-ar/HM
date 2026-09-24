import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem } from '../../types/database.types';

export interface ReturnReportRow extends Order {
  customer?: { full_name: string; email: string | null; phone: string | null } | null;
  processor?: { full_name: string } | null;
  order_items?: OrderItem[];
}

export function useReturnReport(from: string, to: string) {
  return useQuery({
    queryKey: ['return-report', from, to],
    enabled: Boolean(from && to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:profiles!orders_user_id_fkey(full_name,email,phone), processor:profiles!orders_return_processed_by_fkey(full_name), order_items(*)')
        .eq('status', 'returned')
        .gte('returned_at', `${from}T00:00:00`)
        .lt('returned_at', `${to}T23:59:59.999`)
        .order('returned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ReturnReportRow[];
    },
  });
}

export interface SalesReportRow {
  product_id: string;
  product_name: string;
  gross_sold_quantity: number;
  returned_quantity: number;
  net_sold_quantity: number;
  gross_sales: number;
  returned_value: number;
  net_sales: number;
}

export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: ['sales-report', from, to],
    enabled: Boolean(from && to),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sales_report', { p_from: from, p_to: to });
      if (error) throw error;
      return (data ?? []) as unknown as SalesReportRow[];
    },
  });
}
