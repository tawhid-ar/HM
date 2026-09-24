import { useMemo, useState } from 'react';
import { EmptyState, PageLoader } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { reportRange, type ReportPeriod } from './reportDateRange';
import { useReturnReport } from './useReports';

export default function ReturnReportPage() {
  const { tr, locale } = useLanguage();
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(now.getFullYear());
  const range = useMemo(() => reportRange(period, month, year), [period, month, year]);
  const { data = [], isLoading } = useReturnReport(range.from, range.to);
  const totalItems = data.reduce((sum, order) => sum + (order.order_items ?? []).reduce((x, item) => x + item.quantity, 0), 0);

  return <div><div className="dashboard-page-header mb-5"><h2 className="section-title">{tr('Product Return Report', 'প্রোডাক্ট রিটার্ন রিপোর্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('See who returned which products and when. Returned stock is restored automatically once.', 'কে কোন প্রোডাক্ট কখন রিটার্ন করেছে দেখুন। রিটার্ন হলে স্টক একবার স্বয়ংক্রিয়ভাবে ফেরত যোগ হয়।')}</p></div>
    <div className="dashboard-panel mb-4 flex flex-wrap items-end gap-3"><div><label className="field-label">{tr('Period', 'সময়')}</label><select className="select" value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}><option value="month">{tr('Monthly', 'মাসিক')}</option><option value="year">{tr('Yearly', 'বার্ষিক')}</option></select></div>{period === 'month' ? <div><label className="field-label">{tr('Month', 'মাস')}</label><input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div> : <div><label className="field-label">{tr('Year', 'বছর')}</label><input className="input w-28" type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>}<div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700"><b>{data.length}</b> {tr('return orders', 'রিটার্ন অর্ডার')} · <b>{totalItems}</b> {tr('items', 'আইটেম')}</div></div>
    {isLoading ? <PageLoader /> : !data.length ? <EmptyState icon="↩️" title={tr('No returns in this period', 'এই সময়ে কোনো রিটার্ন নেই')} /> : <div className="card overflow-x-auto"><table className="table-clean min-w-[1000px]"><thead><tr><th>{tr('Returned at', 'রিটার্ন তারিখ')}</th><th>{tr('Order', 'অর্ডার')}</th><th>{tr('User', 'ইউজার')}</th><th>{tr('Email / Phone', 'ইমেইল / ফোন')}</th><th>{tr('Product(s)', 'প্রোডাক্ট')}</th><th>{tr('Processed by', 'প্রসেস করেছে')}</th><th>{tr('Note', 'নোট')}</th></tr></thead><tbody>{data.map((order) => <tr key={order.id}><td className="text-xs">{order.returned_at ? new Date(order.returned_at).toLocaleString(locale) : '—'}</td><td className="font-mono text-xs">{order.order_number}</td><td>{order.customer?.full_name ?? '—'}</td><td className="text-xs"><div>{order.customer?.email ?? '—'}</div><div>{order.customer?.phone ?? '—'}</div></td><td>{(order.order_items ?? []).map((item) => <div key={item.id} className="text-xs">{item.product_name} × {item.quantity}</div>)}</td><td>{order.processor?.full_name ?? '—'}</td><td className="max-w-[240px] text-xs text-gray-600">{order.return_note ?? '—'}</td></tr>)}</tbody></table></div>}
  </div>;
}
