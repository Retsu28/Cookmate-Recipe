import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { authService } from '@/services/authService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const authCardClass =
  'bg-white/[0.88] dark:bg-stone-900/[0.84] backdrop-blur-xl shadow-2xl shadow-stone-950/20 rounded-2xl overflow-hidden border border-white/45 dark:border-white/10';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not send the reset email. Please try again.';
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
          heading="Reset your password."
          subheading="We'll email you a secure link to set a new password."
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
                    Forgot your password?
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                    Enter the email tied to your CookMate account.
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800/40 dark:text-green-300 flex gap-3">
                        <Mail className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">Check your inbox.</p>
                          <p className="mt-1">
                            If <span className="font-semibold">{email}</span> is registered, you'll
                            receive a password reset link shortly. The link expires in about an
                            hour.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSent(false);
                          setEmail('');
                        }}
                        className="w-full text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                      >
                        Use a different email
                      </button>
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
                          htmlFor="email"
                          className="text-xs font-bold text-stone-500 uppercase tracking-widest"
                        >
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          className={inputCls}
                          disabled={loading}
                        />
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
                        disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 text-base font-bold disabled:opacity-70 flex items-center justify-center transition-all"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Sending reset link...
                          </span>
                        ) : (
                          'Send reset link'
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
