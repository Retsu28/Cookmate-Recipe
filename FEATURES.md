# CookMate — Feature Documentation

---

## 1. JSON Integration

### Code Snippet

**Backend — Express JSON middleware & JSON responses** (`api/src/server.js`)

```js
app.use(express.json({ limit: '15mb' }));
```

**Backend — Controller returning JSON** (`api/src/controllers/recipeController.js`)

```js
exports.getAll = async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    // ... query building ...

    const total = parseInt(countResult.rows[0].count);
    res.json({ recipes: result.rows, total, limit, offset });
  } catch (err) {
    console.error('[recipes/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch recipes.' });
  }
};
```

**Frontend — Centralized API client** (`src/services/api.ts`)

```ts
async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Auto-set JSON content type for requests with bodies
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return undefined as unknown as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch { /* non-JSON response */ }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  get:    <T>(endpoint: string, headers?: Record<string, string>) =>
            request<T>(endpoint, { method: 'GET', headers }),
  post:   <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers }),
  put:    <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, headers }),
  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
            request<T>(endpoint, { method: 'DELETE', headers }),
  patch:  <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, headers }),
};
```

**Error handler returning JSON** (`api/src/middleware/errorHandler.js`)

```js
function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body.' });
  }
  const status  = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}
```

### Explanation

JSON (JavaScript Object Notation) is the data-interchange format used for **all** communication between the CookMate frontend and backend. The Express server parses incoming JSON request bodies via `express.json()` and every API endpoint responds with structured JSON objects (e.g., `{ recipes, total, limit, offset }` for listings, `{ token, user }` for authentication, `{ error }` for errors). On the client side, a centralized `api` helper automatically sets the `Content-Type: application/json` header on outgoing requests and parses JSON from every response.

### Where & How It Is Applied

| Layer | File(s) | How |
|---|---|---|
| **Backend middleware** | `api/src/server.js` | `express.json({ limit: '15mb' })` parses every incoming JSON body globally, with a 15 MB limit to support base64 image uploads. |
| **API controllers** | `api/src/controllers/recipeController.js`, `authController.js`, `mlController.js`, etc. | Every controller action reads `req.body` (parsed JSON) and calls `res.json(...)` to return structured JSON responses. |
| **Error handling** | `api/src/middleware/errorHandler.js` | Catches malformed JSON (`SyntaxError`), oversized payloads, and server errors — all returned as `{ error: "..." }` JSON. |
| **Web frontend** | `src/services/api.ts` | A thin `fetch` wrapper that auto-attaches `Content-Type: application/json`, serialises bodies with `JSON.stringify()`, and deserialises responses with `res.json()`. |
| **Mobile frontend** | `mobile/src/api/api.js` | Mirrors the web client — sends JSON bodies and parses JSON responses for all Expo mobile API calls. |

---

## 2. Service Worker

### Code Snippet

**Registration module** (`src/pwa/registerServiceWorker.ts`)

```ts
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function isLocalhost() {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function canRegisterServiceWorker() {
  return 'serviceWorker' in navigator && (window.location.protocol === 'https:' || isLocalhost());
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
        if (!registration) return;
        console.info(`[PWA] Service worker registered: ${swUrl}`);

        window.setInterval(() => {
          if (document.visibilityState === 'visible') {
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
```

**Workbox configuration inside Vite** (`vite.config.ts`)

```ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'autoUpdate',
  injectRegister: false,
  manifestFilename: 'manifest.json',
  includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png'],

  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{html,js,css,woff2}'],
    navigateFallbackDenylist: [/^\/api\//],

    runtimeCaching: [
      { urlPattern: /\/api\//, handler: 'NetworkOnly' },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cookmate-images',
          expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\//,
        handler: 'NetworkOnly',
      },
    ],
  },

  devOptions: { enabled: false },
}),
```

**Called at app startup** (`src/main.tsx`)

```tsx
import { registerServiceWorker } from './pwa/registerServiceWorker';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);

registerServiceWorker();
```

### Explanation

