import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database.types';

interface UseAdminProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

type StaffProductsPage = { products: Product[]; total: number };

/** Staff-only exact inventory reader backed by a role-checked RPC. */
export function useAdminProducts({ page = 0, pageSize = 20, search, categoryId }: UseAdminProductsOptions = {}) {
  return useQuery({
    queryKey: ['admin-products', { page, pageSize, search, categoryId }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('staff_products_page', {
        p_offset: page * pageSize,
        p_limit: pageSize,
        p_search: search?.trim() || null,
        p_category_id: categoryId || null,
        p_low_stock_max: null,
      });
      if (error) throw error;
      const result = data as StaffProductsPage | null;
      return { products: result?.products ?? [], total: Number(result?.total ?? 0) };
    },
    placeholderData: (prev) => prev,
  });
}
