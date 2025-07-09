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

test("continue break statements", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "6/8 (75%)",
      "functions": "0/0 (100%)",
      "lines": "9/11 (81.81%)",
      "statements": "9/11 (81.81%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("debugger", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "1/1 (100%)",
      "lines": "2/4 (50%)",
      "statements": "2/4 (50%)",
    }
  `);

  assertCoverage(actual, expected);
});
