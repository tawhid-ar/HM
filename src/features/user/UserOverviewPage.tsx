import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const quickLinks = [
  {
    to: '/user/profile',
    title: 'Profile',
    titleBn: 'প্রোফাইল',
    description: 'Update your name, phone and profile photo.',
    descriptionBn: 'আপনার নাম, ফোন ও প্রোফাইল ছবি আপডেট করুন।',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    to: '/user/addresses',
    title: 'Addresses',
    titleBn: 'ঠিকানা',
    description: 'Manage your Home and Office delivery addresses.',
    descriptionBn: 'আপনার বাসা ও অফিসের ডেলিভারি ঠিকানা পরিচালনা করুন।',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6.75-5.19 6.75-11.25a6.75 6.75 0 10-13.5 0C5.25 15.81 12 21 12 21z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    to: '/orders',
    title: 'Orders',
    titleBn: 'অর্ডার',
    description: 'View your order history and invoices.',
    descriptionBn: 'আপনার অর্ডার হিস্ট্রি ও ইনভয়েস দেখুন।',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4.5h6M6.75 3.75h10.5A2.25 2.25 0 0119.5 6v12A2.25 2.25 0 0117.25 20.25H6.75A2.25 2.25 0 014.5 18V6a2.25 2.25 0 012.25-2.25z" />
      </svg>
    ),
  },
  {
    to: '/product-request',
    title: 'Product Request',
    titleBn: 'প্রোডাক্ট রিকোয়েস্ট',
    description: 'Request a product you want to see in the store.',
    descriptionBn: 'স্টোরে যে পণ্যটি চান তার জন্য রিকোয়েস্ট পাঠান।',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75h15A2.25 2.25 0 0121.75 6v12a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 18V6A2.25 2.25 0 014.5 3.75z" />
      </svg>
    ),
  },
];

export default function UserOverviewPage() {
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="dashboard-page-header">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">{tr('My account', 'আমার অ্যাকাউন্ট')}</p>
          <h1 className="section-title mt-1">{tr('Dashboard', 'ড্যাশবোর্ড')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tr(
              `Welcome${profile?.full_name ? `, ${profile.full_name}` : ''}. Manage your account and delivery information from here.`,
              `স্বাগতম${profile?.full_name ? `, ${profile.full_name}` : ''}। এখান থেকে আপনার অ্যাকাউন্ট ও ডেলিভারি তথ্য পরিচালনা করুন।`,
            )}
          </p>
        </div>
        <Link to="/" className="btn-outline btn-sm shrink-0">{tr('Continue shopping', 'কেনাকাটা চালিয়ে যান')}</Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_16px_38px_-28px_rgba(4,77,54,0.45)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_22px_46px_-28px_rgba(4,77,54,0.55)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-100">
              <span className="h-5 w-5">{item.icon}</span>
            </div>
            <h2 className="mt-4 font-display text-base font-extrabold text-slate-950">{tr(item.title, item.titleBn)}</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">{tr(item.description, item.descriptionBn)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
