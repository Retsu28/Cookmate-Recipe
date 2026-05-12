import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services/authService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';

const MIN_PASSWORD_LEN = 8;
const authCardClass =
  'bg-white/[0.88] dark:bg-stone-900/[0.84] backdrop-blur-xl shadow-2xl shadow-stone-950/20 rounded-2xl overflow-hidden border border-white/45 dark:border-white/10';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('cookmate.auth.panelHidden') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('cookmate.auth.panelHidden', String(panelCollapsed));
    } catch {}
  }, [panelCollapsed]);

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new password reset.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid reset link.');
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full h-12 rounded-xl border border-stone-200 bg-white px-4 text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all';

  return (
    <div className="relative min-h-screen flex overflow-hidden">
      <div className="relative z-10 flex w-full min-h-screen">
        <AuthVisualPanel
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((c) => !c)}
          heading="Secure your account."
          subheading="Choose a strong new password to keep your CookMate account safe."
        />

        <motion.div layout className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative w-full max-w-md"
          >
            <div className="absolute right-3 top-3 z-20 sm:-right-14 sm:top-0">
              <ThemeToggle />
            </div>

            <Card className={authCardClass}>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <img src="/logo.png" alt="CookMate" className="w-14 h-14 mb-4" />
                  <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                    Reset your password
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                    Enter a new password below.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800/40 dark:text-green-300 text-center">
                        <p className="font-bold">Password updated successfully.</p>
                        <p className="mt-1">Redirecting you to sign in...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                      noValidate
                    >
                      <div className="space-y-2">
                        <label
                          htmlFor="password"
                          className="text-xs font-bold text-stone-500 uppercase tracking-widest"
                        >
                          New password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                            className={`${inputCls} pr-12`}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="confirmPassword"
                          className="text-xs font-bold text-stone-500 uppercase tracking-widest"
                        >
                          Confirm password
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className={inputCls}
                          disabled={loading}
                        />
                        {confirmPassword.length > 0 && password === confirmPassword && (
                          <p className="text-xs text-green-600 font-medium">Passwords match</p>
                        )}
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            role="alert"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                          >
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        disabled={loading || !token}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 text-base font-bold disabled:opacity-70 flex items-center justify-center transition-all"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Updating password...
                          </span>
                        ) : (
                          'Reset password'
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
                  Remembered it?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-orange-600 hover:text-orange-700 hover:underline underline-offset-2"
                  >
                    Back to sign in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
