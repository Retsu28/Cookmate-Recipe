import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  Clock,
  Mail,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { readStoredSettings, writeStoredSettings } from '@/lib/settingsStorage';

const STORAGE_KEY = 'cookmate.notificationSettings';

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

type NotificationPreferences = {
  pushAlerts: boolean;
  emailAlerts: boolean;
  mealReminders: boolean;
  ingredientExpiry: boolean;
  recommendations: boolean;
};

const defaultNotificationPreferences: NotificationPreferences = {
  pushAlerts: true,
  emailAlerts: true,
  mealReminders: true,
  ingredientExpiry: true,
  recommendations: false,
};

const channelRows: Array<{
  id: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'pushAlerts',
    title: 'Push alerts',
    description: 'Show reminders and important updates in the app.',
    icon: Smartphone,
  },
  {
    id: 'emailAlerts',
    title: 'Email alerts',
    description: 'Send key account and planning updates to your inbox.',
    icon: Mail,
  },
];

const alertRows: Array<{
  id: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'mealReminders',
    title: 'Meal reminders',
    description: 'Get nudges before planned meals and prep windows.',
    icon: Clock,
  },
  {
    id: 'ingredientExpiry',
    title: 'Ingredient expiry',
    description: 'Receive alerts when saved ingredients are close to expiring.',
    icon: AlertTriangle,
  },
  {
    id: 'recommendations',
    title: 'Recipe recommendations',
    description: 'Hear about recipe matches based on your cooking profile.',
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

function ToggleRow({ title, description, checked, icon: Icon, onChange }: ToggleRowProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition-all ${
        checked
          ? 'border-orange-200 bg-orange-50/70'
          : 'border-stone-200 bg-white hover:border-orange-200'
      }`}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
            checked ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500'
          }`}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-extrabold text-stone-900">{title}</span>
          <span className="mt-1 block text-sm font-medium leading-relaxed text-stone-500">
            {description}
          </span>
        </span>
      </span>
      <span
        className={`mt-1 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-orange-500' : 'bg-stone-200'
        }`}
      >
        <span
          className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </motion.button>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    readStoredSettings(STORAGE_KEY, defaultNotificationPreferences)
  );

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  const togglePreference = (id: keyof NotificationPreferences) => {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
  };

  const savePreferences = () => {
    writeStoredSettings(STORAGE_KEY, preferences);
    toast.success('Notification settings saved.');
  };

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
              Notification settings
            </h1>
            <p className="mt-2 max-w-2xl text-base font-medium text-stone-500 md:text-lg">
              Configure your email and push alert preferences.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                  <BellRing className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Delivery</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Choose where CookMate can send updates.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {channelRows.map((row) => (
                  <ToggleRow
                    key={row.id}
                    title={row.title}
                    description={row.description}
                    icon={row.icon}
                    checked={preferences[row.id]}
                    onChange={() => togglePreference(row.id)}
                  />
                ))}
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
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                  <Bell className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Alert types</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Pick the updates that matter during planning and cooking.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {alertRows.map((row) => (
                  <ToggleRow
                    key={row.id}
                    title={row.title}
                    description={row.description}
                    icon={row.icon}
                    checked={preferences[row.id]}
                    onChange={() => togglePreference(row.id)}
                  />
                ))}
              </div>
            </motion.section>
          </div>

          <motion.aside
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 lg:sticky lg:top-8"
          >
            <div className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-5">
              <div className="flex size-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <BellRing className="size-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-stone-900">{enabledCount} enabled</p>
                <p className="text-sm font-medium text-stone-500">Notification preferences</p>
              </div>
            </div>

            <div className="my-5 rounded-lg bg-stone-50 p-4">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-orange-600" />
                <p className="text-sm font-medium leading-relaxed text-stone-600">
                  Critical account messages may still be sent for security and service updates.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={savePreferences}
                className="h-12 w-full rounded-lg bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
              >
                Save notifications
              </Button>
              <Link
                to="/settings"
                className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                Back to settings
              </Link>
            </div>
          </motion.aside>
        </div>
      </motion.div>
    </Layout>
  );
}
