import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types/database.types';
import { useLanguage } from '../../contexts/LanguageContext';

export type CategoryWriteValues = {
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
};

function friendlyCategoryError(error: unknown, tr: (english: string, bangla: string) => string) {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    return new Error(tr('A category with this name or slug already exists', 'এই নাম বা slug দিয়ে ইতিমধ্যে একটি ক্যাটাগরি আছে'));
  }
  return error instanceof Error ? error : new Error(tr('Category operation could not be completed', 'ক্যাটাগরি অপারেশন সম্পন্ন করা যায়নি'));
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCategoryProductCount(categoryId: string | null) {
  return useQuery({
    queryKey: ['category-product-count', categoryId],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      if (!categoryId) return 0;
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  return useMutation({
    mutationFn: async (values: CategoryWriteValues) => {
      const { data, error } = await supabase.from('categories').insert(values).select('*').single();
      if (error) throw friendlyCategoryError(error, tr);
      return data as Category;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryWriteValues }) => {
      const { data, error } = await supabase.from('categories').update(values).eq('id', id).select('*').single();
      if (error) throw friendlyCategoryError(error, tr);
      return data as Category;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['category-product-count', variables.id] });
    },
  });
}

export function useToggleCategoryActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  return useMutation({
    mutationFn: async (category: Category) => {
      const [productsResult, childrenResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('category_id', category.id),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', category.id),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (childrenResult.error) throw childrenResult.error;

      const productCount = productsResult.count ?? 0;
      const childCount = childrenResult.count ?? 0;
      if (productCount > 0) {
        throw new Error(tr(`This category contains ${productCount} product(s). Move them to another category first.`, `এই ক্যাটাগরিতে ${productCount}টি প্রোডাক্ট আছে। আগে প্রোডাক্টগুলো অন্য ক্যাটাগরিতে নিন।`));
      }
      if (childCount > 0) {
        throw new Error(tr(`This category contains ${childCount} sub-category(s). Remove them or choose another parent first.`, `এই ক্যাটাগরির অধীনে ${childCount}টি সাব-ক্যাটাগরি আছে। আগে সেগুলো সরান বা অন্য parent দিন।`));
      }

      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
