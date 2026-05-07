import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const AUTH_PATHS = new Set(['/login', '/signup']);

function isLocalhost() {
  const { hostname } = window.location;

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isAuthPath() {
  return AUTH_PATHS.has(window.location.pathname);
}

function canRegisterServiceWorker() {
  return (
    !isAuthPath() &&
    'serviceWorker' in navigator &&
    (window.location.protocol === 'https:' || isLocalhost())
  );
}

export function registerServiceWorker() {
  if (!canRegisterServiceWorker()) {
    console.info('[PWA] Service worker registration skipped. Use HTTPS or localhost.');
    return;
  }

  const register = () => {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, registration) {
        if (!registration) {
          return;
        }

        console.info(`[PWA] Service worker registered: ${swUrl}`);

        window.setInterval(() => {
          if (document.visibilityState === 'visible' && !isAuthPath()) {
            registration.update().catch((error) => {
              console.warn('[PWA] Service worker update check failed.', error);
            });
          }
        }, UPDATE_CHECK_INTERVAL_MS);
      },
      onRegisterError(error) {
        console.error('[PWA] Service worker registration failed.', error);
      },
      onOfflineReady() {
        console.info('[PWA] CookMate is ready for offline app shell access.');
      },
    });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }

  window.addEventListener('load', register, { once: true });
}
