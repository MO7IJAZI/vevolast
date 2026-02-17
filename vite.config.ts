import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Use process.cwd() as a fallback for __dirname in CJS/ESM mixed environments
const projectRoot = process.cwd();

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "client", "src", "assets"),
    },
  },
  root: path.resolve(projectRoot, "client"),
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: ["use-sync-external-store/shim/index.js"],
  },
});
