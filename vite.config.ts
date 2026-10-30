import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5174, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'apple-touch-icon.png'],
      workbox: { globIgnores: ['**/push/**'] },
      manifest: {
        name: '3zab ♡ Nouna Sanctuary',
        short_name: 'Sanctuary',
        description: 'Our private digital world',
        theme_color: '#f9f9f9',
        background_color: '#ffffff',
        display: 'standalone',
        id: '/', start_url: '/', scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
