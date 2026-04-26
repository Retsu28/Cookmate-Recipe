import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

/**
 * Small, unobtrusive logout trigger. Calls authService.logout() via
 * AuthContext and redirects to /login. Style is intentionally neutral
 * so it can sit inside any existing Cookmate card without redesigning.
 */
export function LogoutButton({ className, label = 'Sign out' }: LogoutButtonProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-60',
        className
      )}
    >
      <LogOut size={16} />
      {busy ? 'Signing out...' : label}
    </button>
  );
}

export default LogoutButton;
