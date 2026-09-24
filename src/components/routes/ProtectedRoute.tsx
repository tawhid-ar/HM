import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database.types';
import { PageLoader } from '../common/ui';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]; // omit to just require "logged in"
}

/**
 * NOTE: this is a UX convenience only — it hides pages the user shouldn't see
 * and redirects them. The REAL enforcement lives in Postgres RLS policies
 * (see supabase/migrations/20260917000001_init.sql). Never trust this component alone.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!session) return <Navigate to="/login" replace />;

  // `profile` can briefly be null even with a valid session — it loads in a
  // separate async call after the session resolves (see AuthContext), and
  // it also ends up null if the account turned out to be deactivated. A
  // role-gated route must never render for either case: previously this
  // check only fired when `profile` was truthy, so a null profile silently
  // fell through to `<Outlet />` instead of being blocked. Route with no
  // `allowedRoles` (just "must be logged in") still needs *some* profile
  // to be confident the account is in good standing, so require it there
  // too rather than only when roles are specified.
  if (!profile) return <PageLoader />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
