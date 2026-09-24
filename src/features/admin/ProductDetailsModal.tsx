import { useEffect, useState } from 'react';
import type { Product } from '../../types/database.types';
import { Badge, ModalShell } from '../../components/common/ui';
import { sanitizeRichText } from '../../lib/richText';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProductDetailsModalProps { product: Product; categoryName?: string; onClose: () => void; onEdit?: () => void; }

export function ProductDetailsModal({ product, categoryName, onClose, onEdit }: ProductDetailsModalProps) {
  const { tr, locale } = useLanguage();
  const images = (product.images ?? []).slice(0, 8);
  const [activeImage, setActiveImage] = useState(images[0] ?? '');
  useEffect(() => { setActiveImage(images[0] ?? ''); }, [product.id]);
  const formatDate = (value: string) => { try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value; } };

  return (
    <ModalShell onClose={onClose} maxWidthClass="max-w-3xl" panelClassName="animate-slide-up">
      <div className="pr-10"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-700">{tr('Product details', 'প্রোডাক্টের বিস্তারিত')}</p><h3 className="break-words font-display text-xl font-bold text-gray-900">{product.name}</h3><p className="mt-1 text-xs text-gray-400">/{product.slug}</p></div><Badge tone={product.is_active ? 'green' : 'red'}>{product.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}</Badge></div></div>
      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">{activeImage ? <img src={activeImage} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-gray-400">{tr('No image', 'ছবি নেই')}</div>}</div>
          {images.length > 1 && <div className="mt-3 grid grid-cols-3 gap-2">{images.map((url, index) => <button key={url} type="button" onClick={() => setActiveImage(url)} className={`aspect-square overflow-hidden rounded-xl border-2 bg-gray-50 transition ${activeImage === url ? 'border-primary-500' : 'border-transparent hover:border-gray-200'}`} aria-label={tr(`View image ${index + 1}`, `ছবি ${index + 1} দেখুন`)}><img src={url} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
        </div>
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"><div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-gray-400">{tr('Price', 'দাম')}</p><p className="mt-1 font-semibold text-gray-900">৳{product.price}</p></div>
            <div><p className="text-xs text-gray-400">{tr('Discount price', 'ছাড়ের দাম')}</p><p className="mt-1 font-semibold text-primary-700">{product.discount_price != null ? `৳${product.discount_price}` : '—'}</p></div>
            <div><p className="text-xs text-gray-400">{tr('Stock', 'স্টক')}</p><p className="mt-1 font-semibold text-gray-900">{product.stock_quantity}</p></div>
            <div><p className="text-xs text-gray-400">SKU</p><p className="mt-1 break-all font-medium text-gray-700">{product.sku || '—'}</p></div>
            <div><p className="text-xs text-gray-400">{tr('Category', 'ক্যাটাগরি')}</p><p className="mt-1 font-medium text-gray-700">{categoryName || '—'}</p></div>
            <div><p className="text-xs text-gray-400">{tr('Images', 'ছবি')}</p><p className="mt-1 font-medium text-gray-700">{images.length}/8</p></div>
          </div></div>
          {product.colors?.length > 0 && <div><h4 className="mb-2 text-sm font-semibold text-gray-800">{tr('Colors', 'রঙ')}</h4><div className="flex flex-wrap gap-2">{product.colors.map((color, index) => <span key={`${color.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs"><span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} />{color.name}</span>)}</div></div>}
          <div><h4 className="mb-2 text-sm font-semibold text-gray-800">{tr('Product description', 'প্রোডাক্ট বিবরণ')}</h4>{product.description ? <div className="product-description max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description) }} /> : <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-400">{tr('No description provided.', 'কোনো বিবরণ নেই।')}</div>}</div>
          <div className="grid gap-3 text-xs text-gray-500 sm:grid-cols-2"><div className="rounded-xl border border-gray-100 p-3"><span className="block text-gray-400">{tr('Created', 'তৈরি হয়েছে')}</span><span className="mt-1 block text-gray-700">{formatDate(product.created_at)}</span></div><div className="rounded-xl border border-gray-100 p-3"><span className="block text-gray-400">{tr('Last updated', 'সর্বশেষ আপডেট')}</span><span className="mt-1 block text-gray-700">{formatDate(product.updated_at)}</span></div></div>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end"><button type="button" className="btn-ghost border border-gray-200" onClick={onClose}>{tr('Close', 'বন্ধ করুন')}</button>{onEdit && <button type="button" className="btn-primary" onClick={onEdit}>{tr('Edit Product', 'এডিট করুন')}</button>}</div>
    </ModalShell>
  );
}
