import { useState } from 'react';
import { Bell, ChefHat, Heart, Info, LogOut, PackageOpen, Paintbrush, Shield, User, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { SettingsPageSkeleton } from '@/components/SkeletonScreen';
import AccountSettings from '@/components/settings/AccountSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import PrivacySettings from '@/components/settings/PrivacySettings';
import SavedRecipesSettings from '@/components/settings/SavedRecipesSettings';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';
import { cn } from '@/lib/utils';

type SettingsTabId = 'account' | 'saved-recipes' | 'notifications' | 'appearance' | 'privacy' | 'inventory' | 'about';

type SettingsTab = {
  id: SettingsTabId;
  label: string;
  mobileLabel?: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
};

const tabs: SettingsTab[] = [
  {
    id: 'account',
    label: 'Account',
    description: 'Profile, email, password, and avatar',
    icon: User,
  },
  {
    id: 'saved-recipes',
    label: 'My Saved Recipes',
    mobileLabel: 'Saved',
    description: 'Your favorite and bookmarked recipes',
    icon: Heart,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email, push, digest, and recipe alerts',
    icon: Bell,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme and reading preferences',
    icon: Paintbrush,
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    mobileLabel: 'Privacy',
    description: 'Visibility and account safety',
    icon: Shield,
  },
  {
    id: 'inventory',
    label: 'Kitchen Inventory',
    mobileLabel: 'Inventory',
    description: 'Ingredient tracking tools',
    icon: PackageOpen,
    disabled: true,
    badge: 'Coming Soon',
  },
  {
    id: 'about',
    label: 'About CookMate',
    mobileLabel: 'About',
    description: 'Version, features, and contact',
    icon: Info,
  },
];

function renderTabContent(activeTab: SettingsTabId, navigate: ReturnType<typeof useNavigate>) {
  if (activeTab === 'about') { navigate('/about'); return null; }
  if (activeTab === 'account') return <AccountSettings />;
  if (activeTab === 'saved-recipes') return <SavedRecipesSettings />;
  if (activeTab === 'notifications') return <NotificationSettings />;
  if (activeTab === 'appearance') return <AppearanceSettings />;
  if (activeTab === 'privacy') return <PrivacySettings />;

  return (
    <div className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white p-8 text-center shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
      <div>
        <PackageOpen className="mx-auto mb-4 size-12 text-orange-500" />
        <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Kitchen Inventory — coming soon</h2>
        <p className="mt-2 max-w-md text-sm font-medium text-stone-500 dark:text-stone-400">Inventory management will be added in a later phase.</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const isInitialLoading = useInitialContentLoading();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('account');
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  if (isInitialLoading) {
    return (
      <Layout>
        <SettingsPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              <ChefHat size={14} />
              CookMate Preferences
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl md:text-5xl">Profile & Settings</h1>
            <p className="mt-2 text-sm font-medium text-stone-500 dark:text-stone-400 sm:text-base md:text-lg">Manage your account and cooking app preferences in one place.</p>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-16 lg:h-fit">
            {/* Mobile: scrollable icon+label pill row */}
            <div className="lg:hidden">
              <div className="relative">
                <div
                  className="flex gap-1.5 overflow-x-auto rounded-[2rem] border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100/50 scrollbar-hide snap-x snap-mandatory dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
                  aria-label="Settings sections"
                >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const shortLabel = tab.mobileLabel || tab.label;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={tab.disabled}
                      onClick={() => { if (!tab.disabled) setActiveTab(tab.id); }}
                      className={cn(
                        'relative flex min-w-[80px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-center transition-colors',
                        active && !tab.disabled
                          ? 'text-white'
                          : 'text-stone-600 hover:bg-orange-50 hover:text-orange-700 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-orange-400',
                        tab.disabled && 'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-stone-600 dark:hover:bg-transparent dark:hover:text-stone-300'
                      )}
                      aria-current={active ? 'page' : undefined}
                      title={tab.label}
                    >
                      {active && !tab.disabled && (
                        <motion.div
                          layoutId="activeSettingsMobileTab"
                          className="absolute inset-0 z-0 rounded-2xl orange-gradient shadow-lg shadow-orange-500/20"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon size={20} className="relative z-10 shrink-0" />
                      <span className="relative z-10 whitespace-nowrap text-[11px] font-extrabold leading-tight">{shortLabel}</span>
                    </button>
                  );
                })}
                </div>
                {/* Right-edge fade hint that more tabs exist */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[2rem] bg-gradient-to-l from-white via-white/80 to-transparent dark:from-stone-800 dark:via-stone-800/80"
                />
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-extrabold text-red-600 shadow-sm transition-all hover:bg-red-50 dark:border-red-950/30 dark:bg-stone-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut size={18} className="shrink-0" />
                <span>Sign out</span>
              </button>
            </div>

            {/* Desktop: full vertical sidebar */}
            <nav className="hidden rounded-[2rem] border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none lg:flex lg:flex-col" aria-label="Settings sections">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={tab.disabled}
                    onClick={() => { if (!tab.disabled) setActiveTab(tab.id); }}
                    className={cn(
                      'relative flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors',
                      active && !tab.disabled
                        ? 'text-white'
                        : 'text-stone-600 hover:bg-orange-50 hover:text-orange-700 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-orange-400',
                      tab.disabled && 'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-stone-600 dark:hover:bg-transparent dark:hover:text-stone-300'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && !tab.disabled && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className="absolute inset-0 z-0 rounded-2xl orange-gradient shadow-lg shadow-orange-500/20"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon size={20} className="relative z-10 shrink-0" />
                    <span className="relative z-10 min-w-0 flex-1">
                      <span className="block text-sm font-extrabold">{tab.label}</span>
                      <span className={cn('mt-0.5 block text-[11px] font-semibold leading-snug', active && !tab.disabled ? 'text-white/80' : 'text-stone-400 dark:text-stone-500')}>{tab.description}</span>
                    </span>
                    {tab.badge && (
                      <span className="relative z-10 shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="mt-3 border-t border-orange-100 pt-3 dark:border-stone-700">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-extrabold text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <LogOut size={20} className="shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </nav>
          </aside>

          <section aria-live="polite" className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderTabContent(activeTab, navigate)}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </div>
    </Layout>
  );
}
