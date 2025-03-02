import { expect } from "vitest";

import { test } from "./utils";

test("if-statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "3/4 (75%)",
      "functions": "1/1 (100%)",
      "lines": "3/5 (60%)",
      "statements": "3/5 (60%)",
    }
  `);

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
});
