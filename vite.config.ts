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
        includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png'],

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
          // -------------------------------------------------------
          // App shell (HTML, JS, CSS) — precached on SW install
          // -------------------------------------------------------
          globPatterns: ['**/*.{html,js,css,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],

          // -------------------------------------------------------
          // Runtime caching
          // -------------------------------------------------------
          runtimeCaching: [
            {
              urlPattern: /\/api\//,
              handler: 'NetworkOnly',
            },
            // Images — cache-first, keep for 30 days, max 60 entries
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cookmate-images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Gemini API calls — network-only, never cache AI responses
            {
              urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\//,
              handler: 'NetworkOnly',
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Proxy API requests to the Express API server during development
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
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
