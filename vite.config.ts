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
    alias: [
      {
        find: "@hookform/resolvers/zod",
        replacement: path.resolve(
          projectRoot,
          "node_modules",
          "@hookform",
          "resolvers",
          "zod",
          "dist",
          "zod.module.js"
        ),
      },
      {
        find: "@hookform/resolvers",
        replacement: path.resolve(
          projectRoot,
          "node_modules",
          "@hookform",
          "resolvers",
          "dist",
          "resolvers.module.js"
        ),
      },
      {
        find: "react-hook-form",
        replacement: path.resolve(
          projectRoot,
          "node_modules",
          "react-hook-form",
          "dist",
          "index.cjs.js"
        ),
      },
      { find: "@assets", replacement: path.resolve(projectRoot, "client", "src", "assets") },
      { find: "@shared", replacement: path.resolve(projectRoot, "shared") },
      { find: "@", replacement: path.resolve(projectRoot, "client", "src") },
    ],
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
