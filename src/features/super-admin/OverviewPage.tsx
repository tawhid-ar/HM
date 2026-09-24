import { useDashboardStats } from './useDashboardStats';
import { PageLoader } from '../../components/common/ui';
import { useLanguage } from '../../contexts/LanguageContext';

const STAT_ICONS: Record<string, { icon: string; tone: string }> = {
  totalUsers: { icon: '👤', tone: 'bg-primary-50 text-primary-700' },
  totalModerators: { icon: '🛡️', tone: 'bg-indigo-50 text-indigo-700' },
  totalAdmins: { icon: '⭐', tone: 'bg-accent-50 text-accent-700' },
  totalProducts: { icon: '📦', tone: 'bg-primary-50 text-primary-700' },
  totalOrders: { icon: '🧾', tone: 'bg-indigo-50 text-indigo-700' },
  pendingOrders: { icon: '⏳', tone: 'bg-amber-50 text-amber-700' },
};

function StatCard({ label, value, statKey }: { label: string; value: number; statKey: string }) {
  const meta = STAT_ICONS[statKey] ?? { icon: '📊', tone: 'bg-gray-50 text-gray-700' };
  return (
    <div className="dashboard-stat flex min-w-0 items-center gap-3 sm:gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm sm:h-14 sm:w-14 ${meta.tone}`}>
        {meta.icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-gray-400 sm:text-sm sm:normal-case sm:tracking-normal">{label}</div>
        <div className="mt-0.5 font-display text-2xl font-extrabold text-gray-950 sm:text-3xl">{value}</div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading } = useDashboardStats();
  const { tr } = useLanguage();

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="dashboard-page-header relative mb-5 flex flex-row items-start justify-between gap-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-white via-white to-emerald-50/55 p-4 shadow-[0_12px_32px_-24px_rgba(6,78,59,0.45)] sm:mb-6 sm:p-5">
        <div>
          <h2 className="section-title">{tr('Dashboard Overview', 'ড্যাশবোর্ড ওভারভিউ')}</h2>
          <p className="mt-1 text-sm text-gray-500">{tr('A quick view of users, products and orders across Hadia Mart.', 'Hadia Mart-এর ইউজার, প্রোডাক্ট ও অর্ডারের দ্রুত সারসংক্ষেপ।')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <StatCard statKey="totalUsers" label={tr('Total Users', 'মোট ইউজার')} value={data?.totalUsers ?? 0} />
        <StatCard statKey="totalModerators" label={tr('Total Moderators', 'মোট মডারেটর')} value={data?.totalModerators ?? 0} />
        <StatCard statKey="totalAdmins" label={tr('Total Admins', 'মোট অ্যাডমিন')} value={data?.totalAdmins ?? 0} />
        <StatCard statKey="totalProducts" label={tr('Active Products', 'সক্রিয় প্রোডাক্ট')} value={data?.totalProducts ?? 0} />
        <StatCard statKey="totalOrders" label={tr('Total Orders', 'মোট অর্ডার')} value={data?.totalOrders ?? 0} />
        <StatCard statKey="pendingOrders" label={tr('Pending Orders', 'পেন্ডিং অর্ডার')} value={data?.pendingOrders ?? 0} />
      </div>
    </div>
  );
}
