import { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import settingsService from '@/services/settingsService';

type NotificationPreferences = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  newRecipeAlerts: boolean;
};

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  newRecipeAlerts: true,
};

const rows: Array<{
  id: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'emailNotifications',
    title: 'Email notifications',
    description: 'Receive account, planning, and cooking updates in your inbox.',
    icon: Mail,
  },
  {
    id: 'pushNotifications',
    title: 'Push notifications',
    description: 'Show timely reminders and app updates on this device.',
    icon: Smartphone,
  },
  {
    id: 'newRecipeAlerts',
    title: 'New recipe alerts',
    description: 'Hear about fresh recipe ideas that match your cooking profile.',
    icon: Sparkles,
  },
];

type ToggleRowProps = {
  title: string;
  description: string;
  checked: boolean;
  icon: LucideIcon;
  onChange: () => void;
};

function normalizePreferences(value: Record<string, unknown>): NotificationPreferences {
  return {
    emailNotifications:
      typeof value.emailNotifications === 'boolean'
        ? value.emailNotifications
        : defaultPreferences.emailNotifications,
    pushNotifications:
      typeof value.pushNotifications === 'boolean'
        ? value.pushNotifications
        : defaultPreferences.pushNotifications,
    newRecipeAlerts:
      typeof value.newRecipeAlerts === 'boolean'
        ? value.newRecipeAlerts
        : defaultPreferences.newRecipeAlerts,
  };
}

function ToggleRow({ title, description, checked, icon: Icon, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
        checked
          ? 'border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-950/20'
          : 'border-stone-200 bg-white hover:border-orange-200 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:border-orange-500/40'
      }`}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${checked ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'}`}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-extrabold text-stone-900 dark:text-stone-100">{title}</span>
          <span className="mt-1 block text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">{description}</span>
        </span>
      </span>
      <span className={`mt-1 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${checked ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'}`}>
        <span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setLoading(true);
    settingsService
      .getSettings(String(user.id), 'notifications')
      .then((value) => {
        if (!cancelled) setPreferences(normalizePreferences(value));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load notification settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const togglePreference = (id: keyof NotificationPreferences) => {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const saved = await settingsService.saveSettings(String(user.id), 'notifications', preferences);
      setPreferences(normalizePreferences(saved));
      toast.success('Notification settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Bell className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Notifications</h2>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">Manage granular notification preferences synced to your account.</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300">
          Global notifications are {user?.notifications_enabled === false ? 'disabled' : 'enabled'} for your account.
        </div>

        <div className="grid gap-3">
          {rows.map((row) => (
            <ToggleRow key={row.id} title={row.title} description={row.description} icon={row.icon} checked={preferences[row.id]} onChange={() => togglePreference(row.id)} />
          ))}
        </div>

        <div className="mt-6 flex justify-end border-t border-orange-100 pt-6 dark:border-stone-700">
          <Button type="button" onClick={savePreferences} disabled={loading || saving || !user?.id} className="h-12 rounded-2xl px-8 text-xs font-bold uppercase tracking-widest">
            {saving ? 'Saving...' : 'Save Notifications'}
          </Button>
        </div>
      </section>
    </div>
  );
}
