import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ProductColor } from '../../types/database.types';

export interface ProductFormValues {
  name: string;
  slug: string;
  description?: string;
  price: number;
  discount_price?: number | null;
  category_id: string;
  supplier_id: string;
  sku?: string | null;
  stock_quantity: number;
  images: string[];
  colors: ProductColor[];
  is_active?: boolean;
}

function invalidateProductLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  void queryClient.invalidateQueries({ queryKey: ['product'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  void queryClient.invalidateQueries({ queryKey: ['supplier-stock'] });
}

async function saveProduct(id: string | null, values: ProductFormValues) {
  const payload = {
    ...values,
    description: values.description ?? '',
    discount_price: values.discount_price ?? null,
    sku: values.sku ?? null,
    is_active: values.is_active ?? true,
  } as unknown as Record<string, unknown>;
  const { data, error } = await supabase.rpc('save_product_with_supplier', {
    p_product_id: id,
    p_payload: payload,
  });
  if (error) throw error;
  return data;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: (values: ProductFormValues) => saveProduct(null, values),
    onSuccess: () => {
      toast.success(tr('Product added', 'প্রোডাক্ট যোগ হয়েছে'));
      invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not add product', 'প্রোডাক্ট যোগ করা যায়নি')),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) => saveProduct(id, values),
    onSuccess: () => {
      toast.success(tr('Product updated', 'প্রোডাক্ট আপডেট হয়েছে'));
      invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not update', 'আপডেট করা যায়নি')),
  });
}

/** Soft delete — historical order items keep their product reference. */
export function useToggleProductActive() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? tr('Product activated', 'প্রোডাক্ট সক্রিয় করা হয়েছে') : tr('Product deactivated', 'প্রোডাক্ট নিষ্ক্রিয় করা হয়েছে'));
      invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not make the change', 'পরিবর্তন করা যায়নি')),
  });
}

/** Stock increases must be attributed to a supplier; reductions do not need one. */
export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, newQuantity, supplierId }: { id: string; newQuantity: number; supplierId?: string | null }) => {
      if (newQuantity < 0) throw new Error(tr('Stock cannot be negative', 'স্টক ঋণাত্মক হতে পারবে না'));
      const { error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: id,
        p_new_quantity: newQuantity,
        p_supplier_id: supplierId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Stock updated', 'স্টক আপডেট হয়েছে'));
      invalidateProductLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not update stock', 'স্টক আপডেট করা যায়নি')),
  });
}
