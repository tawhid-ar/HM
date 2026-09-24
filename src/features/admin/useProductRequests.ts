import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ProductRequest, RequestStatus } from '../../types/database.types';

export interface AdminProductRequest extends ProductRequest {
  requester?: { full_name: string; email: string | null; phone: string | null } | null;
}

export function useAdminProductRequests(status: RequestStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['admin-product-requests', status],
    queryFn: async () => {
      let query = supabase
        .from('product_requests')
        .select('*, requester:profiles!product_requests_user_id_fkey(full_name,email,phone)')
        .order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AdminProductRequest[];
    },
  });
}

export function useReviewProductRequest() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('product_requests').update({ status, reviewed_by: profile.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-product-requests'] });
      void qc.invalidateQueries({ queryKey: ['my-product-requests'] });
    },
  });
}
