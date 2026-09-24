import { Routes, Route } from 'react-router-dom';
import OrderQueuePage from './OrderQueuePage';
import StockViewPage from './StockViewPage';
import RequestModeratorPage from './RequestModeratorPage';
import { DashboardShell, type DashboardNavItem } from '../../components/layout/DashboardShell';
import ProfilePage from '../../pages/ProfilePage';
import AddressesPage from '../../pages/AddressesPage';

const navItems: DashboardNavItem[] = [
  {
    to: '/moderator', end: true, label: 'Orders', labelBn: 'অর্ডার',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    to: '/moderator/stock', label: 'Stock', labelBn: 'স্টক',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m16.5 0l.75-3H3l.75 3m16.5 0H3.75M10 11.25h4" />
      </svg>
    ),
  },
  {
    to: '/moderator/request-moderator', label: 'Moderator Request', labelBn: 'মডারেটর রিকোয়েস্ট',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

export default function ModeratorDashboard() {
  return (
    <DashboardShell title="Moderator Panel" titleBn="মডারেটর প্যানেল" navItems={navItems}>
      <Routes>
        <Route index element={<OrderQueuePage />} />
        <Route path="stock" element={<StockViewPage />} />
        <Route path="request-moderator" element={<RequestModeratorPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="addresses" element={<AddressesPage />} />
      </Routes>
    </DashboardShell>
  );
}
