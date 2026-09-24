import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PageLoader, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStoreSettings, useUpdateStoreSettings } from './useStoreSettings';

export default function StoreSettingsPage() {
  const { tr } = useLanguage();
  const { data, isLoading } = useStoreSettings();
  const update = useUpdateStoreSettings();
  const [enabled, setEnabled] = useState(false);
  const [en, setEn] = useState('');
  const [bn, setBn] = useState('');
  useEffect(() => { if (data) { setEnabled(data.ticker_enabled); setEn(data.ticker_text_en); setBn(data.ticker_text_bn); } }, [data]);
  if (isLoading) return <PageLoader />;
  const save = async () => {
    try { await update.mutateAsync({ ticker_enabled: enabled, ticker_text_en: en.trim(), ticker_text_bn: bn.trim() }); toast.success(tr('Store notice updated', 'স্টোর নোটিশ আপডেট হয়েছে')); }
    catch (e) { toast.error(e instanceof Error ? e.message : tr('Could not update settings', 'সেটিংস আপডেট করা যায়নি')); }
  };
  return <div className="max-w-3xl"><div className="mb-5"><h2 className="section-title">{tr('Store Notice / Scrolling Bar', 'স্টোর নোটিশ / স্ক্রলিং বার')}</h2><p className="mt-1 text-sm text-gray-500">{tr('The text appears in a scrolling bar directly below the storefront navigation.', 'এই লেখা স্টোরফ্রন্ট নেভিগেশনের নিচে স্ক্রলিং বার হিসেবে দেখাবে।')}</p></div>
    <div className="card space-y-4 p-5"><label className="flex items-center gap-3"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /><span className="font-medium">{tr('Enable scrolling notice', 'স্ক্রলিং নোটিশ চালু করুন')}</span></label><div><label className="field-label">English text</label><textarea className="textarea" rows={3} maxLength={500} value={en} onChange={(e) => setEn(e.target.value)} /></div><div><label className="field-label">বাংলা লেখা</label><textarea className="textarea" rows={3} maxLength={500} value={bn} onChange={(e) => setBn(e.target.value)} /></div>
      <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3 text-sm text-primary-800"><b>{tr('Preview:', 'প্রিভিউ:')}</b> {en || bn || tr('No text entered', 'কোনো লেখা নেই')}</div><button className="btn-primary" disabled={update.isPending} onClick={() => void save()}>{update.isPending && <Spinner />}{tr('Save notice', 'নোটিশ সেভ করুন')}</button></div>
  </div>;
}
