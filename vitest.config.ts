import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors the "@/*" -> "./*" path alias from tsconfig.json.
// Vitest/Vite does not read tsconfig `paths` on its own; the officially
// documented fix is the `vite-tsconfig-paths` plugin, but that would add a
// second new dependency. Since this repo only has a single root-level
// alias, a plain `resolve.alias` entry does the same job with zero new
// packages.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
