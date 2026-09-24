import { useEffect, useState } from 'react';
import { Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AddressType, UserAddress } from '../../types/database.types';
import { BangladeshAddressFields } from './BangladeshAddressFields';
import { EMPTY_ADDRESS_FORM, isAddressComplete, savedAddressToFormValue, type AddressFormValue } from './bangladeshLocations';
import { useDeleteDeliveryAddress, useDeliveryAddresses, useSaveDeliveryAddress } from './useDeliveryAddresses';

const EMPTY_ADDRESSES: UserAddress[] = [];
const emptyDrafts = (): Record<AddressType, AddressFormValue> => ({ home: { ...EMPTY_ADDRESS_FORM }, office: { ...EMPTY_ADDRESS_FORM } });

export function DeliveryAddressesSection({ standalone = false }: { standalone?: boolean }) {
  const { tr } = useLanguage();
  const { data, isLoading } = useDeliveryAddresses();
  const addresses = data ?? EMPTY_ADDRESSES;
  const saveAddress = useSaveDeliveryAddress();
  const deleteAddress = useDeleteDeliveryAddress();
  const [drafts, setDrafts] = useState<Record<AddressType, AddressFormValue>>(emptyDrafts);

  useEffect(() => {
    const next = emptyDrafts();
    for (const address of addresses) next[address.address_type] = savedAddressToFormValue(address);
    setDrafts(next);
  }, [addresses]);

  const title = (type: AddressType) => type === 'home' ? tr('Home address', 'বাসার ঠিকানা') : tr('Office address', 'অফিসের ঠিকানা');

  if (isLoading) {
    return <div className={`card flex items-center gap-2 p-4 text-sm text-gray-500 sm:p-6 ${standalone ? '' : 'mt-6'}`}><Spinner /> {tr('Loading delivery addresses...', 'ডেলিভারি ঠিকানা লোড হচ্ছে...')}</div>;
  }

  return (
    <div className={`card p-4 sm:p-6 ${standalone ? '' : 'mt-6'}`}>
      <div className="mb-5">
        <h2 className="font-display text-lg font-bold text-gray-900">{tr('Delivery addresses', 'ডেলিভারি ঠিকানা')}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{tr('You can save up to two addresses — Home and Office. Complete Division → District → Thana/Upazila → Area/Union → House/Road.', 'সর্বোচ্চ ২টি ঠিকানা রাখা যাবে — বাসা ও অফিস। বিভাগ → জেলা → থানা/উপজেলা → এলাকা/ইউনিয়ন → বাসা/রোড পূরণ করুন।')}</p>
      </div>

      <div className="flex flex-col gap-5">
        {(['home', 'office'] as AddressType[]).map((addressType) => {
          const saved = addresses.find((item) => item.address_type === addressType);
          const exists = Boolean(saved);
          const isStructured = Boolean(saved?.division_id && saved?.district_id && saved?.upazila_id && saved?.area_id);
          const isSavingThis = saveAddress.isPending && saveAddress.variables?.addressType === addressType;
          const isDeletingThis = deleteAddress.isPending && deleteAddress.variables === addressType;
          const value = drafts[addressType];
          return (
            <section key={addressType} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-primary-50/25 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="font-bold text-gray-850">{title(addressType)}</h3>
                {exists && <span className="badge bg-green-50 text-green-700">{tr('Saved', 'সেভ করা')}</span>}
              </div>
              {exists && !isStructured && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{tr('This is an older free-text address. Select the structured location fields and update it once.', 'এটি পুরনো free-text ঠিকানা। বিভাগ, জেলা, থানা/উপজেলা ও এলাকা/ইউনিয়ন নির্বাচন করে একবার আপডেট করুন।')}</div>}
              <BangladeshAddressFields idPrefix={`profile-${addressType}`} value={value} disabled={saveAddress.isPending || deleteAddress.isPending} onChange={(next) => setDrafts((current) => ({ ...current, [addressType]: next }))} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary btn-sm" disabled={!isAddressComplete(value) || saveAddress.isPending || deleteAddress.isPending} onClick={() => saveAddress.mutate({ addressType, value })}>
                  {isSavingThis && <Spinner className="h-3.5 w-3.5" />}{exists ? tr('Update address', 'আপডেট করুন') : tr('Save address', 'সেভ করুন')}
                </button>
                {exists && <button type="button" className="btn-ghost btn-sm border border-gray-200 bg-white" disabled={saveAddress.isPending || deleteAddress.isPending} onClick={() => deleteAddress.mutate(addressType, { onSuccess: () => setDrafts((current) => ({ ...current, [addressType]: { ...EMPTY_ADDRESS_FORM } })) })}>{isDeletingThis && <Spinner className="h-3.5 w-3.5" />}{tr('Delete', 'মুছুন')}</button>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
