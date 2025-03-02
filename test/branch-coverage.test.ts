import { expect } from "vitest";

import { test } from "./utils";

test("if-statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "6/12 (50%)",
      "functions": "3/3 (100%)",
      "lines": "8/11 (72.72%)",
      "statements": "8/11 (72.72%)",
    }
  `);

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
});
