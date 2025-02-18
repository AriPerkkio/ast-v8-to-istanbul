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
    files: tsconfig.include,
    name: "recommended-imports",
    plugins: {
      import: pluginImport,
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      "import/order": ["error", { alphabetize: { order: "asc" } }],
      "unicorn/prefer-node-protocol": "error",
    },
  },
  {
    name: "disables",
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: ["test/fixtures/**/dist/**"],
  },
  eslintPluginPrettierRecommended,
]);

/** @param config {import('eslint').Linter.Config} */
function defineConfig(config) {
  return config;
}
