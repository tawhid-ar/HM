import { useLanguage } from '../contexts/LanguageContext';
import { siteContent } from '../config/siteContent';

export default function PrivacyPage() {
  const { tr } = useLanguage();
  const sections = [
    [tr('Information we collect', 'আমরা যে তথ্য সংগ্রহ করতে পারি'), tr('We may collect information you provide directly, such as your name, phone number, email, account details, delivery addresses, order information and customer-support messages. We may also receive limited transaction status from payment providers and technical data such as browser, device, IP address and usage information.', 'আপনার দেওয়া নাম, ফোন নম্বর, ইমেইল, অ্যাকাউন্ট তথ্য, ডেলিভারি ঠিকানা, অর্ডার তথ্য ও সহায়তার বার্তা সংগ্রহ করা হতে পারে। পেমেন্ট প্রদানকারীর কাছ থেকে সীমিত লেনদেন-স্ট্যাটাস এবং ব্রাউজার, ডিভাইস, IP ও ব্যবহারসংক্রান্ত প্রযুক্তিগত তথ্যও পাওয়া যেতে পারে।')],
    [tr('How we use information', 'তথ্য ব্যবহারের উদ্দেশ্য'), tr('Information may be used to operate accounts, process and deliver orders, provide support, verify payments, prevent fraud, improve the website and communicate important service updates.', 'অ্যাকাউন্ট পরিচালনা, অর্ডার প্রক্রিয়াকরণ ও ডেলিভারি, গ্রাহক সহায়তা, পেমেন্ট যাচাই, প্রতারণা প্রতিরোধ, ওয়েবসাইট উন্নয়ন এবং গুরুত্বপূর্ণ সেবা-সংক্রান্ত যোগাযোগের জন্য তথ্য ব্যবহার করা হতে পারে।')],
    [tr('Sharing and service providers', 'তথ্য শেয়ারিং ও সেবা প্রদানকারী'), tr('We may share only the information reasonably necessary with delivery partners, payment processors, hosting or support providers, and competent authorities when required by law. We do not intend to sell or rent personal information to unauthorized third parties.', 'সেবা দিতে প্রয়োজনীয় সীমিত তথ্য ডেলিভারি পার্টনার, পেমেন্ট প্রসেসর, হোস্টিং/সহায়তা প্রদানকারী এবং আইনগতভাবে প্রয়োজন হলে সংশ্লিষ্ট কর্তৃপক্ষের সাথে শেয়ার করা হতে পারে। অননুমোদিত তৃতীয় পক্ষের কাছে ব্যক্তিগত তথ্য বিক্রি বা ভাড়া দেওয়াই আমাদের উদ্দেশ্য নয়।')],
    [tr('Saved addresses and order records', 'সেভ করা ঠিকানা ও অর্ডার রেকর্ড'), tr('If you save Home or Office addresses, they are associated with your account so future checkout is easier. Each order may also keep a delivery-address snapshot so historical order records remain accurate even if you later edit a saved address.', 'Home বা Office ঠিকানা সেভ করলে ভবিষ্যৎ চেকআউট সহজ করতে তা আপনার অ্যাকাউন্টের সাথে রাখা হয়। পরবর্তীতে সেভ করা ঠিকানা পরিবর্তন করলেও পুরনো অর্ডারের তথ্য সঠিক রাখতে প্রতিটি অর্ডারে ব্যবহৃত ডেলিভারি ঠিকানার আলাদা রেকর্ড থাকতে পারে।')],
    [tr('Cookies and local storage', 'কুকি ও লোকাল স্টোরেজ'), tr('The website may use cookies or browser storage for essential sessions, preferences such as language, performance and security. Disabling browser storage may affect some features.', 'প্রয়োজনীয় সেশন, ভাষার মতো পছন্দ, পারফরম্যান্স ও নিরাপত্তার জন্য ওয়েবসাইট কুকি বা ব্রাউজার স্টোরেজ ব্যবহার করতে পারে। এগুলো বন্ধ করলে কিছু ফিচার প্রভাবিত হতে পারে।')],
    [tr('Data security and retention', 'তথ্য নিরাপত্তা ও সংরক্ষণ'), tr('We use reasonable technical and organizational safeguards and retain information only as long as needed for service, security, transaction or legal purposes. No internet system can guarantee absolute security.', 'তথ্য সুরক্ষায় যুক্তিসঙ্গত প্রযুক্তিগত ও পরিচালনাগত ব্যবস্থা নেওয়া হয় এবং সেবা, নিরাপত্তা, লেনদেন বা আইনগত প্রয়োজন অনুযায়ী তথ্য সংরক্ষণ করা হয়। কোনো ইন্টারনেট ব্যবস্থা শতভাগ নিরাপত্তার নিশ্চয়তা দিতে পারে না।')],
    [tr('Your choices', 'আপনার অধিকার ও পছন্দ'), tr('Subject to applicable law and legitimate transaction requirements, you may request access to or correction of your account information and may contact us regarding deletion or privacy questions.', 'প্রযোজ্য আইন ও বৈধ লেনদেন-সংক্রান্ত প্রয়োজন সাপেক্ষে আপনি আপনার অ্যাকাউন্ট তথ্য দেখা বা সংশোধনের অনুরোধ করতে পারেন এবং তথ্য মুছে ফেলা বা গোপনীয়তা বিষয়ে আমাদের সাথে যোগাযোগ করতে পারেন।')],
    [tr('Policy updates', 'নীতি পরিবর্তন'), tr('We may update this policy as our services, technology or legal obligations evolve. The latest version will be posted on this page with an updated date.', 'সেবা, প্রযুক্তি বা আইনগত প্রয়োজন পরিবর্তিত হলে এই নীতি হালনাগাদ করা হতে পারে। সর্বশেষ সংস্করণ আপডেট তারিখসহ এই পেজে প্রকাশ করা হবে।')],
  ] as const;

  return (
    <div className="page-shell max-w-5xl">
      <article className="rounded-3xl border border-white bg-white p-5 shadow-[0_24px_70px_-38px_rgba(10,63,42,0.35)] sm:p-8 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Hadia Mart</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-gray-950 sm:text-4xl">{tr('Privacy Policy', 'গোপনীয়তা নীতি')}</h1>
        <p className="mt-2 text-sm text-gray-500">{tr('Last updated: 20 September 2026', 'সর্বশেষ হালনাগাদ: ২০ সেপ্টেম্বর ২০২৬')}</p>
        <p className="mt-7 leading-8 text-gray-700">{tr('Hadia Mart values your privacy. This policy explains the types of information we may handle, why we use it, when limited sharing may be necessary and how you can contact us about privacy questions.', 'Hadia Mart আপনার গোপনীয়তাকে গুরুত্ব দেয়। এই নীতিতে কোন তথ্য ব্যবহৃত হতে পারে, কেন ব্যবহার করা হয়, কখন সীমিতভাবে শেয়ার করা প্রয়োজন হতে পারে এবং গোপনীয়তা বিষয়ে কীভাবে যোগাযোগ করবেন তা ব্যাখ্যা করা হয়েছে।')}</p>
        <div className="mt-8 space-y-8">{sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-bold text-gray-900">{title}</h2><p className="mt-2 leading-8 text-gray-700">{body}</p></section>)}</div>
        <div className="mt-9 rounded-2xl bg-primary-50 p-4 text-sm leading-7 text-primary-900 sm:p-5"><strong>{tr('Privacy contact:', 'গোপনীয়তা যোগাযোগ:')}</strong> <a className="font-semibold underline" href={`mailto:${siteContent.contact.email}`}>{siteContent.contact.email}</a></div>
      </article>
    </div>
  );
}
