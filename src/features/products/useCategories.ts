import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types/database.types';

/**
 * Deliberately duplicated from features/admin/useCategories rather than
 * imported from there: features/products is part of the public bundle
 * (HomePage, ProductDetailPage) and must never pull in anything from
 * features/admin, or the admin panel code would leak into every visitor's
 * initial bundle instead of staying in its own lazy-loaded chunk.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60_000,
  });
}
