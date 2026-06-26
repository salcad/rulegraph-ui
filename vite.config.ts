import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The /api calls are proxied to the engine's web server during development, so the viewer talks to
// the live backend without cross-origin issues. If the backend is not running, the loader falls back
// to the static bundles under public/data.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
