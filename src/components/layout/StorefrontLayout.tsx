import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../features/cart/useCart';
import { LogoMark } from '../common/ui';
import { AccountHeaderControls } from '../common/AccountHeaderControls';
import { LanguageToggle } from '../common/LanguageToggle';
import { useStoreSettings } from '../../features/admin/useStoreSettings';
import logoFull from '../../assets/logo-full-transparent.png';
import { siteContent } from '../../config/siteContent';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
    isActive
      ? 'bg-primary-50 text-primary-800 shadow-sm'
      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-800'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-50 text-primary-800' : 'text-gray-700 hover:bg-gray-50'
  }`;

const SocialIcon = ({ type }: { type: 'facebook' | 'youtube' | 'instagram' | 'tiktok' }) => {
  if (type === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H8v3h2.6v8h3.1Z" />
      </svg>
    );
  }
  if (type === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
      </svg>
    );
  }
  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M15.4 3c.35 2.18 1.72 3.62 4.1 4.2v3.05a8.1 8.1 0 0 1-4.05-1.34v6.15a5.48 5.48 0 1 1-4.76-5.43v3.12a2.42 2.42 0 1 0 1.62 2.28V3h3.09Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
};

function SocialLink({
  label,
  href,
  type,
}: {
  label: string;
  href: string;
  type: 'facebook' | 'youtube' | 'instagram' | 'tiktok';
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-700/70 bg-primary-900/70 text-primary-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white hover:text-primary-900 hover:shadow-lg"
    >
      <SocialIcon type={type} />
    </a>
  );
}

/** Public/customer shell. Product names and descriptions are database content and are intentionally never translated. */
export default function StorefrontLayout() {
  const { session, profile } = useAuth();
  const { tr, language } = useLanguage();
  const { data: storeSettings } = useStoreSettings();
  const { data: cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const cartCount = cart?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const canUseCustomerArea = profile?.role === 'user' || profile?.role === 'super_admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#f7faf8]">
      <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/90 shadow-[0_8px_30px_rgba(10,63,42,0.05)] backdrop-blur-xl">
        <div className="site-container flex min-h-[68px] items-center justify-between gap-3 py-2">
          <Link to="/" className="group flex min-w-0 shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <LogoMark className="h-10 w-10 transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11" />
            <span className="hidden min-[380px]:inline font-display text-lg font-extrabold tracking-tight sm:text-xl">
              <span className="text-primary-800">Hadia</span> <span className="text-accent-500">Mart</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>{tr('Products', 'প্রোডাক্ট')}</NavLink>
            {canUseCustomerArea && (
              <>
                <NavLink to="/orders" className={navLinkClass}>{tr('Orders', 'অর্ডার')}</NavLink>
                <NavLink to="/product-request" className={navLinkClass}>{tr('Product Request', 'প্রোডাক্ট রিকোয়েস্ট')}</NavLink>
              </>
            )}
            {session && profile && (
              <NavLink to="/dashboard" className={navLinkClass}>{tr('Dashboard', 'ড্যাশবোর্ড')}</NavLink>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block"><LanguageToggle compact /></div>

            {canUseCustomerArea && (
              <Link
                to="/cart"
                aria-label={tr('Cart', 'কার্ট')}
                className="icon-btn relative border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm"
                onClick={() => setMenuOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.44-7.153.083-.409-.22-.797-.635-.797H5.106M7.5 14.25L5.106 5.106M7.5 14.25L5.25 18.75m12-4.5v.008h.008v-.008h-.008zM12 18.75v.008h.008v-.008H12zM17.25 18.75v.008h.008v-.008h-.008z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {session ? (
              <AccountHeaderControls onNavigate={() => setMenuOpen(false)} />
            ) : (
              <div className="hidden lg:block">
                <Link to="/login" className="btn-primary btn-sm">{tr('Login', 'লগইন')}</Link>
              </div>
            )}

            <button
              className="icon-btn lg:hidden"
              aria-label={tr('Menu', 'মেনু')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden border-t border-gray-100 bg-white px-3 py-3 shadow-xl animate-slide-up sm:px-6">
            <div className="mx-auto max-w-xl space-y-1">
              <div className="mb-3 sm:hidden"><LanguageToggle /></div>
              <NavLink to="/" end className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{tr('Products', 'প্রোডাক্ট')}</NavLink>
              {canUseCustomerArea && (
                <>
                  <NavLink to="/cart" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{tr('Cart', 'কার্ট')} {cartCount > 0 && <span className="text-accent-600">({cartCount})</span>}</NavLink>
                  <NavLink to="/orders" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{tr('Order History', 'অর্ডার হিস্ট্রি')}</NavLink>
                  <NavLink to="/product-request" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{tr('Product Request', 'প্রোডাক্ট রিকোয়েস্ট')}</NavLink>
                </>
              )}
              {session && profile && (
                <NavLink to="/dashboard" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>{tr('Dashboard', 'ড্যাশবোর্ড')}</NavLink>
              )}
              {!session && (
                <div className="pt-2">
                  <Link to="/login" className="btn-primary btn-sm w-full" onClick={() => setMenuOpen(false)}>{tr('Login', 'লগইন')}</Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
      {storeSettings?.ticker_enabled && Boolean((language === 'bn' ? storeSettings.ticker_text_bn : storeSettings.ticker_text_en).trim()) && (
        <div className="store-ticker border-b border-primary-800 bg-primary-700 text-white" aria-label={tr('Store notice', 'স্টোর নোটিশ')}>
          <div className="store-ticker-track py-2 text-sm font-semibold">
            <span>{language === 'bn' ? storeSettings.ticker_text_bn : storeSettings.ticker_text_en}</span>
            <span aria-hidden="true">{language === 'bn' ? storeSettings.ticker_text_bn : storeSettings.ticker_text_en}</span>
          </div>
        </div>
      )}

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-14 overflow-hidden bg-primary-950 text-primary-100 sm:mt-20">
        <div className="site-container grid gap-10 py-10 sm:py-14 md:grid-cols-2 lg:grid-cols-[1.35fr_0.75fr_0.75fr] lg:gap-14">
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <img src={logoFull} alt={siteContent.brand} className="h-14 w-14 object-contain" />
              <span className="font-display text-xl font-extrabold text-white sm:text-2xl">{siteContent.brand}</span>
            </div>
            <p className="max-w-lg text-sm leading-7 text-primary-100/80 sm:text-base">
              {tr(siteContent.footerDescription.en, siteContent.footerDescription.bn)}
            </p>


            <div className="mt-6 flex items-center gap-3">
              <SocialLink label="Facebook" href={siteContent.social.facebook} type="facebook" />
              <SocialLink label="YouTube" href={siteContent.social.youtube} type="youtube" />
              <SocialLink label="Instagram" href={siteContent.social.instagram} type="instagram" />
              <SocialLink label="TikTok" href={siteContent.social.tiktok} type="tiktok" />
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-base font-bold text-white">{tr('Information', 'তথ্য')}</h4>
            <ul className="space-y-3 text-sm text-primary-100/80">
              <li><Link to="/about-us" className="transition-colors hover:text-white">{tr('About Us', 'আমাদের সম্পর্কে')}</Link></li>
              <li><Link to="/contact-us" className="transition-colors hover:text-white">{tr('Contact Us', 'যোগাযোগ')}</Link></li>
              <li><Link to="/terms-and-conditions" className="transition-colors hover:text-white">{tr('Terms & Conditions', 'শর্তাবলী')}</Link></li>
              <li><Link to="/privacy-policy" className="transition-colors hover:text-white">{tr('Privacy Policy', 'গোপনীয়তা নীতি')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-base font-bold text-white">{tr('Shopping', 'কেনাকাটা')}</h4>
            <ul className="space-y-3 text-sm text-primary-100/80">
              <li><Link to="/" className="transition-colors hover:text-white">{tr('All Products', 'সব প্রোডাক্ট')}</Link></li>
              <li><Link to="/product-request" className="transition-colors hover:text-white">{tr('Product Request', 'প্রোডাক্ট রিকোয়েস্ট')}</Link></li>
              <li><Link to="/orders" className="transition-colors hover:text-white">{tr('Order Tracking', 'অর্ডার ট্র্যাকিং')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-900/90 px-4 py-4 text-center text-xs text-primary-200/65">
          © {new Date().getFullYear()} {siteContent.brand}. {tr('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}
        </div>
      </footer>
    </div>
  );
}
