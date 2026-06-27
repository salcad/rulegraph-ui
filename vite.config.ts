import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The viewer calls /rulegraph-api/* as same-origin relative paths (see src/api.ts). In dev we proxy
// that prefix to the engine so the browser makes no cross-origin request — mirroring the nginx proxy
// used in production. Override the target with VITE_API_PROXY_TARGET if the engine runs elsewhere. If
// the backend is not running, the loader falls back to the static bundles under public/data.
const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8074";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/rulegraph-api": API_PROXY_TARGET,
    },
  },
});
