import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type EncodedSourceMap } from "@jridgewell/trace-mapping";
import libCoverage from "istanbul-lib-coverage";
import * as ts from "typescript";
import { parseAstAsync } from "vite";
import { expect, test } from "vitest";
import type convert from "../../src";

export const e2e = test.extend<{
  fixture: Parameters<typeof convert>[0];
  report: (coverage: libCoverage.CoverageMapData) => void;
}>({
  fixture: async ({}, use) => {
    const filename = expect
      .getState()
      .currentTestName!.replace(/ /g, "-")
      .split(">-")
      .pop()!;

    const functions = await getFunctions(filename);
    const { code, map } = await transform(filename);
    const ast = await parseAstAsync(code);

    await use({
      code,
      ast,
      sourceMap: map,
      coverage: { url: pathToFileURL(map.file!).href, functions },
    });
  },
  report: async ({}, use) => {
    await use((coverage) => {
      const summary = libCoverage
        .createCoverageMap(coverage)
        .getCoverageSummary();

      console.log(summary);
    });
  },
});

async function transform(filename: string) {
  const directory = resolve(import.meta.dirname, "../fixtures/e2e");
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

async function getFunctions(filename: string) {
  if (filename !== "functions.ts") {
    return [];
  }

  return JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../fixtures", "e2e", "functions.json"),
      "utf8",
    ),
  );
}
