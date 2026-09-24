import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Category } from '../../types/database.types';
import type { CategoryWriteValues } from './useCategories';
import { ModalShell, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

type FormShape = { name: string; slug: string; parent_id?: string; is_active: boolean };

function slugify(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}
function descendantsOf(categoryId: string, categories: Category[]) {
  const blocked = new Set<string>([categoryId]); let changed = true;
  while (changed) { changed = false; for (const category of categories) if (category.parent_id && blocked.has(category.parent_id) && !blocked.has(category.id)) { blocked.add(category.id); changed = true; } }
  return blocked;
}

export function CategoryFormModal({ category, categories, onClose, onSubmit, isSubmitting }: { category?: Category | null; categories: Category[]; onClose: () => void; onSubmit: (values: CategoryWriteValues) => Promise<void>; isSubmitting: boolean }) {
  const { tr } = useLanguage();
  const schema = useMemo(() => z.object({ name: z.string().trim().min(2, tr('Category name must be at least 2 characters', 'ক্যাটাগরির নাম কমপক্ষে ২ অক্ষর হতে হবে')).max(80, tr('Name can be at most 80 characters', 'নাম সর্বোচ্চ ৮০ অক্ষর')), slug: z.string().trim().min(1, tr('Slug is required', 'Slug আবশ্যক')).max(100, tr('Slug can be at most 100 characters', 'Slug সর্বোচ্চ ১০০ অক্ষর')).regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, tr('Use letters, numbers and hyphens in the slug', 'Slug-এ অক্ষর, সংখ্যা ও hyphen ব্যবহার করুন')), parent_id: z.string().optional(), is_active: z.boolean() }), [tr]);
  const isEdit = Boolean(category);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const blockedParents = useMemo(() => category ? descendantsOf(category.id, categories) : new Set<string>(), [category, categories]);
  const parentOptions = categories.filter((item) => !blockedParents.has(item.id));
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormShape>({ resolver: zodResolver(schema), defaultValues: { name: category?.name ?? '', slug: category?.slug ?? '', parent_id: category?.parent_id ?? '', is_active: category?.is_active ?? true } });
  const name = watch('name');
  useEffect(() => { if (!slugTouched) setValue('slug', slugify(name ?? ''), { shouldValidate: false }); }, [name, setValue, slugTouched]);
  const submit = handleSubmit(async (values) => onSubmit({ name: values.name.trim(), slug: values.slug.trim(), parent_id: values.parent_id || null, is_active: values.is_active }));

  return <ModalShell onClose={onClose} maxWidthClass="max-w-lg" labelledBy="category-form-title">
    <h3 id="category-form-title" className="pr-10 font-display text-xl font-bold text-gray-900">{isEdit ? tr('Edit Category', 'ক্যাটাগরি এডিট করুন') : tr('Add New Category', 'নতুন ক্যাটাগরি যোগ করুন')}</h3>
    <p className="mt-1 text-sm text-gray-500">{tr('Enter category information to organize your products.', 'প্রোডাক্ট সাজানোর জন্য ক্যাটাগরির তথ্য দিন।')}</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div><label className="field-label">{tr('Category name', 'ক্যাটাগরির নাম')}</label><input className="input" autoFocus {...register('name')} placeholder={tr('e.g. Grocery', 'যেমন: গ্রোসারি')} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
      <div><div className="flex items-center justify-between gap-3"><label className="field-label">{tr('Slug (URL)', 'স্লাগ (URL)')}</label>{slugTouched && !isEdit && <button type="button" className="text-xs font-medium text-primary-700 hover:underline" onClick={() => { setSlugTouched(false); setValue('slug', slugify(name ?? ''), { shouldValidate: true }); }}>{tr('Auto-generate', 'স্বয়ংক্রিয়ভাবে তৈরি করুন')}</button>}</div><input className="input" {...register('slug', { onChange: () => setSlugTouched(true) })} placeholder="grocery" /><p className="mt-1 text-xs text-gray-400">{tr('The slug is generated from the name automatically; you can edit it if needed.', 'নাম লিখলে slug নিজে তৈরি হবে; প্রয়োজন হলে বদলাতে পারবেন।')}</p>{errors.slug && <p className="field-error">{errors.slug.message}</p>}</div>
      <div><label className="field-label">{tr('Parent category (optional)', 'Parent category (ঐচ্ছিক)')}</label><select className="select" {...register('parent_id')}><option value="">— {tr('No parent', 'কোনো parent নেই')} —</option>{parentOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ` (${tr('inactive', 'নিষ্ক্রিয়')})`}</option>)}</select><p className="mt-1 text-xs text-gray-400">{tr('Leave empty unless this is a sub-category.', 'Sub-category না হলে ফাঁকা রাখুন।')}</p></div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" {...register('is_active')} /><span><span className="block text-sm font-semibold text-gray-800">{tr('Keep category active', 'ক্যাটাগরি সক্রিয় রাখুন')}</span><span className="mt-0.5 block text-xs text-gray-500">{tr('Inactive categories are hidden from customer-side category filters.', 'নিষ্ক্রিয় করলে customer-side category filter-এ এটি দেখাবে না।')}</span></span></label>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>{tr('Cancel', 'বাতিল')}</button><button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{isSubmitting ? tr('Saving...', 'সেভ হচ্ছে...') : isEdit ? tr('Update Category', 'আপডেট করুন') : tr('Add Category', 'ক্যাটাগরি যোগ করুন')}</button></div>
    </form>
  </ModalShell>;
}
