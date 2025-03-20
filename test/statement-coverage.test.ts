import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("variable declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "0/1 (0%)",
      "lines": "8/10 (80%)",
      "statements": "9/12 (75%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("class-properties", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "0/0 (100%)",
      "lines": "3/3 (100%)",
      "statements": "3/3 (100%)",
    }
  `);

  assertCoverage(actual, expected);
});
