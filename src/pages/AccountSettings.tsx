import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { SettingsDetailSkeleton } from '@/components/SkeletonScreen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getInitial } from '@/lib/utils';
import profileService, { type AccountSettingsUpdate, type UserProfile } from '@/services/profileService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type AccountForm = {
  fullName: string;
  email: string;
  bio: string;
  cookingSkillLevel: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AccountBaseline = Pick<AccountForm, 'fullName' | 'email' | 'bio' | 'cookingSkillLevel'>;

const emptyForm: AccountForm = {
  fullName: '',
  email: '',
  bio: '',
  cookingSkillLevel: 'Beginner',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function normalizeFullName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function baselineFromProfile(profile: UserProfile): AccountBaseline {
  return {
    fullName: profile.full_name || '',
    email: profile.email || '',
    bio: profile.bio || '',
    cookingSkillLevel: profile.cooking_skill_level || 'Beginner',
  };
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState<AccountForm>(() => ({
    ...emptyForm,
    fullName: user?.name || '',
    email: user?.email || '',
  }));
  const [initial, setInitial] = useState<AccountBaseline>({
    fullName: user?.name || '',
    email: user?.email || '',
    bio: '',
    cookingSkillLevel: 'Beginner',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.id) {
        setLoading(false);
        setError('Unable to load your account. Please sign in again.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { profile } = await profileService.getProfile(user.id);
        if (!active) return;
        const nextInitial = baselineFromProfile(profile);
        setInitial(nextInitial);
        setForm({
          ...emptyForm,
          ...nextInitial,
        });
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Unable to load account settings.';
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const profileInitial = getInitial(form.fullName || user?.name);
  const emailChanged = normalizeEmail(form.email) !== normalizeEmail(initial.email);
  const passwordChanging = form.newPassword.length > 0;
  const securityChanging = emailChanged || passwordChanging;
  const passwordMismatch =
    form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
  const hasProfileChanges = useMemo(
    () =>
      normalizeFullName(form.fullName) !== normalizeFullName(initial.fullName) ||
      normalizeEmail(form.email) !== normalizeEmail(initial.email) ||
      form.bio.trim() !== initial.bio.trim() ||
      form.cookingSkillLevel !== initial.cookingSkillLevel ||
      form.currentPassword.length > 0 ||
      form.newPassword.length > 0 ||
      form.confirmPassword.length > 0,
    [form, initial]
  );

  const setField = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!normalizeFullName(form.fullName)) return 'Full name cannot be blank.';
    if (!EMAIL_RE.test(normalizeEmail(form.email))) return 'Please enter a valid email address.';
    if (securityChanging && !form.currentPassword) {
      return 'Current password is required to update your email or password.';
    }
    if (passwordChanging && form.newPassword.length < MIN_PASSWORD_LEN) {
      return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (passwordChanging && form.newPassword !== form.confirmPassword) {
      return 'New password and confirmation must match.';
    }
    return null;
  };

  const resetForm = () => {
    setSuccess(false);
    setError(null);
    setForm({
      ...emptyForm,
      ...initial,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || saving) return;

    setError(null);
    setSuccess(false);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: AccountSettingsUpdate = {
      full_name: normalizeFullName(form.fullName),
      email: normalizeEmail(form.email),
      bio: form.bio.trim(),
      cooking_skill_level: form.cookingSkillLevel,
    };
    if (securityChanging) payload.current_password = form.currentPassword;
    if (passwordChanging) payload.new_password = form.newPassword;

    setSaving(true);
    try {
      const { profile } = await profileService.updateProfile(user.id, payload);
      const nextInitial = baselineFromProfile(profile);
      setInitial(nextInitial);
      setForm({
        ...emptyForm,
        ...nextInitial,
      });
      try {
        await refreshUser();
      } catch {
        /* Profile save succeeded; session refresh can recover on the next load. */
      }
      setSuccess(true);
      toast.success('Account settings updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update account settings.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'h-12 w-full rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70';

  if (loading) {
    return (
      <Layout>
        <SettingsDetailSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      >
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mb-5 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-stone-500 transition-colors hover:text-stone-900"
            >
              <ArrowLeft className="size-4" />
              Settings
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-5xl">
              Account settings
            </h1>
            <p className="mt-2 max-w-2xl text-base font-medium text-stone-500 md:text-lg">
              Update your email, password, and profile details
            </p>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <motion.section
              custom={0}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Profile details</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Keep your public CookMate identity current.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Full name
                  </span>
                  <input
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.target.value)}
                    className={inputClass}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    disabled={loading || saving}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Bio
                  </span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => setField('bio', event.target.value)}
                    className={`${inputClass} min-h-28 resize-y py-3 leading-relaxed`}
                    placeholder="A short note about your cooking style"
                    disabled={loading || saving}
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Cooking skill
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {skillLevels.map((level) => (
                      <motion.button
                        key={level}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setField('cookingSkillLevel', level)}
                        disabled={loading || saving}
                        className={`h-11 rounded-lg border px-3 text-sm font-extrabold transition-all ${
                          form.cookingSkillLevel === level
                            ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-orange-300 hover:text-stone-900'
                        }`}
                      >
                        {level}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              custom={1}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Email</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Use the address you want for sign-in and account messages.
                  </p>
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Email address
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setField('email', event.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading || saving}
                />
              </label>
            </motion.section>

            <motion.section
              custom={2}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-stone-900">Password</h2>
                    <p className="text-sm font-medium text-stone-500">
                      Current password is required for email or password changes.
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPasswords((value) => !value)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPasswords ? 'hide' : 'show'}
                      initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
                      transition={{ duration: 0.18 }}
                      className="inline-flex"
                    >
                      {showPasswords ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Current password
                  </span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={form.currentPassword}
                    onChange={(event) => setField('currentPassword', event.target.value)}
                    className={inputClass}
                    placeholder="Required for secure changes"
                    autoComplete="current-password"
                    disabled={loading || saving}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    New password
                  </span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={(event) => setField('newPassword', event.target.value)}
                    className={inputClass}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    disabled={loading || saving}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Confirm password
                  </span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(event) => setField('confirmPassword', event.target.value)}
                    className={`${inputClass} ${
                      passwordMismatch
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : ''
                    }`}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    disabled={loading || saving}
                    aria-invalid={passwordMismatch}
                  />
                </label>
              </div>
            </motion.section>

            <AnimatePresence>
              {(error || success) && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className={`overflow-hidden rounded-lg border px-4 py-3 text-sm font-semibold ${
                    error
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-orange-200 bg-orange-50 text-orange-700'
                  }`}
                  role={error ? 'alert' : 'status'}
                >
                  {error || (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="size-4" />
                      Account settings updated.
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.aside
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 lg:sticky lg:top-8"
          >
            <div className="flex items-center gap-4 border-b border-stone-100 pb-5">
              <div className="flex size-16 items-center justify-center rounded-lg bg-orange-500 text-2xl font-extrabold text-white shadow-lg shadow-orange-500/20">
                {profileInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-stone-900">
                  {form.fullName || 'CookMate Chef'}
                </p>
                <p className="truncate text-sm font-medium text-stone-500">
                  {form.email || 'No email set'}
                </p>
              </div>
            </div>

            <div className="my-5 rounded-lg bg-stone-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-orange-600" />
                <p className="text-sm font-medium leading-relaxed text-stone-600">
                  Email and password updates are protected by your current password.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || saving || !hasProfileChanges}
                className="h-12 w-full rounded-lg bg-orange-500 text-base font-bold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </span>
                ) : (
                  'Save account'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading || saving || !hasProfileChanges}
                className="h-11 w-full rounded-lg border-stone-200 font-bold text-stone-700"
              >
                Reset changes
              </Button>
              <Link
                to="/settings"
                className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                Back to settings
              </Link>
            </div>
          </motion.aside>
        </form>
      </motion.div>
    </Layout>
  );
}
