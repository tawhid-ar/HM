import { useState } from 'react';
import { useStockView, LOW_STOCK_THRESHOLD } from './useStockView';
import { Badge, PageLoader, EmptyState } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

const PAGE_SIZE = 20;

export default function StockViewPage() {
  const { tr } = useLanguage();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, isLoading } = useStockView({ page, pageSize: PAGE_SIZE, search, lowStockOnly });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Stock View', 'স্টক ভিউ')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Read-only stock view. Contact an admin when stock needs to be changed.', 'এখান থেকে শুধু স্টক দেখা যাবে। পরিবর্তনের প্রয়োজন হলে অ্যাডমিনকে জানান।')}</p>
        </div>
      </div>

      <div className="dashboard-panel mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="text" placeholder={tr('Search by product name...', 'প্রোডাক্ট নাম দিয়ে খুঁজুন...')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="input w-full sm:max-w-sm" />
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 select-none">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(0); }} className="rounded accent-primary-600" />
          {tr('Low stock only', 'শুধু কম স্টক')} ({'<='} {LOW_STOCK_THRESHOLD})
        </label>
      </div>

      {isLoading ? <PageLoader /> : data && data.products.length > 0 ? (
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="table-clean min-w-[620px]">
            <thead><tr><th>{tr('Product', 'প্রোডাক্ট')}</th><th>SKU</th><th>{tr('Price', 'দাম')}</th><th>{tr('Stock', 'স্টক')}</th><th>{tr('Status', 'স্ট্যাটাস')}</th></tr></thead>
            <tbody>
              {data.products.map((product) => (
                <tr key={product.id}>
                  <td className="font-medium text-gray-800">{product.name}</td>
                  <td className="font-mono text-xs text-gray-500">{product.sku ?? '—'}</td>
                  <td>৳{product.price}</td>
                  <td><span className={product.stock_quantity <= LOW_STOCK_THRESHOLD ? 'font-semibold text-red-600' : 'text-gray-700'}>{product.stock_quantity}</span></td>
                  <td><Badge tone={product.is_active ? 'green' : 'gray'}>{product.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon="📦" title={tr('No products found', 'কোনো প্রোডাক্ট পাওয়া যায়নি')} />}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">{tr('Previous', 'আগের')}</button>
          <span className="text-xs text-gray-500">{tr('Page', 'পৃষ্ঠা')} {page + 1} / {totalPages}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">{tr('Next', 'পরের')}</button>
        </div>
      )}
    </div>
  );
}
