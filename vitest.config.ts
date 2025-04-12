import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/utils/global-setup.ts"],
    passWithNoTests: true,
    hideSkippedTests: true,

    coverage: {
      enabled: true,
      include: ["src"],
    },

    // Make sure fixtures run directly on Node
    server: {
      deps: {
        external: [/\/dist\//, /test\/istanbul-references\//],
      },
    },

    workspace: [
      {
        test: {
          name: "vite/parseAstAsync",
          env: { TEST_PARSER: "vite" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: "acorn",
          env: { TEST_PARSER: "acorn" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: "oxc-parser",
          env: { TEST_PARSER: "oxc-parser" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: "babel",
          env: { TEST_PARSER: "babel" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
    ],
  },
});
