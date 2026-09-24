import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database.types';

interface UseStockViewOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  lowStockOnly?: boolean;
}

const LOW_STOCK_THRESHOLD = 5;
type StaffProductsPage = { products: Product[]; total: number };

/** Exact stock is available only through the staff role-checked RPC. */
export function useStockView({ page = 0, pageSize = 20, search, lowStockOnly }: UseStockViewOptions = {}) {
  return useQuery({
    queryKey: ['moderator-stock', { page, pageSize, search, lowStockOnly }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('staff_products_page', {
        p_offset: page * pageSize,
        p_limit: pageSize,
        p_search: search?.trim() || null,
        p_category_id: null,
        p_low_stock_max: lowStockOnly ? LOW_STOCK_THRESHOLD : null,
      });
      if (error) throw error;
      const result = data as StaffProductsPage | null;
      const products = [...(result?.products ?? [])].sort((a, b) => a.stock_quantity - b.stock_quantity);
      return { products, total: Number(result?.total ?? 0) };
    },
    placeholderData: (prev) => prev,
  });
}

export { LOW_STOCK_THRESHOLD };
