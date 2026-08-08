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
          // index.html immer frisch vom Netz, damit Updates ankommen:
          navigateFallback: '/index.html',
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
          name: 'Lehrermappe – Digitaler Schulplaner',
          short_name: 'Lehrermappe',
          description: 'Dein digitaler Schulplaner für die Volksschule',
          lang: 'de-AT',
          start_url: '/',
          display: 'standalone',
          background_color: '#fafaf9',
          theme_color: '#10b981',
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
        '@': path.resolve(__dirname, '.'),
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
