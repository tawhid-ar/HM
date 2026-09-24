import { useState } from 'react';
import { useAdminDeliveryPartners, useCreateDeliveryPartner, useToggleDeliveryPartnerActive } from './useDeliveryPartners';
import { Badge, PageLoader, EmptyState, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DeliveryPartnersPage() {
  const { tr } = useLanguage();
  const { data: partners, isLoading } = useAdminDeliveryPartners();
  const createPartner = useCreateDeliveryPartner();
  const toggleActive = useToggleDeliveryPartnerActive();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    createPartner.mutate({ name, phone }, { onSuccess: () => { setName(''); setPhone(''); setShowAddForm(false); } });
  };

  return (
    <div className="max-w-5xl">
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div className="min-w-0">
          <h1 className="section-title">{tr('Delivery Partners', 'ডেলিভারি পার্টনার')}</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">{tr('Manage the contact directory used when confirmed orders are handed over for delivery. These are not login accounts.', 'কনফার্মড অর্ডার হস্তান্তরের সময় ব্যবহৃত ডেলিভারি পার্টনার কন্টাক্ট ডিরেক্টরি পরিচালনা করুন। এগুলো লগইন অ্যাকাউন্ট নয়।')}</p>
        </div>
        <button type="button" className="btn-primary btn-sm shrink-0 self-start whitespace-nowrap shadow-md" onClick={() => setShowAddForm((value) => !value)}>
          {showAddForm ? tr('Close', 'বন্ধ করুন') : `+ ${tr('Add Partner', 'নতুন পার্টনার')}`}
        </button>
      </div>

      {showAddForm && <form onSubmit={handleAdd} className="dashboard-panel mb-6 flex flex-col gap-2 border-emerald-100 sm:flex-row">
        <input type="text" placeholder={tr('Name', 'নাম')} value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" />
        <input type="tel" placeholder={tr('Phone number', 'ফোন নম্বর')} value={phone} onChange={(e) => setPhone(e.target.value)} className="input sm:w-48" />
        <button type="submit" disabled={createPartner.isPending} className="btn-primary shrink-0">
          {createPartner.isPending && <Spinner className="h-3.5 w-3.5" />}{tr('Add Partner', 'যোগ করুন')}
        </button>
      </form>}

      {isLoading ? <PageLoader /> : !partners || partners.length === 0 ? (
        <EmptyState icon="🚚" title={tr('No delivery partners yet', 'এখনো কোনো ডেলিভারি পার্টনার যোগ করা হয়নি')} />
      ) : (
        <div className="space-y-2">
          {partners.map((partner) => (
            <div key={partner.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="text-sm font-semibold text-gray-900">{partner.name}</div><div className="text-xs text-gray-500">{partner.phone}</div></div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <Badge tone={partner.is_active ? 'green' : 'gray'}>{partner.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge>
                <button onClick={() => toggleActive.mutate({ id: partner.id, isActive: !partner.is_active })} disabled={toggleActive.isPending} className="text-xs font-semibold text-primary-700 hover:underline disabled:opacity-50">
                  {partner.is_active ? tr('Deactivate', 'নিষ্ক্রিয় করুন') : tr('Activate', 'সক্রিয় করুন')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
