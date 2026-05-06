import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",   // bind inside Docker
    port: 5173,
    strictPort: true,

    // HMR through nginx proxy
    hmr: {
      clientPort: 80,  // nginx listens on 80
    },

    // Dev proxy: /api and /media → Django (only used when running Vite directly, not through nginx)
    proxy: {
      "/api": {
        target: "http://api:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://api:8000",
        changeOrigin: true,
      },
    },
  },

  // Resolve aliases for clean imports
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@pages": "/src/pages",
      "@api": "/src/api",
      "@hooks": "/src/hooks",
      "@utils": "/src/utils",
    },
  },
});
