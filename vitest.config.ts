import { fileURLToPath } from "node:url";
import { defaultExclude, defineConfig } from "vitest/config";

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
  test: {
    // Vitest's default `include` matches *.spec.ts as well as *.test.ts, which would
    // sweep up the Playwright specs in e2e/ and try to run them in the node pool.
    // They need a browser and a server, so keep them to `npm run e2e`.
    exclude: [...defaultExclude, "e2e/**"],
    // Sets IRON_SESSION_PASSWORD before any module is imported. lib/auth/session.ts
    // reads it at module load, so a test-file assignment would be too late.
    setupFiles: ["./test/setup.ts"],
  },
});
