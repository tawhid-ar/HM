import { siteContent } from '../config/siteContent';
import { useLanguage } from '../contexts/LanguageContext';

function Icon({ type }: { type: 'location' | 'phone' | 'email' | 'whatsapp' }) {
  if (type === 'location') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6.75-5.19 6.75-11.25a6.75 6.75 0 10-13.5 0C5.25 15.81 12 21 12 21z"/><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>;
  if (type === 'phone') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.272.526-.734.417-1.173L6.963 3.102A1.125 1.125 0 005.872 2.25H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>;
  if (type === 'email') return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M20.5 3.5A11.7 11.7 0 0012.1.2C5.7.2.5 5.4.5 11.8c0 2 .5 4 1.5 5.7L.4 23.4l6-1.6a11.6 11.6 0 005.7 1.5h.1c6.4 0 11.6-5.2 11.6-11.6 0-3.1-1.2-6-3.3-8.2zm-8.3 17.8h-.1a9.5 9.5 0 01-4.9-1.3l-.3-.2-3.5.9.9-3.4-.2-.4a9.6 9.6 0 1117.8-5.1 9.7 9.7 0 01-9.7 9.5zm5.3-7.2c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.7-.9-2.9-1.6-4-3.6-.3-.5.3-.5.9-1.6.1-.2.1-.4 0-.6-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.1.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z"/></svg>;
}

function ContactCard({ icon, title, value, href }: { icon: 'location' | 'phone' | 'email' | 'whatsapp'; title: string; value: string; href?: string }) {
  const content = (
    <div className="group flex h-full gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-card sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white"><Icon type={icon} /></div>
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">{title}</p><p className="mt-1 break-words text-sm font-semibold leading-6 text-gray-850 sm:text-base">{value}</p></div>
    </div>
  );
  return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{content}</a> : content;
}

export default function ContactPage() {
  const { tr } = useLanguage();
  return (
    <div className="page-shell max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-[0_24px_70px_-38px_rgba(10,63,42,0.35)]">
        <div className="bg-hero-gradient px-5 py-8 text-white sm:px-8 sm:py-10 md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-100">Hadia Mart</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{tr('Contact Us', 'যোগাযোগ করুন')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-primary-50/90 sm:text-base">{tr('Questions about an order, product, delivery, payment or your account? Reach us through any of the channels below.', 'অর্ডার, পণ্য, ডেলিভারি, পেমেন্ট বা অ্যাকাউন্ট নিয়ে প্রশ্ন থাকলে নিচের যেকোনো মাধ্যমে আমাদের সাথে যোগাযোগ করুন।')}</p>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 md:p-8">
          <ContactCard icon="whatsapp" title="WhatsApp" value={siteContent.contact.phone} href={siteContent.contact.whatsapp} />
          <ContactCard icon="phone" title={tr('Phone', 'ফোন')} value={siteContent.contact.phone} href={`tel:${siteContent.contact.phone}`} />
          <ContactCard icon="email" title={tr('Email', 'ইমেইল')} value={siteContent.contact.email} href={`mailto:${siteContent.contact.email}`} />
          <ContactCard icon="location" title={tr('Address', 'ঠিকানা')} value={siteContent.contact.address} />
        </div>

        <div className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 sm:mx-6 sm:mb-6 sm:p-5 md:mx-8 md:mb-8">
          <h2 className="font-bold text-gray-900">{tr('Social channels', 'সোশ্যাল মিডিয়া')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('Follow Hadia Mart for product updates and announcements.', 'পণ্য আপডেট ও ঘোষণার জন্য Hadia Mart-এর সোশ্যাল চ্যানেল অনুসরণ করুন।')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-outline btn-sm" href={siteContent.social.facebook} target="_blank" rel="noreferrer">Facebook</a>
            <a className="btn-outline btn-sm" href={siteContent.social.instagram} target="_blank" rel="noreferrer">Instagram</a>
            <a className="btn-outline btn-sm" href={siteContent.social.tiktok} target="_blank" rel="noreferrer">TikTok</a>
            <a className="btn-outline btn-sm" href={siteContent.social.youtube} target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </div>
      </div>
    </div>
  );
}
