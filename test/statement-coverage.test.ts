import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("variable declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "0/1 (0%)",
      "lines": "7/9 (77.77%)",
      "statements": "8/11 (72.72%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("class-properties", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "0/0 (100%)",
      "lines": "4/4 (100%)",
      "statements": "4/4 (100%)",
    }
  `);

  assertCoverage(actual, expected);
});
