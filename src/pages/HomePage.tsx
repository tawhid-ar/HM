import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../features/products/useProducts';
import { useCategories } from '../features/products/useCategories';
import { EmptyState } from '../components/common/ui';
import { useLanguage } from '../contexts/LanguageContext';

export default function HomePage() {
  const { tr } = useLanguage();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { data, isLoading, isFetching } = useProducts({ page, search, categoryId: categoryId || undefined });
  const { data: categories } = useCategories();

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 20%, white 0, transparent 28%), radial-gradient(circle at 88% 75%, #ffb37a 0, transparent 30%)',
          }}
        />
        <div className="site-container relative py-11 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
              {tr('Simple. Secure. Dependable.', 'সহজ। নিরাপদ। নির্ভরযোগ্য।')}
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              {tr('Everyday shopping, made easier.', 'দৈনন্দিন কেনাকাটা, এখন আরও সহজ।')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-50/90 sm:text-base md:text-lg">
              {tr(
                'Discover useful products, clear prices and a smoother shopping experience — all in one place.',
                'প্রয়োজনীয় পণ্য, স্বচ্ছ মূল্য এবং আরও সহজ কেনাকাটার অভিজ্ঞতা — সব এক জায়গায়।',
              )}
            </p>
          </div>

          <div className="mt-7 grid max-w-3xl gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 shadow-2xl backdrop-blur-md sm:grid-cols-[1fr_220px] sm:p-3">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-3.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30"
                placeholder={tr('Search products...', 'প্রোডাক্ট খুঁজুন...')}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              className="rounded-xl border-0 bg-white px-3.5 py-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-white/30"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(0);
              }}
            >
              <option value="">{tr('All categories', 'সব ক্যাটাগরি')}</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="page-shell">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">
              {tr('Shop', 'শপ')}
            </p>
            <h2 className="section-title mt-1">
              {search || categoryId ? tr('Search results', 'অনুসন্ধানের ফলাফল') : tr('All products', 'সব প্রোডাক্ট')}
            </h2>
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs font-medium text-gray-400">{tr('Updating...', 'আপডেট হচ্ছে...')}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="card p-3 sm:p-4">
                <div className="skeleton mb-3 aspect-square" />
                <div className="skeleton mb-2 h-4 w-3/4" />
                <div className="skeleton h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : data && data.products.length === 0 ? (
          <EmptyState
            icon="🔎"
            title={tr('No products found', 'কোনো প্রোডাক্ট পাওয়া যায়নি')}
            description={tr('Try another keyword or choose a different category.', 'অন্য কিওয়ার্ড দিয়ে খুঁজুন অথবা ক্যাটাগরি পরিবর্তন করুন।')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
            {data?.products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="card-hover group overflow-hidden p-2.5 animate-fade-in sm:p-3"
              >
                <div className="relative mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-primary-50/30 sm:aspect-square">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-xs text-gray-300">{tr('No image', 'ছবি নেই')}</span>
                  )}
                  {product.discount_price != null && product.price > 0 && product.discount_price < product.price && (
                    <span className="badge absolute left-2 top-2 bg-accent-500 text-white shadow-sm">{Math.round((1 - product.discount_price / product.price) * 100)}% {tr('off', 'ছাড়')}</span>
                  )}
                </div>
                <div className="px-1 pb-1">
                  <div className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-5 text-gray-800 transition-colors group-hover:text-primary-700">
                    {product.name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-1.5 text-sm">
                    {product.discount_price ? (
                      <>
                        <span className="text-base font-extrabold text-primary-700">৳{product.discount_price}</span>
                        <span className="text-xs text-gray-400 line-through">৳{product.price}</span>
                      </>
                    ) : (
                      <span className="text-base font-extrabold text-primary-700">৳{product.price}</span>
                    )}
                  </div>
                  <div className={`mt-1.5 text-xs ${product.in_stock ? 'text-gray-400' : 'font-semibold text-red-500'}`}>
                    {product.in_stock ? tr('Available', 'পাওয়া যাচ্ছে') : tr('Out of stock', 'স্টক নেই')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-2 sm:mt-10">
          <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="btn-outline btn-sm">
            {tr('Previous', 'আগের পাতা')}
          </button>
          <button disabled={isFetching || (data ? data.products.length < 20 : true)} onClick={() => setPage((value) => value + 1)} className="btn-outline btn-sm">
            {tr('Next', 'পরের পাতা')}
          </button>
        </div>
      </div>
    </div>
  );
}
