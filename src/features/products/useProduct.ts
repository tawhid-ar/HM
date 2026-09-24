import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { StorefrontProduct } from '../../types/database.types';

/** Public product detail without exact inventory disclosure. */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storefront_products')
        .select('*')
        .eq('slug', slug as string)
        .single();
      if (error) throw error;
      return data as StorefrontProduct;
    },
  });
}
