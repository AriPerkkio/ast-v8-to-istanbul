import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("if-statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "12/22 (54.54%)",
      "functions": "4/4 (100%)",
      "lines": "23/30 (76.66%)",
      "statements": "23/30 (76.66%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("conditional expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "2/4 (50%)",
      "functions": "1/1 (100%)",
      "lines": "3/3 (100%)",
      "statements": "3/3 (100%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("logical-expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "8/13 (61.53%)",
      "functions": "1/1 (100%)",
      "lines": "8/8 (100%)",
      "statements": "9/9 (100%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("switch-case", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/5 (20%)",
      "functions": "1/1 (100%)",
      "lines": "4/7 (57.14%)",
      "statements": "4/7 (57.14%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("assignment-pattern", async ({ actual, expected }) => {
  // Uncovered branches are marked as covered due to https://github.com/nodejs/node/issues/57435
  actual.b["1"] = [0];
  actual.b["4"] = [0];

  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "3/10 (30%)",
      "functions": "1/2 (50%)",
      "lines": "6/11 (54.54%)",
      "statements": "6/11 (54.54%)",
    }
  `);

  assertCoverage(actual, expected);
});