A Service Worker is a background script that the browser runs separately from the web page, enabling features like offline caching, asset pre-caching, and background updates. CookMate uses the **Workbox**-powered `vite-plugin-pwa` to auto-generate a service worker at build time (`strategies: 'generateSW'`). The generated worker **precaches** the entire app shell (HTML, JS, CSS, fonts) so the UI loads instantly on repeat visits, uses a **CacheFirst** strategy for images (up to 60 entries, 30-day expiry), and a **NetworkOnly** strategy for `/api/` calls and Gemini AI requests so data is always fresh. A custom registration module checks for HTTPS/localhost, registers immediately, and polls for updates every hour.

### Where & How It Is Applied

| Layer | File(s) | How |
|---|---|---|
| **Build-time generation** | `vite.config.ts` → `VitePWA()` plugin | Workbox auto-generates `sw.js` during `vite build`, precaching all HTML/JS/CSS/WOFF2 assets listed by `globPatterns`. |
| **Runtime registration** | `src/pwa/registerServiceWorker.ts` | Registers the generated SW on page load, enables auto-update checking every hour, and logs offline-readiness. |
| **App entry point** | `src/main.tsx` | Calls `registerServiceWorker()` after React renders so it does not block the initial paint. |
| **Caching strategies** | Workbox config in `vite.config.ts` | **CacheFirst** for images, **NetworkOnly** for API and AI calls, **precache** for app shell — ensuring fast loads without serving stale data. |
| **Navigation fallback** | `navigateFallbackDenylist: [/^\/api\//]` | All client-side routes fall back to `index.html` (SPA), while `/api/*` requests are never intercepted. |

---

## 3. Web App Manifest

### Code Snippet

**Manifest defined in Vite config** (`vite.config.ts`)

```ts
manifest: {
  id: '/',
  name: 'CookMate',
  short_name: 'CookMate',
  description: 'Your AI-powered recipe and meal planning assistant.',
  theme_color: '#f97316',
  background_color: '#fff8f1',
  display: 'standalone',
  scope: '/',
  start_url: '/',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
},
```

**Linked in HTML** (`index.html`)

```html
<!-- PWA: theme color for browser chrome and Android -->
<meta name="theme-color" content="#f97316" />
<!-- PWA: Apple home screen support -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="CookMate" />
<link rel="apple-touch-icon" href="/pwa-192x192.png" />
<!-- PWA: /manifest.json is generated and linked by vite-plugin-pwa -->
<link rel="manifest" href="/manifest.json">
```

### Explanation

The Web App Manifest is a JSON file (`manifest.json`) that tells the browser how the application should behave when installed on a user's device. It defines the app's name, icons, theme colors, display mode, and start URL. When present, it enables the **"Add to Home Screen"** / **"Install App"** prompt on supported browsers, allowing CookMate to run in a standalone window without browser chrome — giving it a native-app feel. The manifest is auto-generated at build time by `vite-plugin-pwa` from the configuration in `vite.config.ts` and linked via `<link rel="manifest">` in the HTML.

### Where & How It Is Applied

| Layer | File(s) | How |
|---|---|---|
| **Manifest source** | `vite.config.ts` → `manifest` object inside `VitePWA()` | Defines `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `start_url`, `orientation`, and icon entries. Build outputs `/manifest.json`. |
| **HTML link** | `index.html` | `<link rel="manifest" href="/manifest.json">` tells browsers where to find the manifest. Complementary `<meta>` tags provide Apple-specific home screen support. |
| **Icons** | `public/pwa-192x192.png`, `public/pwa-512x512.png` | Two icon sizes are provided: 192×192 for home-screen shortcuts and 512×512 for splash screens. The 512 px icon is also declared as `maskable` for adaptive icon rendering on Android. |
| **Theme color** | `index.html` + manifest | `#f97316` (CookMate orange) colours the browser address bar on Android and the title bar on desktop PWA windows. |
| **Display mode** | `display: 'standalone'` in manifest | Launches the installed app without the browser URL bar, making it look and feel like a native application. |
| **Build tooling** | `vite-plugin-pwa` (in `package.json` devDependencies) | The plugin reads the manifest config, writes `manifest.json` to the build output, and coordinates with the service worker for a complete PWA setup. |
