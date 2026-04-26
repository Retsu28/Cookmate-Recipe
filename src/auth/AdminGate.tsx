import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/services/authService';
import { ContentSkeleton } from '@/components/SkeletonScreen';

export default function AdminGate() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const isAdmin = isAdminUser(user);

  if (isLoading) {
    return <ContentSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
