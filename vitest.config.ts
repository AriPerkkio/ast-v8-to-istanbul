import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/utils/setup.ts"],
    globalSetup: ["./test/utils/global-setup.ts"],
  },
});
