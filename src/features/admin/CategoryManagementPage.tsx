import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Category } from '../../types/database.types';
import { Badge, EmptyState, ModalShell, PageLoader, Spinner } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { CategoryFormModal } from './CategoryFormModal';
import { useCategories, useCategoryProductCount, useCreateCategory, useDeleteCategory, useToggleCategoryActive, useUpdateCategory } from './useCategories';

function CategoryDetailsModal({ category, categories, onClose, onEdit }: { category: Category; categories: Category[]; onClose: () => void; onEdit: () => void }) {
  const { tr, locale } = useLanguage();
  const { data: productCount, isLoading } = useCategoryProductCount(category.id);
  const parent = categories.find((item) => item.id === category.parent_id);
  const childCount = categories.filter((item) => item.parent_id === category.id).length;
  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-lg" labelledBy="category-details-title">
      <div className="flex items-start justify-between gap-3 pr-10">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{tr('Category details', 'ক্যাটাগরি ডিটেইলস')}</p><h3 id="category-details-title" className="mt-1 font-display text-xl font-bold text-gray-900">{category.name}</h3></div>
        <Badge tone={category.is_active ? 'green' : 'red'}>{category.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge>
      </div>
      <dl className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3.5 text-sm"><dt className="text-gray-500">{tr('Slug', 'স্লাগ')}</dt><dd className="break-all font-medium text-gray-800">{category.slug}</dd></div>
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3.5 text-sm"><dt className="text-gray-500">{tr('Parent', 'প্যারেন্ট')}</dt><dd className="font-medium text-gray-800">{parent?.name ?? tr('No parent', 'কোনো প্যারেন্ট নেই')}</dd></div>
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3.5 text-sm"><dt className="text-gray-500">{tr('Products', 'প্রোডাক্ট')}</dt><dd className="font-medium text-gray-800">{isLoading ? tr('Counting...', 'গণনা হচ্ছে...') : productCount ?? 0}</dd></div>
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3.5 text-sm"><dt className="text-gray-500">{tr('Sub-categories', 'সাব-ক্যাটাগরি')}</dt><dd className="font-medium text-gray-800">{childCount}</dd></div>
        <div className="grid grid-cols-[110px_1fr] gap-3 p-3.5 text-sm"><dt className="text-gray-500">{tr('Created', 'তৈরি হয়েছে')}</dt><dd className="font-medium text-gray-800">{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(category.created_at))}</dd></div>
      </dl>
      <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={onEdit}>{tr('Edit', 'এডিট করুন')}</button></div>
    </ModalShell>
  );
}

