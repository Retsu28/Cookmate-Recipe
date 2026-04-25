import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/services/authService';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// Public signup is Gmail-only, but login also supports seeded system accounts.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const validate = (): string | null => {
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    try {
      const signedInUser = await login(email.trim(), password);
      navigate(isAdminUser(signedInUser) ? '/admin' : from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex overflow-hidden">
      {/* ── Split-screen wrapper ── */}
      <div className="relative flex w-full min-h-screen">
        {/* Visual panel (left) — hidden on mobile, collapsible on desktop */}
        <AuthVisualPanel
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((c) => !c)}
          heading="Cook smarter."
          subheading="Plan meals, discover recipes, and let AI be your sous-chef."
        />

        {/* ── Form side (right) ── */}
        <motion.div
          layout
          className="flex-1 flex items-center justify-center p-4 sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-md"
          >
            <motion.div
              key={error ? 'shake-' + error : 'idle'}
              animate={error ? { x: [-10, 10, -6, 6, -2, 2, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
            >
              <Card className="bg-white shadow-xl rounded-2xl overflow-hidden border-none">
                <CardContent className="p-8">
                  {/* Brand */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.4 }}
                    className="flex flex-col items-center text-center mb-8"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
                      className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-sm mb-4"
                    >
                      <ChefHat className="w-7 h-7" />
                    </motion.div>
                    <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Welcome back</h1>
                    <p className="text-stone-500 text-sm mt-1">Sign in to keep cooking with CookMate.</p>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
                      <label htmlFor="email" className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-12 rounded-xl border border-stone-200 bg-white px-4 text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        disabled={loading}
                      />
                    </motion.div>

                    <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
                      <label htmlFor="password" className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Your password"
                          className="w-full h-12 rounded-xl border border-stone-200 bg-white px-4 pr-12 text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                          disabled={loading}
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          whileTap={{ scale: 0.82 }}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={showPassword ? 'off' : 'on'}
                              initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                              animate={{ opacity: 1, rotate: 0, scale: 1 }}
                              exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                              transition={{ duration: 0.18 }}
                              className="inline-flex"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </motion.span>
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </motion.div>

                    <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="show" className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-500"
                        />
                        Remember me
                      </label>
                      {/* TODO: wire forgot-password flow when backend supports it */}
                      <span className="text-sm font-medium text-stone-400 cursor-not-allowed" aria-disabled>
                        Forgot password?
                      </span>
                    </motion.div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          role="alert"
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 overflow-hidden"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.015 }}
                      whileTap={{ scale: loading ? 1 : 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-4 text-base font-bold disabled:opacity-70 flex items-center justify-center"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                        </span>
                      ) : (
                        'Sign in'
                      )}
                    </motion.button>
                  </form>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-center text-sm text-stone-500 mt-6"
                  >
                    New to CookMate?{' '}
                    <Link to="/signup" className="font-bold text-orange-600 hover:text-orange-700 hover:underline underline-offset-2">
                      Create an account
                    </Link>
                  </motion.p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
