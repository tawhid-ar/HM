import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Supplier, SupplierStockEntry } from '../../types/database.types';

export type SupplierWriteValues = Omit<Supplier, 'id' | 'created_by' | 'created_at' | 'updated_at'>;

export function useSuppliers(includeInactive = true) {
  return useQuery({
    queryKey: ['suppliers', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase.from('suppliers').select('*').order('institution_name');
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export type SupplierStockEntryWithProduct = SupplierStockEntry & { product: { name: string } | null };

export function useSupplierStockEntries() {
  return useQuery({
    queryKey: ['supplier-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_stock_entries')
        .select('*, product:products(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SupplierStockEntryWithProduct[];
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  void queryClient.invalidateQueries({ queryKey: ['supplier-stock'] });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: SupplierWriteValues) => {
      const { data, error } = await supabase.from('suppliers').insert(values).select('*').single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SupplierWriteValues }) => {
      const { data, error } = await supabase.from('suppliers').update(values).eq('id', id).select('*').single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => invalidate(qc),
  });
}
