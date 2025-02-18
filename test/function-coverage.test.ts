import { expect, test } from "vitest";
import { parseAstAsync } from "vite";

import convert from "../src/index.ts";
import { readFixture, normalizeMap } from "./utils";

test("function coverage", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "function-declaration"
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength: 0,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  const normalized = normalizeMap(coverageMap);

  expect(normalized.files()).toMatchInlineSnapshot(`
    [
      "<process-cwd>/test/fixtures/function-declaration/sources.ts",
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
