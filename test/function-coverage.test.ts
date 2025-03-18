import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("function declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/4 (25%)",
      "lines": "2/5 (40%)",
      "statements": "2/5 (40%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("arrow function expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "4/9 (44.44%)",
      "lines": "12/15 (80%)",
      "statements": "12/16 (75%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("function expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "3/5 (60%)",
      "lines": "7/9 (77.77%)",
      "statements": "9/11 (81.81%)",
    }
  `);

  assertCoverage(actual, expected);
});
