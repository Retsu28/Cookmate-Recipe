import React, { useEffect, useMemo, useState } from 'react';
import { Check, Dumbbell, Flame, Leaf, Pencil, X, Eye, EyeOff, Loader2, CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { cn, getInitial } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ProfilePageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import profileService, { type AccountSettingsUpdate, type UserProfile } from '@/services/profileService';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Account Settings');
  const { user, refreshUser } = useAuth();
  const isInitialLoading = useInitialContentLoading();

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
        // Ignored
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
    'h-12 w-full rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-100 dark:placeholder-stone-500';

  if (isInitialLoading) {
    return (
      <Layout>
        <ProfilePageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl py-8 animate-fade-up">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Profile & Settings</h1>

        <div className="relative mb-8 flex flex-col items-center gap-8 overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-8 shadow-xl shadow-orange-100/60 sm:flex-row sm:items-start dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
          <div className="absolute right-0 top-0 -z-10 h-full w-1/2 -skew-x-12 translate-x-10 bg-orange-50 dark:bg-stone-700/30" />
          <div className="relative shrink-0">
            <div
              aria-label={`${form.fullName || 'User'} avatar`}
              className="flex h-32 w-32 select-none items-center justify-center rounded-[2rem] orange-gradient shadow-xl shadow-orange-500/25"
            >
              <span className="text-6xl font-extrabold tracking-tight text-white">
                {profileInitial}
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-xl bg-white p-2 text-orange-600 shadow-lg ring-1 ring-orange-100 dark:bg-stone-700 dark:ring-stone-600">
              <span className="sr-only">Edit Profile Picture</span>
              <Pencil size={16} />
            </div>
          </div>
          <div className="flex w-full flex-1 flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <h2 className="mb-1 text-4xl font-extrabold text-stone-900 dark:text-stone-100">{form.fullName || 'CookMate Chef'}</h2>
              <p className="mb-6 font-medium text-stone-500 dark:text-stone-400">
                {form.email ? `${form.email} - Home Chef` : 'Home Chef'}
              </p>
              <div className="flex justify-center gap-8 text-left sm:justify-start">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Saved Recipes</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">142</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="space-y-1 md:col-span-3">
            <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Category</p>
            {[
              'Account Settings',
              'Kitchen Inventory',
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all',
                  activeTab === tab
                    ? 'orange-gradient text-white shadow-lg shadow-orange-500/20'
                    : 'bg-orange-50/70 text-stone-600 hover:bg-orange-100 hover:text-orange-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-orange-400'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-white p-8 shadow-lg shadow-orange-100/50 md:col-span-9 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
            {activeTab === 'Account Settings' ? (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div>
                  <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Account Settings</h3>
                  <p className="text-stone-500 dark:text-stone-400">Manage your profile, email, and password</p>
                </div>

                <div className="grid gap-6">
                  {/* Profile Details */}
                  <section className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 dark:border-stone-700 dark:bg-stone-800/30">
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Profile Details</h4>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Full Name</span>
                          <input
                            value={form.fullName}
                            onChange={(e) => setField('fullName', e.target.value)}
                            className={inputClass}
                            placeholder="Jane Doe"
                            disabled={loading || saving}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Email Address</span>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setField('email', e.target.value)}
                            className={inputClass}
                            placeholder="you@example.com"
                            disabled={loading || saving}
                          />
                        </label>
                      </div>
                      
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Bio</span>
                        <textarea
                          value={form.bio}
                          onChange={(e) => setField('bio', e.target.value)}
                          className={cn(inputClass, 'min-h-[100px] resize-y py-3')}
                          placeholder="A short note about your cooking style"
                          disabled={loading || saving}
                        />
                      </label>

                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Cooking Skill</span>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {skillLevels.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setField('cookingSkillLevel', level)}
                              disabled={loading || saving}
                              className={cn(
                                'h-11 rounded-xl border px-3 text-sm font-bold transition-all',
                                form.cookingSkillLevel === level
                                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                                  : 'border-stone-200 bg-white text-stone-600 hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Security */}
                  <section className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 dark:border-stone-700 dark:bg-stone-800/30">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Security</h4>
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500 hover:text-stone-900 dark:hover:text-stone-300"
                      >
                        {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPasswords ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Current Password (Required for changes)</span>
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={form.currentPassword}
                          onChange={(e) => setField('currentPassword', e.target.value)}
                          className={inputClass}
                          disabled={loading || saving}
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">New Password</span>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={form.newPassword}
                            onChange={(e) => setField('newPassword', e.target.value)}
                            className={inputClass}
                            disabled={loading || saving}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Confirm Password</span>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={form.confirmPassword}
                            onChange={(e) => setField('confirmPassword', e.target.value)}
                            className={cn(inputClass, passwordMismatch && 'border-red-300 focus:border-red-500')}
                            disabled={loading || saving}
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <AnimatePresence>
                    {(error || success) && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className={`overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold ${
                          error
                            ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                            : 'border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                        }`}
                      >
                        {error || (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 size={16} /> Account settings updated.
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-orange-100 pt-6 dark:border-stone-700">
                  <Button type="button" variant="ghost" onClick={resetForm} disabled={loading || saving || !hasProfileChanges} className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    Discard Changes
                  </Button>
                  <Button type="submit" disabled={loading || saving || !hasProfileChanges} className="rounded-2xl px-8 py-5 text-xs font-bold uppercase tracking-widest">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save Settings'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex h-64 items-center justify-center text-stone-400 dark:text-stone-500">
                Content for {activeTab}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
