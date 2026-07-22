import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    tanstackStart(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
