import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri dev server port must match src-tauri/tauri.conf.json devUrl.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**"],
    },
  },
  build: {
    target: "es2022",
  },
});
