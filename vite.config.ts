import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/checklist-map/',
  plugins: [
    VitePWA({
      filename: 'service-worker.js',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-192-maskable.png',
        'icon-512-maskable.png',
      ],
      manifest: {
        name: 'Checklist Map',
        short_name: 'Checklist',
        description: 'A home inventory walkthrough and shopping-list app.',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/checklist-map/',
        icons: [
          {
            src: '/checklist-map/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/checklist-map/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/checklist-map/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/checklist-map/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
