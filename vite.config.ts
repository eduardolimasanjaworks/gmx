import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      __GMX_DEFAULT_ADMIN_EMAIL__: JSON.stringify((env.DIRECTUS_ADMIN_EMAIL || "").trim()),
      __GMX_DEFAULT_ADMIN_PASSWORD__: JSON.stringify((env.DIRECTUS_ADMIN_PASSWORD || "").trim()),
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/upload": {
          target: "http://localhost:8099",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:8099",
          changeOrigin: true,
        },
        "/create-drive-folder": {
          target: "http://localhost:8099",
          changeOrigin: true,
        },
        "/upload-to-drive": {
          target: "http://localhost:8099",
          changeOrigin: true,
        },
        "/api": {
          target: env.VITE_ERP_PUBLIC_URL || "https://gmx.sanjaworks.com",
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom'],
    },
  };
});
