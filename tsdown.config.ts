import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  tsconfig: "./tsconfig.json",
  target: "esnext",
  clean: true,

  minify: {
    codegen: { removeWhitespace: false },
    compress: true,
    mangle: { keepNames: true },
  },
  outputOptions: { comments: false },

  dts: true,
  inlineOnly: ["@types/estree"],
});
