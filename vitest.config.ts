import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: "verbose",
    setupFiles: ["./test/utils/setup.ts"],
    globalSetup: ["./test/utils/global-setup.ts"],

    coverage: {
      enabled: true,
      include: ["src"],
    },
  },
});
