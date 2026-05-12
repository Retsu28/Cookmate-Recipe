import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Paintbrush, Sun, Type } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import settingsService from '@/services/settingsService';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

type AppearancePreferences = {
  theme: Theme;
  fontSize: FontSize;
};

const STORAGE_KEYS = {
  theme: 'cookmate:theme',
  fontSize: 'cookmate:fontSize',
} as const;

const DEFAULTS: AppearancePreferences = {
  theme: 'system',
  fontSize: 'medium',
};

const THEME_OPTIONS = [
  { id: 'light' as Theme, label: 'Light', icon: Sun },
  { id: 'dark' as Theme, label: 'Dark', icon: Moon },
  { id: 'system' as Theme, label: 'System', icon: Monitor },
] as const;

const FONT_SIZE_OPTIONS = [
  { id: 'small' as FontSize, label: 'Small', className: 'text-sm' },
  { id: 'medium' as FontSize, label: 'Medium', className: 'text-base' },
  { id: 'large' as FontSize, label: 'Large', className: 'text-lg' },
] as const;

function isValidTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isValidFontSize(value: unknown): value is FontSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

function getStoredPreferences(): AppearancePreferences {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const savedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize);
  
  return {
    theme: isValidTheme(savedTheme) ? savedTheme : DEFAULTS.theme,
    fontSize: isValidFontSize(savedFontSize) ? savedFontSize : DEFAULTS.fontSize,
  };
}

function applyToDOM(theme: Theme, fontSize: FontSize, setTheme: (t: string) => void) {
  setTheme(theme);
  document.documentElement.dataset.fontSize = fontSize;
  document.documentElement.setAttribute('data-font-size', fontSize);
}

function saveToStorage(prefs: AppearancePreferences) {
  localStorage.setItem(STORAGE_KEYS.theme, prefs.theme);
  localStorage.setItem(STORAGE_KEYS.fontSize, prefs.fontSize);
}

export default function AppearanceSettings() {
  const { user } = useAuth();
  const { theme: activeTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Draft = UI selection, Applied = actually active
  const [draft, setDraft] = useState<AppearancePreferences>(DEFAULTS);
  const [applied, setApplied] = useState<AppearancePreferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  // Initialize: Use live next-themes value (reflects auth-form toggle) merged with localStorage
  useEffect(() => {
    setMounted(true);
    
    // 1. The active next-themes value is the most up-to-date (auth form toggle already changed it).
    //    Fall back to localStorage if next-themes hasn't resolved yet.
    const stored = getStoredPreferences();
    const liveTheme: Theme = isValidTheme(activeTheme) ? (activeTheme as Theme) : stored.theme;
    const initial: AppearancePreferences = { theme: liveTheme, fontSize: stored.fontSize };

    // Ensure localStorage is in sync with the live value
    saveToStorage(initial);
    setDraft(initial);
    setApplied(initial);
    applyToDOM(initial.theme, initial.fontSize, setTheme);
    
    // 2. If logged in, sync with API — but local/session value wins over API
    //    to preserve the theme the user just picked on the auth form.
    if (user?.id) {
      settingsService
        .getSettings(String(user.id), 'appearance')
        .then((apiValue) => {
          const merged: AppearancePreferences = {
            // Local wins: only fall back to API if no local preference exists
            theme: initial.theme !== DEFAULTS.theme ? initial.theme : (isValidTheme(apiValue?.theme) ? apiValue.theme : initial.theme),
            fontSize: isValidFontSize(apiValue?.fontSize) ? apiValue.fontSize : initial.fontSize,
          };
          
          setDraft(merged);
          setApplied(merged);
          applyToDOM(merged.theme, merged.fontSize, setTheme);
          saveToStorage(merged);
        })
        .catch(() => {
          // Silently fail - local values are already applied
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Keep the Profile > Appearance UI in sync with theme changes coming
  // from elsewhere (e.g. the auth-form ThemeToggle). Whenever next-themes
  // reports a new active theme, mirror it into both draft and applied so
  // the selected card visually updates without showing "unsaved changes".
  useEffect(() => {
    if (!mounted) return;
    if (!isValidTheme(activeTheme)) return;
    setDraft((d) => (d.theme === activeTheme ? d : { ...d, theme: activeTheme }));
    setApplied((a) => (a.theme === activeTheme ? a : { ...a, theme: activeTheme }));
    try {
      localStorage.setItem(STORAGE_KEYS.theme, activeTheme);
    } catch {
      // ignore storage failures
    }
  }, [activeTheme, mounted]);

  const updateTheme = (theme: Theme) => setDraft((d) => ({ ...d, theme }));
  const updateFontSize = (fontSize: FontSize) => setDraft((d) => ({ ...d, fontSize }));

  // Check if there are unsaved changes
  const hasUnsavedChanges = draft.theme !== applied.theme || draft.fontSize !== applied.fontSize;

  const savePreferences = async () => {
    setSaving(true);
    try {
      // Always save to localStorage (guests and logged-in users)
      saveToStorage(draft);
      
      // If logged in, also save to API for cross-device sync
      if (user?.id) {
        await settingsService.saveSettings(String(user.id), 'appearance', draft);
      }
      
      // Apply the settings
      setApplied(draft);
      applyToDOM(draft.theme, draft.fontSize, setTheme);
      
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
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Appearance</h2>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
              {hasUnsavedChanges ? 'You have unsaved changes. Click Save to apply.' : 'Click Save Appearance to apply your changes.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Theme</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = draft.theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateTheme(option.id)}
                    className={cn(
                      'flex h-20 items-center justify-between rounded-2xl border px-4 text-left transition-all',
                      isActive
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200'
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl', isActive ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600')}>
                        <Icon className="size-5" />
                      </span>
                      <span className="text-base font-extrabold">{option.label}</span>
                    </span>
                    {isActive && <Check className="size-5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size Selection */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Font Size</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {FONT_SIZE_OPTIONS.map((option) => {
                const isActive = draft.fontSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFontSize(option.id)}
                    className={cn(
                      'flex h-20 items-center justify-between rounded-2xl border px-4 text-left transition-all',
                      isActive
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200'
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl', isActive ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600')}>
                        <Type className="size-5" />
                      </span>
                      <span className={cn('font-extrabold', option.className)}>{option.label}</span>
                    </span>
                    {isActive && <Check className="size-5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end gap-4 border-t border-orange-100 pt-6 dark:border-stone-700">
          {hasUnsavedChanges && !saving && (
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              You have unsaved changes
            </span>
          )}
          <Button 
            type="button" 
            onClick={savePreferences} 
            disabled={saving} 
            className={cn(
              'h-12 rounded-2xl px-8 text-xs font-bold uppercase tracking-widest',
              hasUnsavedChanges && !saving && 'animate-pulse'
            )}
          >
            {saving ? 'Saving...' : 'Save Appearance'}
          </Button>
        </div>
      </section>
    </div>
  );
}
