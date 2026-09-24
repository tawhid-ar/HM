import { Routes, Route } from 'react-router-dom';
import { DashboardShell, type DashboardNavItem } from '../../components/layout/DashboardShell';
import ProfilePage from '../../pages/ProfilePage';
import AddressesPage from '../../pages/AddressesPage';
import UserOverviewPage from './UserOverviewPage';

const navItems: DashboardNavItem[] = [
  {
    to: '/user',
    end: true,
    label: 'Dashboard',
    labelBn: 'ড্যাশবোর্ড',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h6.5v6.5h-6.5v-6.5zm10 0h6.5v6.5h-6.5v-6.5zm-10 10h6.5v6.5h-6.5v-6.5zm10 0h6.5v6.5h-6.5v-6.5z" />
      </svg>
    ),
  },
];

export default function UserDashboard() {
  return (
    <DashboardShell title="User Dashboard" titleBn="ইউজার ড্যাশবোর্ড" navItems={navItems}>
      <Routes>
        <Route index element={<UserOverviewPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="addresses" element={<AddressesPage />} />
      </Routes>
    </DashboardShell>
  );
}
