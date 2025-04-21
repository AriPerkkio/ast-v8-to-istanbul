import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("vue if statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/2 (0%)",
      "functions": "0/0 (100%)",
      "lines": "0/3 (0%)",
      "statements": "0/3 (0%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("vue for loop", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/0 (100%)",
      "lines": "0/2 (0%)",
      "statements": "0/2 (0%)",
    }
  `);

  assertCoverage(actual, expected);
});
