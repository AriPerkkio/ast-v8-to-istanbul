import { expect } from "vitest";
import { type FileCoverage } from "istanbul-lib-coverage";

import { assertCoverage, test } from "./utils";

test("function declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "2/7 (28.57%)",
      "lines": "5/11 (45.45%)",
      "statements": "5/11 (45.45%)",
    }
  `);
  expect(getNames(actual)).toMatchInlineSnapshot(`
    [
      "(anonymous_4)",
      "another",
      "another_2",
      "multiply",
      "remainder",
      "subtract",
      "sum",
    ]
  `);

  // Remap name back to duplicate to match istanbuljs before comparing matching results
  for (const index in actual.fnMap) {
    const fn = actual.fnMap[index];

    if (fn.name.startsWith("another")) {
      fn.name = "another";
    }
  }

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

  expect(getNames(actual)).toMatchInlineSnapshot(`
    [
      "(anonymous_0)",
      "(anonymous_1)",
      "(anonymous_2)",
      "(anonymous_3)",
      "(anonymous_4)",
      "(anonymous_5)",
      "(anonymous_6)",
      "(anonymous_7)",
      "(anonymous_8)",
    ]
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

  expect(getNames(actual)).toMatchInlineSnapshot(`
    [
      "(anonymous_4)",
      "multiply",
      "remainder",
      "subtract",
      "sum",
    ]
  `);

  assertCoverage(actual, expected);
});

test("class method", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "3/7 (42.85%)",
      "lines": "6/8 (75%)",
      "statements": "6/8 (75%)",
    }
  `);

  // Class and object method names should resolve instead of falling back to
  // "(anonymous_N)". See https://github.com/AriPerkkio/ast-v8-to-istanbul/issues/162
  expect(getNames(actual)).toMatchInlineSnapshot(`
    [
      "(anonymous_3)",
      "constructor",
      "constructor_2",
      "double",
      "greet",
      "uncovered",
      "unused",
    ]
  `);

  assertCoverage(actual, expected);
});

function getNames(fileCoverage: FileCoverage) {
  return Object.values(fileCoverage.fnMap)
    .map((fn) => fn.name)
    .sort();
}
