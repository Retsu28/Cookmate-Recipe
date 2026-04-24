import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ChefHat, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// Password must be at least 8 characters. The strength bar grows past
// that threshold only for visual feedback — the 8-char rule is the hard
// requirement enforced on both client and server.
const MIN_PASSWORD_LEN = 8;

// Business rule: only @gmail.com addresses are accepted (matches backend).
const GMAIL_RE = /^[^\s@]+@gmail\.com$/i;

function scorePassword(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'bg-stone-200' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length < MIN_PASSWORD_LEN) {
    return { score: 1, label: 'Too short', color: 'bg-red-500' };
  }
  if (score <= 2) return { score: 2, label: 'Weak', color: 'bg-orange-400' };
  if (score <= 3) return { score: 3, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 4, label: 'Good', color: 'bg-lime-500' };
  return { score: 5, label: 'Strong', color: 'bg-green-500' };
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!GMAIL_RE.test(email.trim())) return 'Email must be a @gmail.com address.';
    if (password.length < MIN_PASSWORD_LEN)
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  };

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LEN;
  const confirmMatches = confirm.length > 0 && confirm === password;
  const confirmMismatch = confirm.length > 0 && confirm !== password;

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
      await signup(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full h-12 rounded-xl border border-stone-200 bg-white px-4 text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all';

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 py-10 overflow-hidden">
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
                <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Create your CookMate</h1>
                <p className="text-stone-500 text-sm mt-1">Save recipes, plan meals, and cook with AI.</p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
                  <label htmlFor="name" className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className={inputCls}
                    disabled={loading}
                  />
                </motion.div>

                <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
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
                    className={inputCls}
                    disabled={loading}
                  />
                </motion.div>

                <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
                  <label htmlFor="password" className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${inputCls} pr-12`}
                      disabled={loading}
                      aria-describedby="password-strength"
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

                  {/* Password strength bar — fulfills "Warning: at least 8 characters" rule */}
                  <div id="password-strength" className="pt-1">
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <motion.div
                        className={`h-full ${strength.color}`}
                        initial={false}
                        animate={{ width: `${(strength.score / 5) * 100}%` }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold">
                      {passwordTooShort ? (
                        <>
                          <AlertTriangle size={12} className="text-red-600" />
                          <span className="text-red-600">
                            Warning: password must be at least {MIN_PASSWORD_LEN} characters.
                          </span>
                        </>
                      ) : password.length === 0 ? (
                        <span className="text-stone-400">Use at least {MIN_PASSWORD_LEN} characters.</span>
                      ) : (
                        <>
                          <Check size={12} className="text-green-600" />
                          <span className="text-stone-500">
                            Strength: <span className="text-stone-700">{strength.label}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>

                <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="show" className="space-y-2">
                  <label htmlFor="confirm" className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`${inputCls} ${
                      confirmMismatch
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : confirmMatches
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                        : ''
                    }`}
                    disabled={loading}
                    aria-invalid={confirmMismatch}
                    aria-describedby="confirm-hint"
                  />
                  <AnimatePresence>
                    {confirmMismatch && (
                      <motion.p
                        id="confirm-hint"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600"
                      >
                        <X size={12} /> Passwords do not match.
                      </motion.p>
                    )}
                    {confirmMatches && (
                      <motion.p
                        id="confirm-hint"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600"
                      >
                        <Check size={12} /> Passwords match.
                      </motion.p>
                    )}
                  </AnimatePresence>
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </motion.button>

                <p className="text-[11px] text-stone-400 text-center leading-relaxed px-2">
                  By continuing you agree to CookMate&apos;s Terms of Service and acknowledge our Privacy Policy.
                </p>
              </form>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-sm text-stone-500 mt-6"
              >
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-orange-600 hover:text-orange-700 hover:underline underline-offset-2">
                  Sign in
                </Link>
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
