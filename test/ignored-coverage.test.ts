import { describe, expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("ignore file", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`{}`);

  expect(actual).toEqual(expected);
});

test("ignore next", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/2 (50%)",
      "functions": "2/3 (66.66%)",
      "lines": "6/8 (75%)",
      "statements": "6/8 (75%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("ignore if else", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "2/2 (100%)",
      "functions": "2/2 (100%)",
      "lines": "11/11 (100%)",
      "statements": "13/13 (100%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("ignore try catch", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "2/2 (100%)",
      "lines": "7/8 (87.5%)",
      "statements": "7/8 (87.5%)",
    }
  `);

  assertCoverage(actual, expected);
});

describe("class methods", () => {
  test.scoped({ ignoreClassMethods: ["excluded"] });

  test("ignore class methods", async ({ actual, expected }) => {
    expect(actual).toMatchInlineSnapshot(`
      {
        "branches": "0/0 (100%)",
        "functions": "3/4 (75%)",
        "lines": "8/9 (88.88%)",
        "statements": "8/9 (88.88%)",
      }
    `);

    assertCoverage(actual, expected);
  });
});
