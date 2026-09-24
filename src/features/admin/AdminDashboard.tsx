import { Routes, Route } from 'react-router-dom';
import ProductManagementPage from './ProductManagementPage';
import ModeratorRequestsPage from './ModeratorRequestsPage';
import DeliveryPartnersPage from './DeliveryPartnersPage';
import StaffManagementPage from './StaffManagementPage';
import CategoryManagementPage from './CategoryManagementPage';
import SupplierManagementPage from './SupplierManagementPage';
import StoreSettingsPage from './StoreSettingsPage';
import ProductRequestsPage from './ProductRequestsPage';
import ReturnReportPage from './ReturnReportPage';
import SalesReportPage from './SalesReportPage';
import { DashboardShell, type DashboardNavItem } from '../../components/layout/DashboardShell';
import ProfilePage from '../../pages/ProfilePage';
import AddressesPage from '../../pages/AddressesPage';

const navItems: DashboardNavItem[] = [
  {
    to: '/admin', end: true, label: 'Products & Stock', labelBn: 'প্রোডাক্ট ও স্টক',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    to: '/admin/categories', label: 'Category Management', labelBn: 'ক্যাটাগরি ম্যানেজমেন্ট',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3.057a1.5 1.5 0 011.06-.44h7.872a1.5 1.5 0 011.5 1.5v7.872a1.5 1.5 0 01-.44 1.06l-7.5 7.5a1.5 1.5 0 01-2.12 0l-6.49-6.49a1.5 1.5 0 010-2.12l7.5-7.5a1.5 1.5 0 011.06-.44z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h.008v.008H16.5V7.5z" />
      </svg>
    ),
  },
  {
    to: '/admin/staff', label: 'Moderators & Users', labelBn: 'মডারেটর ও ইউজার',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    to: '/admin/moderator-requests', label: 'Moderator Requests', labelBn: 'মডারেটর রিকোয়েস্ট',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    to: '/admin/delivery-partners', label: 'Delivery Partners', labelBn: 'ডেলিভারি পার্টনার',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v11.177m0-11.177L12.816 4.65a2.25 2.25 0 00-2.25 0L2.25 9.573" />
      </svg>
    ),
  },
  { to: '/admin/suppliers', label: 'Suppliers', labelBn: 'সাপ্লায়ার', icon: <span className="text-lg">🏭</span> },
  { to: '/admin/product-requests', label: 'Product Requests', labelBn: 'প্রোডাক্ট রিকোয়েস্ট', icon: <span className="text-lg">📝</span> },
  { to: '/admin/returns', label: 'Return Report', labelBn: 'রিটার্ন রিপোর্ট', icon: <span className="text-lg">↩️</span> },
  { to: '/admin/reports', label: 'Sales Report', labelBn: 'সেলস রিপোর্ট', icon: <span className="text-lg">📊</span> },
  { to: '/admin/store-settings', label: 'Store Notice', labelBn: 'স্টোর নোটিশ', icon: <span className="text-lg">📢</span> },
];

export default function AdminDashboard() {
  return (
    <DashboardShell title="Admin Panel" titleBn="অ্যাডমিন প্যানেল" navItems={navItems}>
      <Routes>
        <Route index element={<ProductManagementPage />} />
        <Route path="categories" element={<CategoryManagementPage />} />
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="moderator-requests" element={<ModeratorRequestsPage />} />
        <Route path="delivery-partners" element={<DeliveryPartnersPage />} />
        <Route path="suppliers" element={<SupplierManagementPage />} />
        <Route path="product-requests" element={<ProductRequestsPage />} />
        <Route path="returns" element={<ReturnReportPage />} />
        <Route path="reports" element={<SalesReportPage />} />
        <Route path="store-settings" element={<StoreSettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="addresses" element={<AddressesPage />} />
      </Routes>
    </DashboardShell>
  );
}
