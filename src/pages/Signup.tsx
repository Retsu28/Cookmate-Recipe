import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChefHat, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';
import { AuthVideoBackground } from '@/components/AuthVideoBackground';
import { ThemeToggle } from '@/components/ThemeToggle';

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

function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getPasswordRequirements(pw: string) {
  return [
    { label: 'At least 8 characters', met: pw.length >= MIN_PASSWORD_LEN },
    { label: 'At least 1 number', met: /\d/.test(pw) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'At least 1 special character', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

function scorePassword(requirements: Array<{ met: boolean }>): { score: number; color: string } {
  const score = requirements.filter((item) => item.met).length;
  if (score === 0) return { score, color: 'bg-stone-200' };
  if (score <= 1) return { score, color: 'bg-orange-300' };
  if (score <= 2) return { score, color: 'bg-orange-400' };
  if (score <= 3) return { score, color: 'bg-orange-500' };
  if (score <= 4) return { score, color: 'bg-orange-600' };
  return { score, color: 'bg-orange-700' };
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
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const validate = (): string | null => {
    if (!normalizeFullName(name)) return 'Please enter your full name.';
    if (!GMAIL_RE.test(normalizeEmail(email))) return 'Email must be a @gmail.com address.';
    if (password.length < MIN_PASSWORD_LEN)
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  };

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const strength = useMemo(() => scorePassword(passwordRequirements), [passwordRequirements]);
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
      await signup(normalizeFullName(name), normalizeEmail(email), password);
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
    <div className="relative min-h-screen bg-stone-950 flex overflow-hidden">
      <AuthVideoBackground />

      {/* ── Split-screen wrapper ── */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Visual panel (left) — hidden on mobile, collapsible on desktop */}
        <AuthVisualPanel
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((c) => !c)}
          heading="Join CookMate."
          subheading="Create an account to save recipes, plan meals, and cook with AI."
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
            className="relative w-full max-w-md"
          >
            <div className="absolute right-3 top-3 z-20 sm:-right-14 sm:top-0">
              <ThemeToggle />
            </div>

            <motion.div
              key={error ? 'shake-' + error : 'idle'}
              animate={error ? { x: [-10, 10, -6, 6, -2, 2, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
            >
              <Card className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/60">
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
                    placeholder="you@gmail.com"
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

                  <div id="password-strength" className="pt-1">
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <motion.div
                        className={`h-full ${strength.color}`}
                        initial={false}
                        animate={{ width: `${(strength.score / 5) * 100}%` }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-3 text-[12px] font-extrabold text-stone-500">
                        <span>Must contain:</span>
                        <span>{password.length === 0 ? 'Enter a password' : `${strength.score}/5 complete`}</span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {passwordRequirements.map((item) => (
                          <motion.div
                            key={item.label}
                            initial={false}
                            animate={{ opacity: item.met ? 1 : 0.75, x: item.met ? 2 : 0 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className={`flex items-center gap-2 text-[12px] font-semibold ${
                              item.met ? 'text-orange-600' : 'text-stone-400'
                            }`}
                          >
                            {item.met ? <Check size={14} /> : <X size={14} />}
                            <span>{item.label}</span>
                          </motion.div>
                        ))}
                      </div>
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
                        ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500/20'
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
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600"
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
        </motion.div>
      </div>
    </div>
  );
}
