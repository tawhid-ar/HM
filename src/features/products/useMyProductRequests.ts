import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ProductRequest } from '../../types/database.types';

export function useMyProductRequests() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-product-requests', session?.user.id],
    enabled: !!session?.user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductRequest[];
    },
  });
}
