import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Pure unit tests on the data/lib layer — no React, no DB. Kept to the
    // node environment so there's no jsdom overhead.
    exclude: ["node_modules", ".next"],
  },
});
