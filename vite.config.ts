import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The viewer calls the engine's web API directly (cross-origin); the backend allows the dev origin
// via CORS, so no dev-server proxy is needed. The API base is configured in src/api.ts (defaults to
// http://localhost:8074, overridable with VITE_API_BASE_URL). If the backend is not running, the
// loader falls back to the static bundles under public/data.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
