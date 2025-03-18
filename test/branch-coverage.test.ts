import { expect } from "vitest";

import { test } from "./utils";

test("if-statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "6/12 (50%)",
      "functions": "3/3 (100%)",
      "lines": "12/16 (75%)",
      "statements": "12/16 (75%)",
    }
  `);

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(actual.b).toEqual(expected.b);
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

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(actual.b).toEqual(expected.b);
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
  expect(actual.b).toEqual(expected.b);
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
  expect(actual.b).toEqual(expected.b);
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

  expect(actual.branchMap).toMatchBranches(expected.branchMap);
  expect(actual.b).toEqual(expected.b);
});
