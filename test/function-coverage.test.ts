import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("function declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/5 (20%)",
      "lines": "2/6 (33.33%)",
      "statements": "2/6 (33.33%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("arrow function expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "4/9 (44.44%)",
      "lines": "11/15 (73.33%)",
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
      "lines": "6/8 (75%)",
      "statements": "10/12 (83.33%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("class method", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "2/4 (50%)",
      "lines": "5/7 (71.42%)",
      "statements": "5/7 (71.42%)",
    }
  `);

  assertCoverage(actual, expected);

  // Class and object method names should resolve instead of falling back to
  // "(anonymous_N)". See https://github.com/AriPerkkio/ast-v8-to-istanbul/issues/162
  const names = Object.values(actual.fnMap)
    .map((fn) => fn.name)
    .sort();

  expect(names).toMatchInlineSnapshot(`
    [
      "double",
      "greet",
      "uncovered",
      "unused",
    ]
  `);
});
