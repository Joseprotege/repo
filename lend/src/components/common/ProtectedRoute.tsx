import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from './Skeleton';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps routes that require a logged-in user.
 * - While auth state is loading: shows PageLoader
 * - If no session and Supabase is configured: redirects to /login
 * - If no session but Supabase is NOT configured (dev/mock mode): renders children
 */
const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
);

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Always show children when not using Supabase (dev / mock-data mode)
  if (!SUPABASE_CONFIGURED) return <>{children}</>;

  if (loading) return <PageLoader />;

  if (!user) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
