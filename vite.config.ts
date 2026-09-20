import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // pdfjs-dist emits its worker as .mjs; include it so Sokrates PDF import works offline.
          globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2}'],
          // index.html immer frisch vom Netz, damit Updates ankommen:
          navigateFallback: '/index.html',
          // OAuth callbacks are document navigations. Never serve the offline SPA
          // shell for /api/canva/callback: Canva must reach the server to finish
          // the code exchange and send the success/error message to the popup.
          // This also keeps all other API navigation endpoints network-only.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // API-Aufrufe NIEMALS cachen:
              urlPattern: /\/api\/.*/,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                networkTimeoutSeconds: 3
              }
            },
            {
              urlPattern: ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets'
              }
            }
          ],
          cleanupOutdatedCaches: true
        },
        manifest: {
          name: 'Klassio – Digitaler Schulplaner',
          short_name: 'Klassio',
          description: 'Klassio – digitale Planung, Organisation und Dokumentation für den Schulalltag',
          lang: 'de-AT',
          start_url: '/',
          display: 'standalone',
          background_color: '#f6f8f7',
          theme_color: '#0f766e',
          icons: [
            {
              src: '/pwa-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
    },
  };
});
