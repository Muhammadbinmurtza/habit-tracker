import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart(),
  ],
  resolve: {
    alias: { "@": "/src" },
  },
});
