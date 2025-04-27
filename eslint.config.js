import { readFileSync } from "node:fs";
import js from "@eslint/js";
import pluginImport from "eslint-plugin-import-x";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const tsconfig = JSON.parse(readFileSync("./tsconfig.json", "utf8"));

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: tsconfig.include,
  })),
  {
    files: tsconfig.include,
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    name: "recommended-imports",
    plugins: {
      "import-x": pluginImport,
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "import-x/order": ["error", { alphabetize: { order: "asc" } }],

      "import-x/no-duplicates": ["error", { "prefer-inline": true }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
    },
  },
  {
    name: "disables",
    rules: {
      "no-empty-pattern": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    ignores: ["dist/**", ...tsconfig.exclude.map((path) => `${path}/**`)],
  },
  eslintPluginPrettierRecommended,
]);

/** @param config {import('eslint').Linter.Config} */
function defineConfig(config) {
  return config;
}
