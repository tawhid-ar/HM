import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

/** Add-to-cart is validated atomically against live stock server-side. */
export function useAddToCart() {
  const { session } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!session?.user) throw new Error(tr('Please log in before adding items to the cart', 'কার্টে যোগ করতে আগে লগইন করুন'));
      const { error } = await supabase.rpc('add_to_cart_secure', {
        p_product_id: productId,
        p_quantity: quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Added to cart', 'কার্টে যোগ করা হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not add to cart', 'কার্টে যোগ করা যায়নি')),
  });
}

export function useUpdateCartQuantity() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      const { error } = await supabase.rpc('set_cart_quantity_secure', {
        p_cart_item_id: cartItemId,
        p_quantity: quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err: Error) => toast.error(err.message || tr('Could not update quantity', 'পরিমাণ আপডেট করা যায়নি')),
  });
}

export function useRemoveFromCart() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cartItemId: string) => {
      const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Removed from cart', 'কার্ট থেকে সরানো হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not remove item', 'সরানো যায়নি')),
  });
}
