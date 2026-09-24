import { useParams, Link } from 'react-router-dom';
import { useInvoice } from '../features/orders/useInvoice';
import { Invoice } from '../features/orders/Invoice';
import { downloadInvoicePdf } from '../features/orders/invoicePdf';
import { useLanguage } from '../contexts/LanguageContext';
import { PageLoader, EmptyState } from '../components/common/ui';

export default function InvoicePage() {
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useInvoice(id ?? null);
  if (isLoading) return <PageLoader />;
  if (error || !data) return <EmptyState icon="🧾" title={tr('Invoice not found', 'ইনভয়েস পাওয়া যায়নি')} action={<Link to="/orders" className="btn-outline btn-sm">{tr('Back to orders', 'অর্ডার হিস্ট্রিতে ফিরে যান')}</Link>} />;
  return <div className="page-shell"><div className="mx-auto mb-4 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link to="/orders" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700">← {tr('Order history', 'অর্ডার হিস্ট্রি')}</Link><button onClick={() => downloadInvoicePdf(data.order, data.items)} className="btn-primary btn-sm w-full sm:w-auto">{tr('Download PDF', 'PDF ডাউনলোড করুন')}</button></div><Invoice order={data.order} items={data.items} /></div>;
}
