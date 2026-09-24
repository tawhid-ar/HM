import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AddressType, UserAddress } from '../../types/database.types';
import { formatAddress, isAddressComplete, type AddressFormValue } from './bangladeshLocations';

export function useDeliveryAddresses() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['delivery-addresses', session?.user.id],
    enabled: !!session?.user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('address_type', { ascending: true });

      if (error) throw error;
      return (data ?? []) as UserAddress[];
    },
  });
}

export interface SaveDeliveryAddressInput {
  addressType: AddressType;
  value: AddressFormValue;
}

export function useSaveDeliveryAddress() {
  const { session } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ addressType, value }: SaveDeliveryAddressInput) => {
      if (!session?.user) throw new Error(tr('You are not logged in', 'লগইন করা নেই'));
      if (!isAddressComplete(value)) {
        throw new Error(tr('Complete Division, District, Thana/Upazila, Area/Union and House/Road details', 'বিভাগ, জেলা, থানা/উপজেলা, এলাকা/ইউনিয়ন এবং বাসা/রোডের ঠিকানা পূরণ করুন'));
      }

      const formattedAddress = formatAddress(value);
      const { data, error } = await supabase
        .from('user_addresses')
        .upsert(
          {
            user_id: session.user.id,
            address_type: addressType,
            address: formattedAddress,
            division_id: value.divisionId,
            division_name: value.divisionName,
            district_id: value.districtId,
            district_name: value.districtName,
            upazila_id: value.upazilaId,
            upazila_name: value.upazilaName,
            area_id: value.areaId,
            area_name: value.areaName,
            address_line: value.addressLine.trim(),
          },
          { onConflict: 'user_id,address_type' }
        )
        .select('*')
        .single();

      if (error) throw error;
      return data as UserAddress;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData<UserAddress[]>(['delivery-addresses', session?.user.id], (current = []) => {
        const next = current.filter((item) => item.address_type !== saved.address_type);
        return [...next, saved].sort((a, b) => a.address_type.localeCompare(b.address_type));
      });
      toast.success(saved.address_type === 'home' ? tr('Home address saved', 'বাসার ঠিকানা সেভ হয়েছে') : tr('Office address saved', 'অফিসের ঠিকানা সেভ হয়েছে'));
    },
    onError: (error: Error) => toast.error(error.message || tr('Could not save address', 'ঠিকানা সেভ করা যায়নি')),
  });
}

export function useDeleteDeliveryAddress() {
  const { session } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressType: AddressType) => {
      if (!session?.user) throw new Error(tr('You are not logged in', 'লগইন করা নেই'));
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('user_id', session.user.id)
        .eq('address_type', addressType);
      if (error) throw error;
      return addressType;
    },
    onSuccess: (addressType) => {
      queryClient.setQueryData<UserAddress[]>(['delivery-addresses', session?.user.id], (current = []) =>
        current.filter((item) => item.address_type !== addressType)
      );
      toast.success(tr('Saved address deleted', 'সেভ করা ঠিকানা মুছে ফেলা হয়েছে'));
    },
    onError: (error: Error) => toast.error(error.message || tr('Could not delete address', 'ঠিকানা মুছতে পারিনি')),
  });
}
