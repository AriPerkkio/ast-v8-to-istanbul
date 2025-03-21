import { describe, expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("ignore file", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`{}`);

  expect(actual).toEqual(expected);
});

test("ignore next", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/2 (50%)",
      "lines": "3/4 (75%)",
      "statements": "3/4 (75%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("ignore if else", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "1/1 (100%)",
      "functions": "1/1 (100%)",
      "lines": "6/6 (100%)",
      "statements": "6/6 (100%)",
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
