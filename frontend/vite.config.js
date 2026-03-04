import { defineConfig } from "vite";

const backendTarget = process.env.VITE_DEV_BACKEND_URL || "http://127.0.0.1:5000";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true
      }
    }
  }
});
