import { Routes, Route } from 'react-router-dom';
import OverviewPage from './OverviewPage';
import UserManagementPage from './UserManagementPage';
import AuditLogPage from './AuditLogPage';
import { DashboardShell, type DashboardNavItem } from '../../components/layout/DashboardShell';
import ProfilePage from '../../pages/ProfilePage';
import AddressesPage from '../../pages/AddressesPage';

const navItems: DashboardNavItem[] = [
  {
    to: '/super-admin', end: true, label: 'Overview', labelBn: 'ওভারভিউ',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5h-12l.5-1.5m11 0h-11" />
      </svg>
    ),
  },
  {
    to: '/super-admin/users', label: 'User Management', labelBn: 'ইউজার ম্যানেজমেন্ট',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    to: '/super-admin/audit-log', label: 'Audit Log', labelBn: 'অডিট লগ',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function SuperAdminDashboard() {
  return (
    <DashboardShell title="Super Admin" titleBn="সুপার অ্যাডমিন" navItems={navItems}>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="addresses" element={<AddressesPage />} />
      </Routes>
    </DashboardShell>
  );
}
