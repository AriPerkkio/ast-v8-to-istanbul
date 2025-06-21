import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    vue(),
    svelte(),
    {
      name: "custom:transform-result",
      transform(code, id) {
        if (id.includes("?transform-result")) {
          const map = this.getCombinedSourcemap();
          map.sources = [id.replace("?transform-result", "")];

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

    projects: [
      {
        test: {
          name: { label: "Public API", color: "green" },
          include: [],
          typecheck: {
            enabled: true,
            include: ["test/public-api.test-d.ts"],
          },
        },
      },
      {
        test: {
          name: { label: "vite/parseAstAsync", color: "red" },
          env: { TEST_PARSER: "vite" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: { label: "acorn", color: "blue" },
          env: { TEST_PARSER: "acorn" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: { label: "oxc-parser", color: "yellow" },
          env: { TEST_PARSER: "oxc-parser" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
      {
        test: {
          name: { label: "babel", color: "cyan" },
          env: { TEST_PARSER: "babel" },
          setupFiles: ["./test/utils/setup.ts"],
        },
      },
    ],
  },
});
