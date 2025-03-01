import { expect } from "vitest";

import { test } from "./utils";

test("if-statement", async ({ actual, expected, debug }) => {
  debug.generateReports = true;

  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "3/6 (50%)",
      "functions": "0/1 (0%)",
      "lines": "5/7 (71.42%)",
      "statements": "5/7 (71.42%)",
    }
  `);

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
});
