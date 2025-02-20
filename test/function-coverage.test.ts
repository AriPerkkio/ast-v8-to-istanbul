import { parseAstAsync } from "vite";
import { expect, test } from "vitest";

import convert from "../src/index";
import {
  readFixture,
  normalizeMap,
  getIstanbulInstrumented,
  generateReports,
} from "./utils";

test("function declaration", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "function-declaration",
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength: 0,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  const normalized = normalizeMap(coverageMap);
  const fileCoverage = normalized.fileCoverageFor(
    "<process-cwd>/test/fixtures/function-declaration/sources.ts",
  );

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/4 (0%)",
      "lines": "0/0 (100%)",
      "statements": "0/0 (100%)",
    }
  `);

  const istanbul = await getIstanbulInstrumented(
    transpiled,
    coverage[0].url,
    sourceMap,
  );

  const fnMap = fileCoverage.fnMap;
  const fnMapIstanbul = istanbul.fnMap;

  for (const key of ["0", "1", "2", "3"]) {
    const actual = fnMap[key];
    const expected = fnMapIstanbul[key];

    // https://github.com/istanbuljs/istanbuljs/blob/istanbul-lib-source-maps-v5.0.6/packages/istanbul-lib-source-maps/lib/get-mapping.js#L70-L77
    if (expected.loc.end.column === Infinity) {
      expected.loc.end.column = 0;
    }

    expect.soft(actual.name).toBe(expected.name);
    expect.soft(actual.decl).toEqual(expected.decl);
    expect.soft(actual.loc).toEqual(expected.loc);
  }
});

test("arrow function expression", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "arrow-function-expression",
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength: 0,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  generateReports(coverageMap);
  const normalized = normalizeMap(coverageMap);
  const fileCoverage = normalized.fileCoverageFor(
    "<process-cwd>/test/fixtures/arrow-function-expression/sources.ts",
  );

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/4 (0%)",
      "lines": "0/0 (100%)",
      "statements": "0/0 (100%)",
    }
  `);

  const istanbul = await getIstanbulInstrumented(
    transpiled,
    coverage[0].url,
    sourceMap,
  );

  const fnMap = fileCoverage.fnMap;
  const fnMapIstanbul = istanbul.fnMap;

  for (const key of ["0", "1", "2", "3"]) {
    const actual = fnMap[key];
    const expected = fnMapIstanbul[key];

    // https://github.com/istanbuljs/istanbuljs/blob/istanbul-lib-source-maps-v5.0.6/packages/istanbul-lib-source-maps/lib/get-mapping.js#L70-L77
    if (expected.loc.end.column === Infinity) {
      expected.loc.end.column = 0;
    }

    expect.soft(actual.name).toBe(expected.name);
    expect.soft(actual.loc).toEqual(expected.loc);
    expect.soft(actual.decl.start).toEqual(expected.decl.start);

    // TODO:
    // expect.soft(actual.decl.end).toEqual(expected.decl.end);
  }
});
