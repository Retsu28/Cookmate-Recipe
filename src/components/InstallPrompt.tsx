import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DISMISS_UNTIL_KEY = 'cookmate-pwa-install-dismissed-until';
const INSTALLED_KEY = 'cookmate-pwa-installed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SHELLLESS_PATHS = new Set(['/onboarding', '/login', '/signup']);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return standaloneMedia || navigatorWithStandalone.standalone === true;
}

function isIOSBrowser() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isIPadOS = userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(userAgent) || isIPadOS;
}

function getStoredBoolean(key: string) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function hasActiveDismissal() {
  try {
    const dismissedUntil = Number(window.localStorage.getItem(DISMISS_UNTIL_KEY) ?? 0);

    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  } catch {
    return false;
  }
}

function storeDismissal() {
  try {
    window.localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS));
  } catch {
    // Ignore storage failures; the prompt can still be dismissed for this render.
  }
}

function storeInstalled() {
  try {
    window.localStorage.setItem(INSTALLED_KEY, 'true');
    window.localStorage.removeItem(DISMISS_UNTIL_KEY);
  } catch {
    // Ignore storage failures; installed state is also tracked in React state.
  }
}

export function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstallHelp, setShowIOSInstallHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode() || getStoredBoolean(INSTALLED_KEY));
  const [isDismissed, setIsDismissed] = useState(() => hasActiveDismissal());

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();

      if (!isStandaloneDisplayMode() && !isDismissed) {
        setDeferredPrompt(installEvent);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIOSInstallHelp(false);
      storeInstalled();
      console.info('[PWA] CookMate was installed successfully.');
    };

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches || isStandaloneDisplayMode());
    };

    const addDisplayModeListener = () => {
      if (typeof standaloneQuery.addEventListener === 'function') {
        standaloneQuery.addEventListener('change', handleDisplayModeChange);

        return () => standaloneQuery.removeEventListener('change', handleDisplayModeChange);
      }

      standaloneQuery.addListener(handleDisplayModeChange);

      return () => standaloneQuery.removeListener(handleDisplayModeChange);
    };

    setShowIOSInstallHelp(isIOSBrowser() && !isStandaloneDisplayMode());
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    const removeDisplayModeListener = addDisplayModeListener();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      removeDisplayModeListener();
    };
  }, [isDismissed]);

  const isIOSFallback = showIOSInstallHelp && !deferredPrompt;
  const canPromptInstall = (!!deferredPrompt || isIOSFallback) && !isInstalled && !isDismissed;
  const hasMobileBottomNav = !SHELLLESS_PATHS.has(location.pathname) && !location.pathname.startsWith('/admin');
  const Icon = isIOSFallback ? Share : Download;
  const title = isIOSFallback ? 'Add CookMate to Home Screen' : 'Install CookMate';
  const description = isIOSFallback
    ? 'Use the browser share menu, then choose Add to Home Screen.'
    : 'Install the web app for quick access from its own window.';

  const dismissPrompt = () => {
    setIsDismissed(true);
    setDeferredPrompt(null);
    setShowIOSInstallHelp(false);
    storeDismissal();
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.info(`[PWA] Install prompt ${choice.outcome}.`);

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        storeInstalled();
      } else {
        dismissPrompt();
      }
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!canPromptInstall) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-4 z-[135] flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end',
        hasMobileBottomNav
          ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-4'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'
      )}
    >
      <section
        aria-describedby="install-app-description"
        aria-labelledby="install-app-title"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-sm animate-soft-pop rounded-lg border border-orange-100 bg-white/95 p-4 shadow-xl shadow-orange-950/10 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 dark:shadow-black/25"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
            <Icon size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50" id="install-app-title">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-300" id="install-app-description">
              {description}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {!isIOSFallback && (
                <Button
                  className="h-8 rounded-lg px-4"
                  onClick={handleInstallClick}
                  type="button"
                >
                  Install
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-8 rounded-lg px-3 text-stone-500 hover:text-stone-900"
                onClick={dismissPrompt}
                type="button"
              >
                {isIOSFallback ? 'Got it' : 'Not Now'}
              </Button>
            </div>
          </div>

          <button
            aria-label="Not now"
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            onClick={dismissPrompt}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
