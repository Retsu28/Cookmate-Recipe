import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
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

function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || isTouchMac;
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
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed]);

  const showIosFallback = useMemo(
    () => !deferredPrompt && !isInstalled && !isDismissed && isIosDevice(),
    [deferredPrompt, isDismissed, isInstalled],
  );

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

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome !== 'accepted') {
      setDeferredPrompt(null);
      return;
    }

    setIsInstalled(true);
    setDeferredPrompt(null);
    window.localStorage.setItem(DISMISS_KEY, 'true');
  };

  if (!canPromptInstall && !showIosFallback) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[135] flex justify-start sm:inset-x-auto sm:left-4">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            {canPromptInstall ? <Download size={18} /> : <Share2 size={18} />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">Install CookMate</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {canPromptInstall
                ? 'Save CookMate to your device for faster access and a more app-like experience.'
                : 'On iPhone or iPad, open the Share menu and choose Add to Home Screen.'}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {canPromptInstall ? (
                <Button
                  className="h-8 rounded-full bg-stone-900 px-4 text-white hover:bg-stone-800"
                  onClick={handleInstallClick}
                >
                  Install
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="h-8 rounded-full px-3 text-stone-500 hover:text-stone-900"
                onClick={dismissPrompt}
              >
                Dismiss
              </Button>
            </div>
          </div>

          <button
            aria-label="Dismiss install prompt"
            className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            onClick={dismissPrompt}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
