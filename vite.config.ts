import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Only load vars prefixed with '' (all), but only expose GEMINI_API_KEY to the client.
  // DB_* and other server-only vars are intentionally NOT forwarded to the browser bundle.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Workbox auto-generates the service worker
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        injectRegister: false,
        manifestFilename: 'manifest.json',
        // Include all built assets in the precache manifest
        includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'offline.html'],

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
              // Maskable variant — safe zone is the 512px icon itself
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB (PNG icons are ~2.9 MB)
          ...(mode === 'production' ? { importScripts: ['/planner-notification-sw.js'] } : {}),

          // -------------------------------------------------------
          // App shell — precached on SW install
          // Includes ALL JS/CSS chunks (including manualChunks) so
          // every page is accessible offline without a network fetch.
          // -------------------------------------------------------
          globPatterns: ['**/*.{html,js,css,woff,woff2,ttf,eot,ico,png,svg,webp}', 'offline.html'],

          // -------------------------------------------------------
          // SPA navigation fallback — serve index.html for any
          // route that isn't an API call or a static asset.
          // This is what makes /planner, /camera, /recipes etc.
          // work offline in both the browser tab and the installed PWA.
          // -------------------------------------------------------
          navigateFallback: 'index.html',
          navigateFallbackAllowlist: [/./], // Allow all navigation requests to fallback to index.html
          navigateFallbackDenylist: [
            /^\/api\//,          // never intercept API requests
            /^\/socket\.io\//,   // never intercept WebSocket upgrade
          ],

          // -------------------------------------------------------
          // Runtime caching
          // -------------------------------------------------------
          runtimeCaching: [
            // Public read endpoints — serve cached data offline, revalidate in background
            {
              urlPattern: /\/api\/recipes(\?.*)?$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cookmate-api-recipes',
                expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/recipes\/[^/]+(\?.*)?$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cookmate-api-recipe-detail',
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/meal-planner(\?.*)?$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cookmate-api-planner',
                expiration: { maxEntries: 50, maxAgeSeconds: 3 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/profile(\?.*)?$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cookmate-api-profile',
                expiration: { maxEntries: 20, maxAgeSeconds: 3 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/ingredients(\?.*)?$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cookmate-api-ingredients',
                expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Auth, admin, AI, mutations — always NetworkOnly (never serve stale)
            {
              urlPattern: /\/api\/(auth|admin|ml|chat|notifications|settings)\//,
              handler: 'NetworkOnly',
            },
            // Fallback: all other API calls NetworkOnly
            {
              urlPattern: /\/api\//,
              handler: 'NetworkOnly',
            },
            // Gemini AI — never cache
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\//,
              handler: 'NetworkOnly',
            },
            // Remote (cross-origin) images only — cache-first, 30 days, 150 entries
            // Local app assets (pwa icons, favicon) are covered by the precache manifest.
            {
              urlPattern: /^https:\/\/.+\.(?:png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cookmate-images',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cross-origin fonts (Google Fonts etc.) — cache-first
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cookmate-fonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 365 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cloudinary videos — CacheFirst using the same bucket the download service
            // writes to. This makes offline video playback work in GuidedCooking.
            {
              urlPattern: /^https:\/\/res\.cloudinary\.com\/.+\.mp4(\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cookmate-offline-videos',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // App shell navigation — cache index.html and serve it when offline
            // This ensures the PWA works offline even on first navigation
            {
              urlPattern: /\/$|^\/index\.html$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'cookmate-app-shell',
                expiration: { maxEntries: 1, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Offline fallback page
            {
              urlPattern: /\/offline\.html$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cookmate-offline-fallback',
                expiration: { maxEntries: 1, maxAgeSeconds: 365 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },

        devOptions: {
          enabled: true,
          type: 'module',
          suppressWarnings: true,
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // @imgly/background-removal uses WASM + Workers — exclude from dep optimizer
    optimizeDeps: {
      exclude: ['@imgly/background-removal'],
    },

    // Expose only the Gemini API key to the client bundle.
    // WARNING: this key will be visible in the compiled JS. Only use a
    // restricted/browser-safe API key here — never DB credentials.
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },

    server: {
      hmr: true,
      // Exclude mobile and api folders from file watching (prevents reload spam)
      watch: {
        ignored: ['**/mobile/**', '**/api/**'],
      },
      // Proxy API requests to the Express API server during development
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      // Emit source maps for production error tracing (can disable for smaller output)
      sourcemap: false,
      // Warn on chunks > 600 KB (default 500 KB is too strict for this app)
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Split large vendor libraries into separate cached chunks
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['motion/react', 'lucide-react'],
            'vendor-genai': ['@google/genai'],
          },
        },
      },
    },
  };
});
