import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn, getInitial } from '@/lib/utils';
import profileService, { type AccountSettingsUpdate, type UserProfile } from '@/services/profileService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp'];
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

function resolveAvatarUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith('blob:')) return value;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  return `${baseUrl}${value}`;
}

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
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
        setAvatarUrl(profile.avatar_url || null);
        setAvatarFile(null);
        setAvatarPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
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

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const profileInitial = getInitial(form.fullName || user?.name);
  const displayAvatarUrl = resolveAvatarUrl(avatarPreviewUrl || avatarUrl);
  const emailChanged = normalizeEmail(form.email) !== normalizeEmail(initial.email);
  const passwordChanging = form.newPassword.length > 0;
  const securityChanging = emailChanged || passwordChanging;
  const passwordMismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
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
  const hasChanges = hasProfileChanges || !!avatarFile;

  const setField = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
    setSuccess(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!normalizeFullName(form.fullName)) return 'Username cannot be blank.';
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

  const resetAvatarSelection = () => {
    setAvatarFile(null);
    setAvatarPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setSuccess(false);
    setError(null);
    setForm({
      ...emptyForm,
      ...initial,
    });
    resetAvatarSelection();
  };

  const handleAvatarSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSuccess(false);
    if (!file) return;
    if (!allowedAvatarTypes.includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Avatar image must be 2MB or smaller.');
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setError(null);
    setAvatarFile(file);
    setAvatarPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return previewUrl;
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
      let nextInitial = initial;
      if (hasProfileChanges) {
        const { profile } = await profileService.updateProfile(user.id, payload);
        nextInitial = baselineFromProfile(profile);
        setInitial(nextInitial);
        setForm({
          ...emptyForm,
          ...nextInitial,
        });
        setAvatarUrl(profile.avatar_url || avatarUrl);
      }
      if (avatarFile) {
        const { avatar_url } = await profileService.uploadAvatar(user.id, avatarFile);
        setAvatarUrl(avatar_url);
        resetAvatarSelection();
      }
      try {
        await refreshUser();
      } catch {
        // Ignored
      }
      setInitial(nextInitial);
      setForm({
        ...emptyForm,
        ...nextInitial,
      });
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

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      <div className="relative flex w-full flex-col gap-6 overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 sm:flex-row sm:items-start dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelected} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || saving}
          className="group relative mx-auto flex h-24 w-24 shrink-0 select-none items-center justify-center overflow-hidden rounded-[2rem] orange-gradient shadow-xl shadow-orange-500/25 disabled:cursor-not-allowed disabled:opacity-70 sm:mx-0 sm:h-32 sm:w-32"
          aria-label="Choose profile photo"
        >
          {displayAvatarUrl ? (
            <img src={displayAvatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">{profileInitial}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
            <Camera size={28} />
          </span>
        </button>
        <div className="w-full min-w-0 flex-1">
          <h2 className="break-words text-xl font-extrabold text-stone-900 dark:text-stone-100 sm:text-3xl">{form.fullName || 'CookMate Chef'}</h2>
          <p className="mt-1 break-all text-sm font-medium text-stone-500 dark:text-stone-400">
            {form.email ? `${form.email} · Home Chef` : 'Home Chef'}
          </p>
          <p className="mt-3 whitespace-normal break-words text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400 sm:text-sm">
            Click your avatar to choose an image. The preview stays local until you click Save Settings.
          </p>
          {avatarFile && (
            <Button type="button" variant="ghost" onClick={resetAvatarSelection} className="mt-4 h-9 px-3 text-xs font-bold uppercase tracking-widest">
              <X size={14} /> Remove selected photo
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="mb-8">
          <h3 className="mb-2 break-words text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Account Settings</h3>
          <p className="break-words text-stone-500 dark:text-stone-400">Manage your profile, email, password, and avatar.</p>
        </div>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 dark:border-stone-700 dark:bg-stone-800/30">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Profile Details</h4>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Full Name</span>
                  <input value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} className={inputClass} placeholder="Jane Doe" disabled={loading || saving} />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Email Address</span>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputClass} placeholder="you@example.com" disabled={loading || saving} />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Bio</span>
                <textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} className={cn(inputClass, 'min-h-[100px] resize-y py-3')} placeholder="A short note about your cooking style" disabled={loading || saving} />
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
                        'h-11 rounded-xl border px-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70',
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

          <section className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 dark:border-stone-700 dark:bg-stone-800/30">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Security</h4>
              <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="flex items-center gap-2 text-xs font-bold uppercase text-stone-500 hover:text-stone-900 dark:hover:text-stone-300">
                {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPasswords ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Current Password (Required for email or password changes)</span>
                <input type={showPasswords ? 'text' : 'password'} value={form.currentPassword} onChange={(e) => setField('currentPassword', e.target.value)} className={inputClass} disabled={loading || saving} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">New Password</span>
                  <input type={showPasswords ? 'text' : 'password'} value={form.newPassword} onChange={(e) => setField('newPassword', e.target.value)} className={inputClass} disabled={loading || saving} />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Confirm Password</span>
                  <input type={showPasswords ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} className={cn(inputClass, passwordMismatch && 'border-red-300 focus:border-red-500')} disabled={loading || saving} />
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
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
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

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-orange-100 pt-6 dark:border-stone-700">
          <Button type="button" variant="ghost" onClick={resetForm} disabled={loading || saving || !hasChanges} className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Discard Changes
          </Button>
          <Button type="submit" disabled={loading || saving || !hasChanges} className="h-12 rounded-2xl px-8 text-xs font-bold uppercase tracking-widest">
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save Settings'}
          </Button>
        </div>
      </div>
    </form>
  );
}
