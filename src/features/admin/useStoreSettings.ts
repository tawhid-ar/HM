import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { StoreSettings } from '../../types/database.types';

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as StoreSettings;
    },
    staleTime: 30_000,
  });
}

export function useUpdateStoreSettings() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (values: Pick<StoreSettings, 'ticker_enabled' | 'ticker_text_en' | 'ticker_text_bn'>) => {
      const { data, error } = await supabase.from('store_settings').update({ ...values, updated_by: profile?.id ?? null }).eq('id', 1).select('*').single();
      if (error) throw error;
      return data as StoreSettings;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['store-settings'] }),
  });
}
