import { useEffect, useMemo, useState } from 'react';
import { ModalShell, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCategories } from './useCategories';
import type { Supplier } from '../../types/database.types';
import type { SupplierWriteValues } from './useSuppliers';

export function SupplierFormModal({ supplier, onClose, onSubmit, isSubmitting }: {
  supplier?: Supplier | null;
  onClose: () => void;
  onSubmit: (values: SupplierWriteValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { tr } = useLanguage();
  const { data: categories = [] } = useCategories();
  const initialSub = categories.find((c) => c.id === supplier?.subcategory_id);
  const [form, setForm] = useState({
    institution_name: supplier?.institution_name ?? '', address: supplier?.address ?? '', phone: supplier?.phone ?? '',
    contact_person_name: supplier?.contact_person_name ?? '', contact_person_role: supplier?.contact_person_role ?? '',
    category_id: supplier?.category_id ?? initialSub?.parent_id ?? '', subcategory_id: supplier?.subcategory_id ?? '',
    note: supplier?.note ?? '', is_active: supplier?.is_active ?? true,
  });
  const roots = useMemo(() => categories.filter((c) => !c.parent_id && c.is_active), [categories]);
  const children = useMemo(() => categories.filter((c) => c.parent_id === form.category_id && c.is_active), [categories, form.category_id]);

  useEffect(() => {
    if (form.subcategory_id && !children.some((c) => c.id === form.subcategory_id)) setForm((x) => ({ ...x, subcategory_id: '' }));
  }, [form.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof typeof form, value: string | boolean) => setForm((x) => ({ ...x, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institution_name.trim() || !form.address.trim() || !form.phone.trim() || !form.contact_person_name.trim() || !form.contact_person_role.trim() || !form.category_id || !form.subcategory_id || form.note.trim().length < 3) return;
    await onSubmit({ ...form, institution_name: form.institution_name.trim(), address: form.address.trim(), phone: form.phone.trim(), contact_person_name: form.contact_person_name.trim(), contact_person_role: form.contact_person_role.trim(), note: form.note.trim() });
  };

  return <ModalShell onClose={onClose} maxWidthClass="max-w-2xl">
    <h3 className="mb-5 pr-10 font-display text-lg font-bold">{supplier ? tr('Edit Supplier', 'সাপ্লায়ার এডিট') : tr('Add Supplier', 'সাপ্লায়ার যোগ করুন')}</h3>
    <form className="space-y-4" onSubmit={submit}>
      <div><label className="field-label">{tr('Institution name', 'প্রতিষ্ঠানের নাম')} *</label><input required className="input" value={form.institution_name} onChange={(e) => set('institution_name', e.target.value)} /></div>
      <div><label className="field-label">{tr('Address', 'ঠিকানা')} *</label><textarea required className="textarea" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="field-label">{tr('Phone', 'ফোন')} *</label><input required className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div><div><label className="field-label">{tr('Contact person', 'যোগাযোগ ব্যক্তির নাম')} *</label><input required className="input" value={form.contact_person_name} onChange={(e) => set('contact_person_name', e.target.value)} /></div></div>
      <div><label className="field-label">{tr('Contact person role', 'যোগাযোগ ব্যক্তির পদবি/রোল')} *</label><input required className="input" value={form.contact_person_role} onChange={(e) => set('contact_person_role', e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="field-label">{tr('Category', 'ক্যাটাগরি')} *</label><select required className="select" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">-- {tr('Select', 'নির্বাচন')} --</option>{roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="field-label">{tr('Sub-category', 'সাব-ক্যাটাগরি')} *</label><select required className="select" disabled={!form.category_id} value={form.subcategory_id} onChange={(e) => set('subcategory_id', e.target.value)}><option value="">-- {tr('Select', 'নির্বাচন')} --</option>{children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
      <div><label className="field-label">{tr('Note', 'নোট')} *</label><textarea required minLength={3} className="textarea" rows={3} value={form.note} onChange={(e) => set('note', e.target.value)} /><p className="mt-1 text-xs text-gray-400">{tr('Mandatory supplier notes.', 'সাপ্লায়ার সম্পর্কে নোট আবশ্যক।')}</p></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />{tr('Active supplier', 'সক্রিয় সাপ্লায়ার')}</label>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-ghost border" onClick={onClose}>{tr('Cancel', 'বাতিল')}</button><button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting && <Spinner />}{tr('Save', 'সেভ')}</button></div>
    </form>
  </ModalShell>;
}
