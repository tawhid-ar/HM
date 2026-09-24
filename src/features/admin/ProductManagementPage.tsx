import { useEffect, useState } from 'react';
import { useAdminProducts } from './useAdminProducts';
import { useCategories } from './useCategories';
import { useSuppliers } from './useSuppliers';
import { useCreateProduct, useUpdateProduct, useToggleProductActive, useUpdateStock } from './useProductMutations';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import type { Product, Supplier } from '../../types/database.types';
import { Badge, PageLoader, EmptyState } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

function StockQuickEdit({ product, suppliers }: { product: Product; suppliers: Supplier[] }) {
  const [value, setValue] = useState(product.stock_quantity);
  const [supplierId, setSupplierId] = useState(product.supplier_id ?? '');
  const updateStock = useUpdateStock();
  const { tr } = useLanguage();
  const dirty = value !== product.stock_quantity;
  const increasing = value > product.stock_quantity;

  useEffect(() => { setValue(product.stock_quantity); setSupplierId(product.supplier_id ?? ''); }, [product.stock_quantity, product.supplier_id]);

  return (
    <div className="flex min-w-[260px] flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      <input type="number" className="input w-20 py-1.5 text-sm" value={value} min={0} onChange={(e) => setValue(Number(e.target.value))} />
      {dirty && increasing && <select className="select w-36 py-1.5 text-xs" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">{tr('Supplier required', 'সাপ্লায়ার আবশ্যক')}</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.institution_name}</option>)}</select>}
      {dirty && (
        <button className="btn-primary btn-sm" disabled={updateStock.isPending || (increasing && !supplierId)} onClick={() => updateStock.mutate({ id: product.id, newQuantity: value, supplierId: increasing ? supplierId : null })}>
          {tr('Save', 'সেভ')}
        </button>
      )}
    </div>
  );
}

export default function ProductManagementPage() {
  const { tr } = useLanguage();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(undefined);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useAdminProducts({ page, search, categoryId: categoryId || undefined });
  const { data: categories } = useCategories();
  const { data: suppliers = [] } = useSuppliers(false);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const toggleActive = useToggleProductActive();
  const isSaving = createProduct.isPending || updateProduct.isPending;

  const handleFormSubmit = async (values: Parameters<typeof createProduct.mutateAsync>[0]) => {
    if (modalProduct) await updateProduct.mutateAsync({ id: modalProduct.id, values });
    else await createProduct.mutateAsync(values);
    setModalProduct(undefined);
  };

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Product Management', 'প্রোডাক্ট ম্যানেজমেন্ট')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Manage products, stock, pricing and visibility.', 'প্রোডাক্ট, স্টক, মূল্য ও দৃশ্যমানতা পরিচালনা করুন।')}</p>
        </div>
        <button className="btn-primary btn-sm shrink-0 self-start whitespace-nowrap shadow-md" onClick={() => setModalProduct(null)}>
          + {tr('Add Product', 'নতুন প্রোডাক্ট')}
        </button>
      </div>

      <div className="dashboard-panel mb-4 flex flex-col gap-3 sm:flex-row">
        <input className="input flex-1" placeholder={tr('Search by product name...', 'প্রোডাক্ট নাম দিয়ে খুঁজুন...')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <select className="select sm:w-56" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}>
          <option value="">{tr('All Categories', 'সব ক্যাটাগরি')}</option>
          {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>

      {isLoading ? <PageLoader /> : data && data.products.length === 0 ? (
        <EmptyState icon="📦" title={tr('No products found', 'কোনো প্রোডাক্ট নেই')} description={tr('Add a new product to get started.', 'নতুন প্রোডাক্ট যোগ করে শুরু করুন।')} />
      ) : (
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[700px]">
            <thead><tr><th>{tr('Name', 'নাম')}</th><th>{tr('Price', 'দাম')}</th><th>{tr('Stock', 'স্টক')}</th><th>{tr('Status', 'স্ট্যাটাস')}</th><th>{tr('Actions', 'অ্যাকশন')}</th></tr></thead>
            <tbody>
              {data?.products.map((product) => (
                <tr key={product.id} className="cursor-pointer focus-within:bg-primary-50/35" onClick={() => setDetailsProduct(product)}>
                  <td className="font-medium text-gray-800">{product.name}</td>
                  <td>{product.discount_price ? <><span className="mr-1 text-gray-400 line-through">৳{product.price}</span><span className="font-medium text-primary-700">৳{product.discount_price}</span></> : <span className="text-gray-700">৳{product.price}</span>}</td>
                  <td><StockQuickEdit product={product} suppliers={suppliers} /></td>
                  <td><Badge tone={product.is_active ? 'green' : 'red'}>{product.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="flex gap-2">
                      <button className="btn-outline btn-sm" onClick={() => setModalProduct(product)}>{tr('Edit', 'এডিট')}</button>
                      <button className="btn-ghost btn-sm border border-gray-200" disabled={toggleActive.isPending} onClick={() => toggleActive.mutate({ id: product.id, isActive: !product.is_active })}>
                        {product.is_active ? tr('Deactivate', 'নিষ্ক্রিয় করুন') : tr('Activate', 'সক্রিয় করুন')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-2">
        <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের পাতা')}</button>
        <button disabled={isFetching || (data ? data.products.length < 20 : true)} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের পাতা')}</button>
      </div>

      {modalProduct !== undefined && <ProductFormModal product={modalProduct} onClose={() => setModalProduct(undefined)} onSubmit={handleFormSubmit} isSubmitting={isSaving} />}
      {detailsProduct && <ProductDetailsModal product={detailsProduct} categoryName={categories?.find((category) => category.id === detailsProduct.category_id)?.name} onClose={() => setDetailsProduct(null)} onEdit={() => { setDetailsProduct(null); setModalProduct(detailsProduct); }} />}
    </div>
  );
}
