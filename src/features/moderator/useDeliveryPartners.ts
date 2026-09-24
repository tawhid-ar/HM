import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DeliveryPartner } from '../../types/database.types';

/** Active partner directory, for the "hand over to" dropdown on a confirmed order. */
export function useDeliveryPartners() {
  return useQuery({
    queryKey: ['delivery-partners', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DeliveryPartner[];
    },
  });
}

/**
 * The only path an order can take from 'confirmed' -> 'out_for_delivery'.
 * Calls assign_delivery_partner (migration 0005), which re-checks server-side
 * that the order is actually 'confirmed' and the partner is active — this
 * mutation's job is just to send the request and refresh the queue/detail views.
 */
export function useAssignDeliveryPartner() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({
      orderId,
      deliveryPartnerId,
      note,
    }: {
      orderId: string;
      deliveryPartnerId: string;
      note?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('assign_delivery_partner', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId,
        p_changed_by: profile.id,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(tr('Order handed over to delivery partner', 'ডেলিভারি পার্টনারকে হস্তান্তর করা হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['moderator-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', variables.orderId] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not hand over the order', 'হস্তান্তর করা যায়নি')),
  });
}
