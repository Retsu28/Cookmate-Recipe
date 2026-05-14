import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { mfaService } from '@/services/mfaService';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/services/authService';

const MAX_ATTEMPTS = 5;

export default function MFAVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithSession } = useAuth();

  // mfaUserId is passed through router state from the Login page
  const mfaUserId = (location.state as { mfaUserId?: number } | null)?.mfaUserId;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = attempts >= MAX_ATTEMPTS;

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    if (!mfaUserId) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mfaService.verify(mfaUserId, trimmed);
      loginWithSession(result.user as AuthUser, result.token);
      navigate('/', { replace: true });
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      const msg = (err as Error & { data?: { error?: string } })?.data?.error
        || (err as Error)?.message
        || 'Verification failed. Please try again.';
      setError(newAttempts >= MAX_ATTEMPTS
        ? 'Too many failed attempts. Please go back and sign in again.'
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isLocked) handleVerify();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <button
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Sign In
        </button>

        <div className="rounded-3xl border border-white/10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex size-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/30">
              <ShieldCheck className="size-10 text-orange-500" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-center text-stone-900 dark:text-stone-100 mb-2 tracking-tight">
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-center text-stone-500 dark:text-stone-400 leading-relaxed mb-8">
            Enter the 6-digit code from your authenticator app to complete sign-in.
          </p>

          {/* Code input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
              Verification Code
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              autoFocus
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              disabled={loading || isLocked}
              className={`w-full h-16 text-center text-4xl font-bold tracking-[1.2em] rounded-2xl border-2 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none transition-colors placeholder:text-stone-300 ${
                error
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-200 dark:border-stone-700 focus:border-orange-400'
              }`}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 mb-4">
              <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <p className="text-xs text-stone-400 text-center mb-6 leading-relaxed">
            Codes refresh every 30 seconds. Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>.
          </p>

          <button
            onClick={handleVerify}
            disabled={loading || isLocked || code.length < 6}
            className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verify Code'
            )}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full text-center text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors py-2"
          >
            Cancel Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
