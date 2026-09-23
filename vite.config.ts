import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// The Manus editor runtime and the jsx source-location tagger are
// development-only tools. In a production build they add a large
// inert runtime to index.html and stamp source paths into the bundle, so they
// are only included when Vite runs the dev server (command === "serve").
export default defineConfig(({ command }) => {
  const isDevServer = command === "serve";
  const plugins = [
    react(),
    tailwindcss(),
    ...(isDevServer ? [jsxLocPlugin(), vitePluginManusRuntime()] : []),
  ];

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Keep stable, reusable browser libraries separate from application
          // screens. This improves first-load parsing on the kiosk and lets
          // returning visitors reuse cached code after routine content updates.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-vendor";
            }
            if (
              id.includes("node_modules/@trpc/") ||
              id.includes("node_modules/@tanstack/") ||
              id.includes("node_modules/superjson/")
            ) {
              return "data-vendor";
            }
            if (id.includes("node_modules/@radix-ui/")) {
              return "ui-vendor";
            }
            if (id.includes("node_modules/lucide-react/")) {
              return "icons";
            }
          },
        },
      },
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
