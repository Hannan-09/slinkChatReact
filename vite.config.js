import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    mkcert(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg", "favicon.ico"],
      devOptions: {
        enabled: false, // Disable in development to avoid issues
      },
      manifest: {
        name: "SlinkChat",
        short_name: "SlinkChat",
        description: "Secure messaging app with end-to-end encryption",
        start_url: "/",
        display: "standalone",
        background_color: "#1a1a1a",
        theme_color: "#ff6b35",
        orientation: "portrait",
        icons: [
          {
            src: "/vite.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/vite.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    https: true,
    port: 5173,
  },
  define: {
    global: "globalThis",
  },
  build: {
    target: "es2015", // Better iOS compatibility
    minify: "terser",
    terserOptions: {
      safari10: true, // iOS Safari compatibility
    },
  },
});
