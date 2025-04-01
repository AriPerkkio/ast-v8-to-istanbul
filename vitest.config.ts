import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: "verbose",
    setupFiles: ["./test/utils/setup.ts"],
    globalSetup: ["./test/utils/global-setup.ts"],
    passWithNoTests: true,
    hideSkippedTests: true,

    coverage: {
      enabled: true,
      experimentalAstAwareRemapping: true,
      include: ["src"],
    },

    // Make sure fixtures run directly on Node
    server: {
      deps: {
        external: [/\/dist\//, /test\/istanbul-references\//],
      },
    },
  },
});
