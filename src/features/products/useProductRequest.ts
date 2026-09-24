import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function useSubmitProductRequest() {
  const { session } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productName, description }: { productName: string; description: string }) => {
      if (!session?.user) throw new Error(tr('You are not logged in', 'লগইন করা নেই'));
      const { error } = await supabase.from('product_requests').insert({
        user_id: session.user.id,
        product_name: productName,
        description: description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Your request has been sent', 'আপনার অনুরোধ পাঠানো হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['my-product-requests'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not send the request', 'অনুরোধ পাঠানো যায়নি')),
  });
}
