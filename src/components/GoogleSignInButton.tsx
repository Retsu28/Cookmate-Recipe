import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser, MfaRequiredError } from '@/services/authService';

interface Props {
  /** Affects the button label only. */
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  /** Called with an error message to bubble up to the parent form. */
  onError?: (message: string) => void;
}

function labelFor(text: Props['text']) {
  switch (text) {
    case 'signup_with':
      return 'Sign up with Google';
    case 'signin':
    case 'signin_with':
      return 'Sign in with Google';
    default:
      return 'Continue with Google';
  }
}

/**
 * "Continue with Google" button. Triggers a Firebase Google popup; the
 * resulting ID token is exchanged with /api/auth/firebase by AuthContext.
 */
export function GoogleSignInButton({ text = 'continue_with', onError }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Credential param is ignored now — Firebase popup provides the user.
      const user = await loginWithGoogle('');
      navigate(isAdminUser(user) ? '/admin' : from, { replace: true });
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        navigate('/mfa-verify', { state: { mfaUserId: err.mfaUserId }, replace: true });
        return;
      }
      const code = (err as { code?: string } | null)?.code;
      // Don't surface user-cancelled popups as errors.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-3 h-12 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-70 transition-colors text-sm font-bold text-stone-700 dark:bg-stone-900/50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-900"
      aria-busy={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9a8.74 8.74 0 0 0 2.69-6.62z" />
          <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.95-2.18l-2.9-2.26a5.4 5.4 0 0 1-3.05.86 5.36 5.36 0 0 1-5.04-3.71H1v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1-.28-1.71c0-.6.1-1.17.28-1.71V4.96H1A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0a9 9 0 0 0-8.04 4.96l3 2.33A5.36 5.36 0 0 1 9 3.58z" />
        </svg>
      )}
      <span>{labelFor(text)}</span>
    </button>
  );
}

export default GoogleSignInButton;
