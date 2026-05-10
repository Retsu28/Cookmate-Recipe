import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Paintbrush, Sun, Type } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import settingsService from '@/services/settingsService';

type AppearancePreferences = {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
};

const defaultPreferences: AppearancePreferences = {
  theme: 'light',
  fontSize: 'medium',
};

const themeOptions = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

const fontSizeOptions = [
  { id: 'small', label: 'Small', className: 'text-sm' },
  { id: 'medium', label: 'Medium', className: 'text-base' },
  { id: 'large', label: 'Large', className: 'text-lg' },
] as const;

function normalizePreferences(
  value: Record<string, unknown>,
  fallback: AppearancePreferences = defaultPreferences
): AppearancePreferences {
  const theme =
    value.theme === 'light' || value.theme === 'dark' || value.theme === 'system'
      ? value.theme
      : fallback.theme;
  const fontSize =
    value.fontSize === 'small' || value.fontSize === 'medium' || value.fontSize === 'large'
      ? value.fontSize
      : fallback.fontSize;

  return { theme, fontSize };
}

function isAppearanceTheme(value: string | undefined): value is AppearancePreferences['theme'] {
  return value === 'light' || value === 'dark' || value === 'system';
}

export default function AppearanceSettings() {
  const { user } = useAuth();
  const { theme: activeTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preferences, setPreferences] = useState<AppearancePreferences>(() => ({
    theme: isAppearanceTheme(activeTheme) ? activeTheme : 'system',
    fontSize: defaultPreferences.fontSize,
  }));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setLoading(true);
    settingsService
      .getSettings(String(user.id), 'appearance')
      .then((value) => {
        if (cancelled) return;
        const fallback: AppearancePreferences = {
          theme: isAppearanceTheme(activeTheme) ? activeTheme : defaultPreferences.theme,
          fontSize: defaultPreferences.fontSize,
        };
        setPreferences(normalizePreferences(value, fallback));
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load appearance settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // activeTheme is intentionally excluded so reloads don't re-fire on theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!mounted || !loaded) return;
    setTheme(preferences.theme);
    document.documentElement.dataset.fontSize = preferences.fontSize;
    document.documentElement.setAttribute('data-font-size', preferences.fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, loaded]);

  const updateTheme = (theme: AppearancePreferences['theme']) => {
    setPreferences((current) => ({ ...current, theme }));
  };

  const updateFontSize = (fontSize: AppearancePreferences['fontSize']) => {
    setPreferences((current) => ({ ...current, fontSize }));
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const saved = await settingsService.saveSettings(String(user.id), 'appearance', preferences);
      const normalized = normalizePreferences(saved, preferences);
      setPreferences(normalized);
      setTheme(normalized.theme);
      document.documentElement.dataset.fontSize = normalized.fontSize;
      document.documentElement.setAttribute('data-font-size', normalized.fontSize);
      toast.success('Appearance settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save appearance settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Paintbrush className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Appearance</h2>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">Theme changes apply immediately and sync to your account when saved.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Theme</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = preferences.theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateTheme(option.id)}
                    className={cn(
                      'flex h-20 items-center justify-between rounded-2xl border px-4 text-left transition-all',
                      active
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200'
                    )}
                    aria-pressed={active}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl', active ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600')}>
                        <Icon className="size-5" />
                      </span>
                      <span className="text-base font-extrabold">{option.label}</span>
                    </span>
                    {active && <Check className="size-5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Font Size</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {fontSizeOptions.map((option) => {
                const active = preferences.fontSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFontSize(option.id)}
                    className={cn(
                      'flex h-20 items-center justify-between rounded-2xl border px-4 text-left transition-all',
                      active
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200'
                    )}
                    aria-pressed={active}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl', active ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600')}>
                        <Type className="size-5" />
                      </span>
                      <span className={cn('font-extrabold', option.className)}>{option.label}</span>
                    </span>
                    {active && <Check className="size-5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-orange-100 pt-6 dark:border-stone-700">
          <Button type="button" onClick={savePreferences} disabled={loading || saving || !user?.id} className="h-12 rounded-2xl px-8 text-xs font-bold uppercase tracking-widest">
            {saving ? 'Saving...' : 'Save Appearance'}
          </Button>
        </div>
      </section>
    </div>
  );
}
