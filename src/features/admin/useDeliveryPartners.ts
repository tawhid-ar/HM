import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DeliveryPartner } from '../../types/database.types';

/** Full directory (active + inactive) — admin needs to see and re-activate deactivated couriers too. */
export function useAdminDeliveryPartners() {
  return useQuery({
    queryKey: ['admin-delivery-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DeliveryPartner[];
    },
  });
}

export function useCreateDeliveryPartner() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { error } = await supabase.from('delivery_partners').insert({
        name: name.trim(),
        phone: phone.trim(),
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Delivery partner added', 'ডেলিভারি পার্টনার যোগ হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not add delivery partner', 'যোগ করা যায়নি')),
  });
}

export function useToggleDeliveryPartnerActive() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('delivery_partners').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? tr('Delivery partner activated', 'সক্রিয় করা হয়েছে') : tr('Delivery partner deactivated', 'নিষ্ক্রিয় করা হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not make the change', 'পরিবর্তন করা যায়নি')),
  });
}
