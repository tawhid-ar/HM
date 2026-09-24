import { DeliveryAddressesSection } from '../features/profile/DeliveryAddressesSection';
import { useLanguage } from '../contexts/LanguageContext';

export default function AddressesPage() {
  const { tr } = useLanguage();
  return (
    <div className="page-shell-sm">
      <div className="mb-5 sm:mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">{tr('Delivery', 'ডেলিভারি')}</p>
        <h1 className="section-title mt-1">{tr('Saved addresses', 'ঠিকানা')}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">{tr('Add or update your Home and Office delivery addresses here.', 'আপনার বাসা ও অফিসের ডেলিভারি ঠিকানা এখানে যোগ বা পরিবর্তন করুন।')}</p>
      </div>
      <DeliveryAddressesSection standalone />
    </div>
  );
}
