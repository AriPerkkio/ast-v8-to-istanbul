import { parseAstAsync } from "vite";
import { expect, test } from "vitest";

import convert from "../src/index";
import {
  readFixture,
  normalizeMap,
  getIstanbulInstrumented,
  generateReports,
} from "./utils";

const wrapperLength = 185; // Tests are executed by Vitest in global setup

test("function declaration", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "function-declaration",
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength,
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
      "functions": "1/4 (25%)",
      "lines": "1/4 (25%)",
      "statements": "1/4 (25%)",
    }
  `);

  const istanbul = await getIstanbulInstrumented(
    transpiled,
    coverage[0].url,
    sourceMap,
  );

  expect(fileCoverage.fnMap).toMatchFunctions(istanbul.fnMap);
  expect(Object.keys(fileCoverage.f)).toEqual(Object.keys(istanbul.f));

  expect(fileCoverage.statementMap).toMatchStatements(istanbul.statementMap);
  expect(Object.keys(fileCoverage.s)).toEqual(Object.keys(istanbul.s));
});

test("arrow function expression", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "arrow-function-expression",
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  const normalized = normalizeMap(coverageMap);
  const fileCoverage = normalized.fileCoverageFor(
    "<process-cwd>/test/fixtures/arrow-function-expression/sources.ts",
  );

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/4 (25%)",
      "lines": "2/8 (25%)",
      "statements": "2/8 (25%)",
    }
  `);

  const istanbul = await getIstanbulInstrumented(
    transpiled,
    coverage[0].url,
    sourceMap,
  );

  expect(fileCoverage.fnMap).toMatchFunctions(istanbul.fnMap);
  expect(Object.keys(fileCoverage.f)).toEqual(Object.keys(istanbul.f));

  expect(fileCoverage.statementMap).toMatchStatements(istanbul.statementMap);
  expect(Object.keys(fileCoverage.s)).toEqual(Object.keys(istanbul.s));
});

test("function expression", async () => {
  const { transpiled, sourceMap, coverage } = await readFixture(
    "function-expression",
  );

  const coverageMap = await convert({
    getAst: parseAstAsync,
    code: transpiled,
    wrapperLength,
    coverage: coverage[0],
    sourceMap: sourceMap,
  });

  generateReports(coverageMap);
  const normalized = normalizeMap(coverageMap);
  const fileCoverage = normalized.fileCoverageFor(
    "<process-cwd>/test/fixtures/function-expression/sources.ts",
  );

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "2/4 (50%)",
      "lines": "4/6 (66.66%)",
      "statements": "4/6 (66.66%)",
    }
  `);

  const istanbul = await getIstanbulInstrumented(
    transpiled,
    coverage[0].url,
    sourceMap,
    true,
  );

  expect(fileCoverage.fnMap).toMatchFunctions(istanbul.fnMap);
  expect(Object.keys(fileCoverage.f)).toEqual(Object.keys(istanbul.f));

  expect(fileCoverage.statementMap).toMatchStatements(istanbul.statementMap);
  expect(Object.keys(fileCoverage.s)).toEqual(Object.keys(istanbul.s));
});
