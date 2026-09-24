import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function AboutPage() {
  const { tr } = useLanguage();
  return (
    <div className="page-shell max-w-5xl">
      <article className="overflow-hidden rounded-3xl border border-white bg-white shadow-[0_24px_70px_-38px_rgba(10,63,42,0.35)]">
        <div className="bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 px-5 py-9 text-white sm:px-8 md:px-10 md:py-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-100">Hadia Mart</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{tr('About Us', 'আমাদের সম্পর্কে')}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-50/90 sm:text-base">{tr('A simple, dependable shopping experience built around everyday needs.', 'দৈনন্দিন প্রয়োজনকে কেন্দ্র করে সহজ ও নির্ভরযোগ্য কেনাকাটার অভিজ্ঞতা।')}</p>
        </div>
        <div className="space-y-5 p-5 text-[15px] leading-8 text-gray-700 sm:p-8 sm:text-base md:p-10">
          <p>{tr('Hadia Mart is an online marketplace built for customers in Bangladesh. Our goal is to make everyday shopping easier by presenting useful products with clear information, transparent pricing and a straightforward ordering experience.', 'Hadia Mart বাংলাদেশের গ্রাহকদের জন্য একটি অনলাইন মার্কেটপ্লেস। আমাদের লক্ষ্য হলো দৈনন্দিন প্রয়োজনের পণ্য সহজে খুঁজে পাওয়া, পরিষ্কার তথ্য ও স্বচ্ছ মূল্যের মাধ্যমে সহজে অর্ডার করা।')}</p>
          <p>{tr('We focus on a shopping journey that feels trustworthy from product discovery to checkout, delivery and support. Product quality, accurate listing information and customer confidence are important parts of how we operate.', 'পণ্য খোঁজা থেকে চেকআউট, ডেলিভারি ও সহায়তা—পুরো কেনাকাটার অভিজ্ঞতাকে বিশ্বাসযোগ্য রাখাই আমাদের লক্ষ্য। পণ্যের মান, সঠিক তথ্য এবং গ্রাহকের আস্থা আমাদের কাজের গুরুত্বপূর্ণ অংশ।')}</p>
          <p>{tr('Hadia Mart is designed to grow with its customers. We will continue improving our product range, delivery coverage and digital experience based on real customer needs and feedback.', 'গ্রাহকের প্রয়োজন ও মতামতের সাথে Hadia Mart-ও এগিয়ে যাবে। সময়ের সাথে আমরা পণ্যের পরিসর, ডেলিভারি কভারেজ এবং ডিজিটাল অভিজ্ঞতা আরও উন্নত করব।')}</p>
          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6"><Link to="/contact-us" className="btn-primary btn-sm">{tr('Contact Us', 'যোগাযোগ করুন')}</Link><Link to="/terms-and-conditions" className="btn-outline btn-sm">{tr('Terms & Conditions', 'শর্তাবলী')}</Link></div>
        </div>
      </article>
    </div>
  );
}