export default function CategoryManagementPage() {
  const { tr } = useLanguage();
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const toggleActive = useToggleCategoryActive();
  const deleteCategory = useDeleteCategory();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [formCategory, setFormCategory] = useState<Category | null | undefined>(undefined);
  const [detailsCategory, setDetailsCategory] = useState<Category | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return categories.filter((category) => {
      const matchesSearch = !term || category.name.toLocaleLowerCase().includes(term) || category.slug.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? category.is_active : !category.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [categories, search, status]);

  const submitCategory = async (values: Parameters<typeof createCategory.mutateAsync>[0]) => {
    try {
      if (formCategory) { await updateCategory.mutateAsync({ id: formCategory.id, values }); toast.success(tr('Category updated', 'ক্যাটাগরি আপডেট হয়েছে')); }
      else { await createCategory.mutateAsync(values); toast.success(tr('Category added', 'নতুন ক্যাটাগরি যোগ হয়েছে')); }
      setFormCategory(undefined);
    } catch (error) { toast.error(error instanceof Error ? error.message : tr('Could not save category', 'ক্যাটাগরি সেভ করা যায়নি')); }
  };

  const handleToggle = async (category: Category) => {
    try { await toggleActive.mutateAsync({ id: category.id, isActive: !category.is_active }); toast.success(category.is_active ? tr('Category deactivated', 'ক্যাটাগরি নিষ্ক্রিয় হয়েছে') : tr('Category activated', 'ক্যাটাগরি সক্রিয় হয়েছে')); }
    catch (error) { toast.error(error instanceof Error ? error.message : tr('Could not change status', 'স্ট্যাটাস পরিবর্তন করা যায়নি')); }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(tr(`Delete “${category.name}”?`, `“${category.name}” ক্যাটাগরিটি মুছে ফেলতে চান?`))) return;
    try { await deleteCategory.mutateAsync(category); if (detailsCategory?.id === category.id) setDetailsCategory(null); toast.success(tr('Category deleted', 'ক্যাটাগরি মুছে ফেলা হয়েছে')); }
    catch (error) { toast.error(error instanceof Error ? error.message : tr('Could not delete category', 'ক্যাটাগরি মুছে ফেলা যায়নি')); }
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;
  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div><h2 className="section-title">{tr('Category Management', 'ক্যাটাগরি ম্যানেজমেন্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('Add, edit, activate, deactivate and organize product categories.', 'ক্যাটাগরি যোগ, এডিট, সক্রিয়/নিষ্ক্রিয় এবং সংগঠিত করুন।')}</p></div>
        <button className="btn-primary btn-sm shrink-0 self-start whitespace-nowrap shadow-md" onClick={() => setFormCategory(null)}>+ {tr('New Category', 'নতুন ক্যাটাগরি')}</button>
      </div>
      <div className="dashboard-panel mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]">
        <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr('Search by name or slug...', 'নাম বা slug দিয়ে খুঁজুন...')} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">{tr('All statuses', 'সব স্ট্যাটাস')}</option><option value="active">{tr('Active only', 'শুধু সক্রিয়')}</option><option value="inactive">{tr('Inactive only', 'শুধু নিষ্ক্রিয়')}</option></select>
      </div>
      {isLoading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState icon="🏷️" title={categories.length === 0 ? tr('No categories yet', 'এখনও কোনো ক্যাটাগরি নেই') : tr('No matching categories', 'ম্যাচিং ক্যাটাগরি পাওয়া যায়নি')} description={categories.length === 0 ? tr('Add your first category to get started.', 'নতুন ক্যাটাগরি যোগ করে শুরু করুন।') : tr('Try changing the search or status filter.', 'Search বা status filter পরিবর্তন করে দেখুন।')} action={categories.length === 0 ? <button className="btn-primary btn-sm" onClick={() => setFormCategory(null)}>{tr('Add Category', 'ক্যাটাগরি যোগ করুন')}</button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((category) => {
            const parent = categories.find((item) => item.id === category.parent_id);
            const children = categories.filter((item) => item.parent_id === category.id).length;
            return <article key={category.id} role="button" tabIndex={0} onClick={() => setDetailsCategory(category)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDetailsCategory(category); } }} className="card cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-primary-100">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-display font-bold text-gray-900">{category.name}</h3><p className="mt-1 truncate text-xs text-gray-400">/{category.slug}</p></div><Badge tone={category.is_active ? 'green' : 'red'}>{category.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></div>
              <div className="mt-4 space-y-1.5 text-sm text-gray-600"><p><span className="text-gray-400">{tr('Parent', 'প্যারেন্ট')}:</span> {parent?.name ?? '—'}</p><p><span className="text-gray-400">{tr('Sub-categories', 'সাব-ক্যাটাগরি')}:</span> {children}</p></div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3" onClick={(event) => event.stopPropagation()}><button className="btn-outline btn-sm" onClick={() => setFormCategory(category)}>{tr('Edit', 'এডিট')}</button><button className="btn-ghost btn-sm border border-gray-200" disabled={toggleActive.isPending} onClick={() => void handleToggle(category)}>{toggleActive.isPending ? <Spinner className="h-3.5 w-3.5" /> : null}{category.is_active ? tr('Deactivate', 'নিষ্ক্রিয় করুন') : tr('Activate', 'সক্রিয় করুন')}</button><button className="btn-ghost btn-sm border border-red-100 text-red-600 hover:bg-red-50" disabled={deleteCategory.isPending} onClick={() => void handleDelete(category)}>{tr('Delete', 'মুছুন')}</button></div>
            </article>;
          })}
        </div>
      )}
      {formCategory !== undefined && <CategoryFormModal category={formCategory} categories={categories} onClose={() => setFormCategory(undefined)} onSubmit={submitCategory} isSubmitting={isSaving} />}
      {detailsCategory && <CategoryDetailsModal category={detailsCategory} categories={categories} onClose={() => setDetailsCategory(null)} onEdit={() => { const target = detailsCategory; setDetailsCategory(null); setFormCategory(target); }} />}
    </div>
  );
}
