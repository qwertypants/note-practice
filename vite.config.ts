import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Little Frets · Guitar note practice",
        short_name: "Little Frets",
        description: "A little daily practice for reading guitar notes.",
        theme_color: "#f6f2e9",
        background_color: "#f6f2e9",
        display: "standalone",
        scope: "/note-practice/",
        start_url: "/note-practice/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"] },
});
