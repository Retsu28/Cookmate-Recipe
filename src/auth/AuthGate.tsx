import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

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
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-500 shadow-sm">
          Checking session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
