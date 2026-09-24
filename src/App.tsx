import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import StorefrontLayout from './components/layout/StorefrontLayout';
import { PageLoader, EmptyState } from './components/common/ui';

// Route-based code splitting: each role's bundle only loads for that role.
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const ProductRequestPage = lazy(() => import('./pages/ProductRequestPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

const UserDashboard = lazy(() => import('./features/user/UserDashboard'));
const ModeratorDashboard = lazy(() => import('./features/moderator/ModeratorDashboard'));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./features/super-admin/SuperAdminDashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — avoids refetch storms under high concurrent load
      retry: 1,
    },
  },
});

function RoleRedirect() {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  switch (profile.role) {
    case 'super_admin':
      return <Navigate to="/super-admin" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'sub_admin':
    case 'moderator':
      return <Navigate to="/moderator" replace />;
    case 'user':
      return <Navigate to="/user" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

function AccountRedirect({ page }: { page: 'profile' | 'addresses' }) {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;

  const base = profile.role === 'super_admin'
    ? '/super-admin'
    : profile.role === 'admin'
    ? '/admin'
    : profile.role === 'moderator' || profile.role === 'sub_admin'
    ? '/moderator'
    : '/user';

  return <Navigate to={`${base}/${page}`} replace />;
}

function RoutedApp() {
  const { tr } = useLanguage();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#0f7f4d', secondary: '#fff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Storefront shell: public browsing + user account pages share one header/nav */}
              <Route element={<StorefrontLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/about-us" element={<AboutPage />} />
                <Route path="/contact-us" element={<ContactPage />} />
                <Route path="/terms-and-conditions" element={<TermsPage />} />
                <Route path="/privacy-policy" element={<PrivacyPage />} />

                {/* Customer area. Super Admin can enter it for full-access/QA purposes. */}
                <Route element={<ProtectedRoute allowedRoles={['user', 'super_admin']} />}>
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/orders" element={<OrderHistoryPage />} />
                  <Route path="/orders/:id/invoice" element={<InvoicePage />} />
                  <Route path="/product-request" element={<ProductRequestPage />} />
                </Route>

              </Route>

              <Route path="/dashboard" element={<RoleRedirect />} />

              {/* Legacy account URLs now stay inside the appropriate dashboard shell. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<AccountRedirect page="profile" />} />
                <Route path="/addresses" element={<AccountRedirect page="addresses" />} />
              </Route>

              {/* User dashboard. Super Admin can open it from Switch Access for QA/full-access use. */}
              <Route element={<ProtectedRoute allowedRoles={['user', 'super_admin']} />}>
                <Route path="/user/*" element={<UserDashboard />} />
              </Route>

              {/* Moderator + above */}
              <Route element={<ProtectedRoute allowedRoles={['sub_admin', 'moderator', 'admin', 'super_admin']} />}>
                <Route path="/moderator/*" element={<ModeratorDashboard />} />
              </Route>

              {/* Admin + above */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
                <Route path="/admin/*" element={<AdminDashboard />} />
              </Route>

              {/* Super admin only */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
              </Route>

              <Route
                path="/unauthorized"
                element={
                  <EmptyState
                    icon="🚫"
                    title={tr('Access denied', 'অ্যাক্সেস নিষিদ্ধ')}
                    description={tr('You do not have permission to view this page.', 'এই পেজটি দেখার অনুমতি আপনার নেই।')}
                    action={<a href="/" className="btn-primary btn-sm">{tr('Back to home', 'হোমে ফিরে যান')}</a>}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <EmptyState
                    icon="🧭"
                    title={tr('404 — Page not found', '৪০৪ — পেজ পাওয়া যায়নি')}
                    action={<a href="/" className="btn-primary btn-sm">{tr('Back to home', 'হোমে ফিরে যান')}</a>}
                  />
                }
              />
            </Routes>
          </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <RoutedApp />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
