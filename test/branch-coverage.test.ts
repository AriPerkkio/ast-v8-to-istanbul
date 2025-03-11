import { expect } from "vitest";

import { test } from "./utils";

test("if-statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "6/12 (50%)",
      "functions": "3/3 (100%)",
      "lines": "8/11 (72.72%)",
      "statements": "8/11 (72.72%)",
    }
  `);

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
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

  const mapping = {
    actual: actual.branchMap[0].locations[0].end,
    expected: expected.branchMap[0].locations[0].end,
  };

  // Istanbul's end column is not accurate, let's instead provide better ending
  expect(mapping).toMatchInlineSnapshot(`
    {
      "actual": {
        "column": 17,
        "line": 3,
      },
      "expected": {
        "column": 21,
        "line": 3,
      },
    }
  `);

  expected.branchMap[0].locations[0].end.column =
    actual.branchMap[0].locations[0].end.column;

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
});

test("logical-expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "5/8 (62.5%)",
      "functions": "1/1 (100%)",
      "lines": "5/5 (100%)",
      "statements": "5/5 (100%)",
    }
  `);

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
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

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(Object.keys(actual.b)).toEqual(Object.keys(expected.b));
});
