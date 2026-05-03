import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/services/authService';
import { ContentSkeleton } from '@/components/SkeletonScreen';

/**
 * AuthGate — renders children only if the user is authenticated.
 *
 * Used as a parent <Route element={<AuthGate />}> that wraps every
 * protected app route (Dashboard, Search, RecipeDetail, etc.).
 *
 * When unauthenticated, redirects to /login and remembers the
 * originally requested path in location.state.from so the login
 * page can bounce the user back after a successful sign-in.
 *
 * Public routes (/login, /signup, /onboarding) sit OUTSIDE this gate
 * in App.tsx so they remain reachable without a session.
 *
 * TODO: When real backend auth arrives, this component does not need
 * to change — only authService.getCurrentUser() / useAuth() do.
 */
export default function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <ContentSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function GuestGate() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdminUser(user) ? '/admin' : '/'} replace />;
  }

  return <Outlet />;
}
