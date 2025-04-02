import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type EncodedSourceMap } from "@jridgewell/trace-mapping";
import * as ts from "typescript";
import { parseAstAsync } from "vite";

import convert from "../dist/index.js";

type Filename = "checker.ts" | "vitest-cli-api-bundled.js";

const transformTimer = startTimer("Transforming");
const { code, map } = await transform("checker.ts");
transformTimer();

const parserTimer = startTimer("AST parsing");
const ast = await parseAstAsync(code);
parserTimer();

const coverageTimer = startTimer("Coverage remapping");
const coverage = await convert({
  code,
  ast,
  sourceMap: map,
  coverage: { url: pathToFileURL(map.file!).href, functions: [] },
});
coverageTimer();

console.log(coverage.getCoverageSummary());

async function transform(filename: Filename) {
  const directory = resolve(import.meta.dirname, "./fixtures");
  const fullPath = resolve(directory, filename);

  const transformResult = ts.transpileModule(await readFile(fullPath, "utf8"), {
    fileName: fullPath,
    compilerOptions: {
      outDir: `${directory}/dist`,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      inlineSources: true,
      sourceMap: true,
    },
  });
  const code = transformResult.outputText;
  const map = JSON.parse(
    transformResult.sourceMapText || "{}",
  ) as EncodedSourceMap;

  return { code, map };
}

function startTimer(label: string) {
  const startTime = performance.now();

  return function logTime() {
    const endTime = performance.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`${label} took ${elapsedSeconds}s`);
  };
}
