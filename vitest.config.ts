import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "custom:transform-result",
      transform(code, id) {
        if (id.includes("?transform-result")) {
          const map = this.getCombinedSourcemap();
          map.sources = map.sources.map((source) =>
            source.replace("?transform-result", ""),
          );

          return `
            export const code = ${JSON.stringify(code)};
            export const map = ${JSON.stringify(map)};
          `;
        }
      },
    },
  ],

  test: {
    globalSetup: ["./test/utils/global-setup.ts"],

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
          name: "Public API",
          include: [],
          typecheck: {
            enabled: true,
            include: ["test/public-api.test-d.ts"],
          },
        },
      },
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
