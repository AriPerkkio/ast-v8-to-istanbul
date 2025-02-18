import reports from "istanbul-reports";
import libReport from "istanbul-lib-report";
import { expect, test } from "vitest";
import { parseAstAsync } from "vite";

import convert from "../src/index.ts";
import { readFixture, normalizeMap } from "./utils";

test("function coverage", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture("functions");

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength: 0,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  const context = libReport.createContext({
    dir: "./coverage",
    coverageMap,
  });

  reports.create("html").execute(context);
  reports.create("json").execute(context);

  const normalized = normalizeMap(coverageMap);

  expect(normalized.files()).toMatchInlineSnapshot(`
    [
      "<process-cwd>/test/fixtures/functions/sources.ts",
    ]
  `);

  expect(normalized).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/4 (0%)",
      "lines": "0/0 (100%)",
      "statements": "0/0 (100%)",
    }
  `);
});
