import { expect } from "vitest";

import { test } from "./utils";

test("variable declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "0/1 (0%)",
      "lines": "7/9 (77.77%)",
      "statements": "8/11 (72.72%)",
    }
  `);

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});
