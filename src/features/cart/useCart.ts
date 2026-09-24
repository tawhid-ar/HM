import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { CartItem } from '../../types/database.types';

export interface CartRow extends CartItem {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_price: number | null;
    images: string[];
    is_active: boolean;
    in_stock: boolean;
    quantity_available: boolean;
  };
}

/**
 * Secure cart reader. Stock validation happens in the database, while the
 * browser receives only availability booleans — never exact inventory.
 */
export function useCart() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['cart', session?.user.id],
    enabled: !!session?.user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_cart');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        quantity: row.quantity,
        created_at: row.created_at,
        product: {
          id: row.product_id,
          name: row.product_name,
          slug: row.product_slug,
          price: row.product_price,
          discount_price: row.product_discount_price,
          images: row.product_images ?? [],
          is_active: row.product_is_active,
          in_stock: row.product_in_stock,
          quantity_available: row.quantity_available,
        },
      })) as CartRow[];
    },
  });
}
