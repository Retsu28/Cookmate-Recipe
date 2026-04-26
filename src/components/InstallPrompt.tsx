import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'cookmate-pwa-install-dismissed';

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

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode());
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(DISMISS_KEY) === 'true';
  });

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
      window.localStorage.setItem(DISMISS_KEY, 'true');
      console.info('[PWA] CookMate was installed successfully.');
    };

    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches || isStandaloneDisplayMode());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [isDismissed]);

  const canPromptInstall = !!deferredPrompt && !isInstalled && !isDismissed;

  const dismissPrompt = () => {
    setIsDismissed(true);
    setDeferredPrompt(null);
    window.localStorage.setItem(DISMISS_KEY, 'true');
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
        window.localStorage.setItem(DISMISS_KEY, 'true');
      }
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!canPromptInstall) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[135] flex justify-center sm:inset-x-auto sm:right-4 sm:justify-end">
      <section
        aria-describedby="install-app-description"
        aria-labelledby="install-app-title"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-sm animate-soft-pop rounded-xl border border-orange-100 bg-white/95 p-4 shadow-xl shadow-orange-950/10 backdrop-blur"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Download size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900" id="install-app-title">
              Install App
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500" id="install-app-description">
              Install this app for a better experience. It will open in its own window.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                className="h-8 rounded-lg px-4"
                onClick={handleInstallClick}
              >
                Install
              </Button>
              <Button
                variant="ghost"
                className="h-8 rounded-lg px-3 text-stone-500 hover:text-stone-900"
                onClick={dismissPrompt}
              >
                Not Now
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
