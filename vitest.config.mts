import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Ignore generated verification snapshots and packaged copies.
    include: ["tests/**/*.test.ts"],
  },
});
