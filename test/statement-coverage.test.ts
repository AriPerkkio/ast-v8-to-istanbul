import { expect } from "vitest";

import { test } from "./utils";

test("variable declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/0 (100%)",
      "lines": "4/4 (100%)",
      "statements": "4/4 (100%)",
    }
  `);

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});
