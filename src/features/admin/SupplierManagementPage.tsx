import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, EmptyState, PageLoader } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Supplier } from '../../types/database.types';
import { useCategories } from './useCategories';
import { SupplierFormModal } from './SupplierFormModal';
import { useCreateSupplier, useSupplierStockEntries, useSuppliers, useUpdateSupplier, type SupplierWriteValues } from './useSuppliers';

export default function SupplierManagementPage() {
  const { tr } = useLanguage();
  const { data: suppliers = [], isLoading } = useSuppliers(true);
  const { data: entries = [] } = useSupplierStockEntries();
  const { data: categories = [] } = useCategories();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const [modal, setModal] = useState<Supplier | null | undefined>(undefined);

  const totals = useMemo(() => {
    const map = new Map<string, { total: number; byProduct: Map<string, number> }>();
    entries.forEach((entry) => {
      const current = map.get(entry.supplier_id) ?? { total: 0, byProduct: new Map<string, number>() };
      current.total += entry.quantity_added;
      current.byProduct.set(entry.product_id, (current.byProduct.get(entry.product_id) ?? 0) + entry.quantity_added);
      map.set(entry.supplier_id, current);
    });
    return map;
  }, [entries]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';
  const productName = (id: string) => entries.find((entry) => entry.product_id === id)?.product?.name ?? id.slice(0, 8);

  const save = async (values: SupplierWriteValues) => {
    try {
      if (modal) await updateSupplier.mutateAsync({ id: modal.id, values }); else await createSupplier.mutateAsync(values);
      toast.success(tr('Supplier saved', 'সাপ্লায়ার সেভ হয়েছে')); setModal(undefined);
    } catch (error) { toast.error(error instanceof Error ? error.message : tr('Could not save supplier', 'সাপ্লায়ার সেভ করা যায়নি')); }
  };

  if (isLoading) return <PageLoader />;
  return <div>
    <div className="dashboard-page-header mb-5 flex items-start justify-between gap-3"><div><h2 className="section-title">{tr('Supplier Management', 'সাপ্লায়ার ম্যানেজমেন্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('Supplier details and product stock received from each supplier.', 'প্রতিটি সাপ্লায়ারের তথ্য ও তাদের কাছ থেকে যোগ হওয়া প্রোডাক্ট স্টক।')}</p></div><button className="btn-primary btn-sm" onClick={() => setModal(null)}>+ {tr('Add Supplier', 'সাপ্লায়ার যোগ')}</button></div>
    {!suppliers.length ? <EmptyState icon="🏭" title={tr('No suppliers yet', 'কোনো সাপ্লায়ার নেই')} /> : <div className="grid gap-4 xl:grid-cols-2">{suppliers.map((supplier) => {
      const stock = totals.get(supplier.id);
      return <div key={supplier.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{supplier.institution_name}</h3><p className="text-xs text-gray-500">{supplier.contact_person_name} · {supplier.contact_person_role}</p></div><Badge tone={supplier.is_active ? 'green' : 'red'}>{supplier.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-gray-400">{tr('Phone', 'ফোন')}:</span> {supplier.phone}</p><p><span className="text-gray-400">{tr('Category', 'ক্যাটাগরি')}:</span> {categoryName(supplier.category_id)} / {categoryName(supplier.subcategory_id)}</p><p className="sm:col-span-2"><span className="text-gray-400">{tr('Address', 'ঠিকানা')}:</span> {supplier.address}</p><p className="sm:col-span-2"><span className="text-gray-400">{tr('Note', 'নোট')}:</span> {supplier.note}</p></div>
        <div className="mt-4 rounded-xl bg-gray-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr('Stock received history', 'যোগ হওয়া স্টক')}</p><p className="mt-1 text-xl font-bold text-primary-700">{stock?.total ?? 0}</p>{stock && stock.byProduct.size > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{Array.from(stock.byProduct.entries()).map(([pid, qty]) => <span key={pid} className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-gray-100">{productName(pid)}: +{qty}</span>)}</div>}</div>
        <div className="mt-4 flex justify-end"><button className="btn-outline btn-sm" onClick={() => setModal(supplier)}>{tr('Edit', 'এডিট')}</button></div>
      </div>;
    })}</div>}
    {modal !== undefined && <SupplierFormModal supplier={modal} onClose={() => setModal(undefined)} onSubmit={save} isSubmitting={createSupplier.isPending || updateSupplier.isPending} />}
  </div>;
}
