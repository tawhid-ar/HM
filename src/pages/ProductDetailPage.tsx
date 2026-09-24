import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../features/products/useProduct';
import { useAddToCart } from '../features/cart/useCartMutations';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PageLoader, EmptyState, Spinner, Badge } from '../components/common/ui';
import { sanitizeRichText } from '../lib/richText';

export default function ProductDetailPage() {
  const { tr } = useLanguage();
  const { slug } = useParams();
  const { data: product, isLoading, error } = useProduct(slug);
  const { session, profile } = useAuth();
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = useMemo(
    () => (product?.images ?? []).filter((url): url is string => Boolean(url)).slice(0, 8),
    [product?.images],
  );

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  if (isLoading) return <PageLoader />;

  if (error || !product) {
    return (
      <EmptyState
        icon="📦"
        title={tr('Product not found', 'প্রোডাক্টটি পাওয়া যায়নি')}
        action={<Link to="/" className="btn-outline btn-sm">{tr('Back to home', 'হোমে ফিরে যান')}</Link>}
      />
    );
  }

  const outOfStock = !product.in_stock;
  const canOrder = session ? profile?.role === 'user' || profile?.role === 'super_admin' : true;
  const activeImage = images[activeImageIndex] ?? '';

  return (
    <div className="page-shell">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-primary-700">{tr('Home', 'হোম')}</Link>
        <span>/</span>
        <span className="truncate text-gray-600">{product.name}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-white bg-white shadow-[0_20px_55px_-30px_rgba(10,63,42,0.35)]">
            {activeImage ? (
              <img src={activeImage} alt={`${product.name} ${activeImageIndex + 1}`} className="h-full w-full object-contain p-2 sm:p-4" />
            ) : (
              <span className="text-sm text-gray-300">{tr('No image', 'ছবি নেই')}</span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((current) => (current - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-xl text-gray-700 shadow-sm backdrop-blur hover:text-primary-700"
                  aria-label={tr('Previous image', 'আগের ছবি')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((current) => (current + 1) % images.length)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-xl text-gray-700 shadow-sm backdrop-blur hover:text-primary-700"
                  aria-label={tr('Next image', 'পরের ছবি')}
                >
                  ›
                </button>
                <span className="absolute bottom-3 right-3 rounded-full bg-gray-900/70 px-2.5 py-1 text-xs font-medium text-white">
                  {activeImageIndex + 1}/{images.length}
                </span>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`aspect-square overflow-hidden rounded-2xl border-2 bg-white transition-all ${
                    activeImageIndex === index
                      ? 'border-primary-600 ring-2 ring-primary-100'
                      : 'border-gray-100 hover:border-primary-300'
                  }`}
                  aria-label={tr(`View product image ${index + 1}`, `প্রোডাক্টের ছবি ${index + 1} দেখুন`)}
                >
                  <img src={url} alt={`${product.name} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:py-3">
          <div className="mb-3 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-700">
            {tr('Product details', 'প্রোডাক্ট বিস্তারিত')}
          </div>
          <h1 className="mb-3 font-display text-2xl font-extrabold leading-tight text-gray-950 sm:text-3xl lg:text-4xl">{product.name}</h1>

          <div className="mb-5 flex flex-wrap items-baseline gap-2">
            {product.discount_price != null && product.price > 0 && product.discount_price < product.price ? (
              <>
                <span className="text-2xl font-extrabold text-primary-700 sm:text-3xl">৳{product.discount_price}</span>
                <span className="text-gray-400 line-through">৳{product.price}</span>
                <Badge tone="orange">{Math.round((1 - product.discount_price / product.price) * 100)}% {tr('off', 'ছাড়')}</Badge>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-primary-700 sm:text-3xl">৳{product.price}</span>
            )}
          </div>

          {product.description ? (
            <div
              className="product-description mb-6 rounded-2xl border border-gray-100 bg-white/80 p-4 text-sm leading-7 text-gray-600 sm:p-5"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description) }}
            />
          ) : (
            <p className="mb-6 text-sm text-gray-500">{tr('No description available.', 'কোনো বিবরণ নেই।')}</p>
          )}

          {product.colors?.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-gray-700">{tr('Available colors', 'উপলব্ধ রঙ')}</p>
              <div className="flex flex-wrap gap-2">{product.colors.slice(0, 8).map((color, index) => <span key={`${color.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs"><span className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex }} />{color.name}</span>)}</div>
            </div>
          )}

          <div className="mb-6">
            {outOfStock ? (
              <Badge tone="red">{tr('Out of stock', 'স্টক নেই')}</Badge>
            ) : (
              <Badge tone="green">{tr('Available', 'পাওয়া যাচ্ছে')}</Badge>
            )}
          </div>

          {!session ? (
            <Link to="/login" className="btn-primary w-full sm:w-auto">{tr('Login to add to cart', 'কার্টে যোগ করতে লগইন করুন')}</Link>
          ) : !canOrder ? (
            <p className="text-sm text-gray-400">{tr('This account cannot place customer orders.', 'এই একাউন্ট দিয়ে অর্ডার করা যাবে না।')}</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white shadow-sm sm:w-auto">
                <button className="px-4 py-2.5 text-gray-600 hover:text-primary-700 disabled:opacity-30" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <span className="min-w-[3rem] px-3 text-center font-semibold">{quantity}</span>
                <button className="px-4 py-2.5 text-gray-600 hover:text-primary-700 disabled:opacity-30" disabled={quantity >= 99} onClick={() => setQuantity((value) => Math.min(99, value + 1))}>+</button>
              </div>
              <button onClick={() => addToCart.mutate({ productId: product.id, quantity })} disabled={outOfStock || addToCart.isPending} className="btn-accent w-full sm:w-auto sm:min-w-[180px]">
                {addToCart.isPending && <Spinner />}
                {addToCart.isPending ? tr('Adding...', 'যোগ হচ্ছে...') : tr('Add to cart', 'কার্টে যোগ করুন')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
