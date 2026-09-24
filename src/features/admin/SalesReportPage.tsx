import { useMemo, useState } from 'react';
import { EmptyState, PageLoader } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { reportRange, type ReportPeriod } from './reportDateRange';
import { useSalesReport } from './useReports';

export default function SalesReportPage() {
  const { tr } = useLanguage();
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, setYear] = useState(now.getFullYear());
  const range = useMemo(() => reportRange(period, month, year), [period, month, year]);
  const { data = [], isLoading } = useSalesReport(range.from, range.to);
  const totals = data.reduce((a, row) => ({ sold: a.sold + Number(row.gross_sold_quantity), returned: a.returned + Number(row.returned_quantity), net: a.net + Number(row.net_sold_quantity), sales: a.sales + Number(row.net_sales) }), { sold: 0, returned: 0, net: 0, sales: 0 });
  return <div><div className="dashboard-page-header mb-5"><h2 className="section-title">{tr('Sales Report', 'সেলস রিপোর্ট')}</h2><p className="mt-1 text-sm text-gray-500">{tr('Monthly/yearly per-product sales and returns.', 'মাসিক/বার্ষিক প্রোডাক্টভিত্তিক বিক্রি ও রিটার্ন।')}</p></div>
    <div className="dashboard-panel mb-4 flex flex-wrap items-end gap-3"><div><label className="field-label">{tr('Period', 'সময়')}</label><select className="select" value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}><option value="month">{tr('Monthly', 'মাসিক')}</option><option value="year">{tr('Yearly', 'বার্ষিক')}</option></select></div>{period === 'month' ? <div><label className="field-label">{tr('Month', 'মাস')}</label><input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div> : <div><label className="field-label">{tr('Year', 'বছর')}</label><input className="input w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>}</div>
    <div className="mb-4 grid gap-3 sm:grid-cols-4"><div className="card p-4"><p className="text-xs text-gray-400">{tr('Gross sold qty', 'মোট বিক্রি qty')}</p><b className="text-xl">{totals.sold}</b></div><div className="card p-4"><p className="text-xs text-gray-400">{tr('Returned qty', 'রিটার্ন qty')}</p><b className="text-xl text-red-600">{totals.returned}</b></div><div className="card p-4"><p className="text-xs text-gray-400">{tr('Net sold qty', 'নেট বিক্রি qty')}</p><b className="text-xl text-primary-700">{totals.net}</b></div><div className="card p-4"><p className="text-xs text-gray-400">{tr('Net sales', 'নেট সেলস')}</p><b className="text-xl text-primary-700">৳{totals.sales.toFixed(2)}</b></div></div>
    {isLoading ? <PageLoader /> : !data.length ? <EmptyState icon="📊" title={tr('No completed sales in this period', 'এই সময়ে সম্পন্ন বিক্রি নেই')} /> : <div className="card overflow-x-auto"><table className="table-clean min-w-[820px]"><thead><tr><th>{tr('Product', 'প্রোডাক্ট')}</th><th>{tr('Gross sold', 'মোট বিক্রি')}</th><th>{tr('Returned', 'রিটার্ন')}</th><th>{tr('Net sold', 'নেট বিক্রি')}</th><th>{tr('Gross sales', 'মোট সেলস')}</th><th>{tr('Return value', 'রিটার্ন মূল্য')}</th><th>{tr('Net sales', 'নেট সেলস')}</th></tr></thead><tbody>{data.map((row) => <tr key={row.product_id}><td className="font-medium">{row.product_name}</td><td>{row.gross_sold_quantity}</td><td className="text-red-600">{row.returned_quantity}</td><td className="font-semibold">{row.net_sold_quantity}</td><td>৳{Number(row.gross_sales).toFixed(2)}</td><td className="text-red-600">৳{Number(row.returned_value).toFixed(2)}</td><td className="font-semibold text-primary-700">৳{Number(row.net_sales).toFixed(2)}</td></tr>)}</tbody></table></div>}
  </div>;
}
