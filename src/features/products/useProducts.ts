import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { StorefrontProduct } from '../../types/database.types';

interface UseProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

/**
 * Public catalogue query. The `storefront_products` view intentionally omits
 * exact stock_quantity; shoppers only receive the safe `in_stock` boolean.
 */
export function useProducts({ page = 0, pageSize = 20, search, categoryId }: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ['products', { page, pageSize, search, categoryId }],
    queryFn: async () => {
      let query = supabase
        .from('storefront_products')
        .select('*', { count: 'exact' })
        .range(page * pageSize, page * pageSize + pageSize - 1)
        .order('created_at', { ascending: false });

      if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`);
      if (categoryId) query = query.eq('category_id', categoryId);

      const { data, error, count } = await query;
      if (error) throw error;
      return { products: data as StorefrontProduct[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
