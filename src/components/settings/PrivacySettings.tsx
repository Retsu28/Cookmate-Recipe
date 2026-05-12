import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, PackageOpen, ShieldCheck, Trash2, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import profileService from '@/services/profileService';
import settingsService from '@/services/settingsService';

type PrivacyPreferences = {
  isProfilePublic: boolean;
  showKitchenInventory: boolean;
};

const defaultPreferences: PrivacyPreferences = {
  isProfilePublic: false,
  showKitchenInventory: false,
};

const rows: Array<{
  id: keyof PrivacyPreferences;
  title: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
}> = [
  {
    id: 'isProfilePublic',
    title: 'Make profile public',
    description: 'Allow other CookMate users to discover your cooking profile.',
    icon: UserRoundCheck,
  },
  {
    id: 'showKitchenInventory',
    title: 'Show kitchen inventory',
    description: 'Allow others to see your kitchen inventory if your profile is public.',
    icon: PackageOpen,
    disabled: true,
    badge: 'Coming Soon',
  },
];

type ToggleRowProps = {
  title: string;
  description: string;
  checked: boolean;
  icon: LucideIcon;
  onChange: () => void;
  disabled?: boolean;
  badge?: string;
};

function ToggleRow({ title, description, checked, icon: Icon, onChange, disabled, badge }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange()}
      disabled={disabled}
      className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
        disabled
          ? 'cursor-not-allowed opacity-60 border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/30'
          : checked
            ? 'border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-950/20'
            : 'border-stone-200 bg-white hover:border-orange-200 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-orange-500/40'
      }`}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${disabled ? 'bg-stone-100 text-stone-400' : checked ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'}`}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="block text-base font-extrabold text-stone-900 dark:text-stone-100">{title}</span>
            {badge && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                {badge}
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">{description}</span>
        </span>
      </span>
      <span className={`mt-1 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${disabled ? 'bg-stone-200 dark:bg-stone-700' : checked ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'}`}>
        <span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${checked && !disabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function normalizePreferences(value: Record<string, unknown>): PrivacyPreferences {
  return {
    isProfilePublic:
      typeof value.isProfilePublic === 'boolean'
        ? value.isProfilePublic
        : defaultPreferences.isProfilePublic,
    showKitchenInventory:
      typeof value.showKitchenInventory === 'boolean'
        ? value.showKitchenInventory
        : defaultPreferences.showKitchenInventory,
  };
}

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState<PrivacyPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setLoading(true);
    settingsService
      .getSettings(String(user.id), 'privacy')
      .then((value) => {
        if (!cancelled) setPreferences(normalizePreferences(value));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load privacy settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const togglePreference = (id: keyof PrivacyPreferences) => {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const saved = await settingsService.saveSettings(String(user.id), 'privacy', preferences);
      setPreferences(normalizePreferences(saved));
      toast.success('Privacy settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setCurrentPassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteStep(1);
    setCurrentPassword('');
    setDeleteError('');
  };

  const confirmDeleteAccount = async () => {
    if (!user?.id) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await profileService.deleteAccount(user.id, currentPassword);
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Privacy & Security</h2>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">Control profile visibility and sensitive account actions.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {rows.map((row) => (
            <ToggleRow
              key={row.id}
              title={row.title}
              description={row.description}
              icon={row.icon}
              checked={preferences[row.id]}
              onChange={() => togglePreference(row.id)}
              disabled={row.disabled}
              badge={row.badge}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-700 dark:text-red-300">Delete Account</h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-red-600 dark:text-red-400">Your account will be scheduled for permanent deletion after 7 days.</p>
              </div>
            </div>
            <Button type="button" variant="destructive" onClick={openDeleteModal} className="h-11 rounded-xl px-4 font-bold">
              Delete Account
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-orange-100 pt-6 dark:border-stone-700">
          <Button type="button" onClick={savePreferences} disabled={loading || saving || !user?.id} className="h-12 rounded-2xl px-8 text-xs font-bold uppercase tracking-widest">
            {saving ? 'Saving...' : 'Save Privacy'}
          </Button>
        </div>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="w-full max-w-md rounded-[2rem] border border-red-200 bg-white p-6 shadow-2xl dark:border-red-800 dark:bg-stone-900">
            {deleteStep === 1 ? (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                    <Eye className="size-6" />
                  </div>
                  <div>
                    <h2 id="delete-account-title" className="text-xl font-extrabold text-stone-900 dark:text-stone-100">Delete your account?</h2>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">Your account will be permanently deleted after 7 days. You will be logged out immediately. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={closeDeleteModal} className="h-10 px-4 font-bold">
                    Cancel
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteStep(2)} className="h-10 px-4 font-bold">
                    Continue →
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                    <Trash2 className="size-6" />
                  </div>
                  <div>
                    <h2 id="delete-account-title" className="text-xl font-extrabold text-stone-900 dark:text-stone-100">Confirm deletion</h2>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">Enter your current password to schedule account deletion.</p>
                  </div>
                </div>
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-200">Current Password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setDeleteError('');
                    }}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:ring-red-950"
                    autoFocus
                  />
                </label>
                {deleteError && (
                  <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                    {deleteError}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setDeleteStep(1)} disabled={deleting} className="h-10 px-4 font-bold">
                    ← Back
                  </Button>
                  <Button type="button" variant="destructive" onClick={confirmDeleteAccount} disabled={deleting || !currentPassword} className="h-10 px-4 font-bold">
                    {deleting ? 'Deleting...' : 'Delete My Account'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
