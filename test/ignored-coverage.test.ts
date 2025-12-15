import { describe, expect, vi } from "vitest";

import { assertCoverage, test } from "./utils";

vi.mock(import("node:os"), async (importOg) => ({
  ...(await importOg()),
  EOL: "\n",
}));

test("ignore file", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`{}`);

  expect(actual).toEqual(expected);
});

test("ignore next", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "3/4 (75%)",
      "functions": "4/5 (80%)",
      "lines": "11/13 (84.61%)",
      "statements": "11/13 (84.61%)",
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

test("ignore start stop", async ({ actual, __fixture }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/2 (50%)",
      "lines": "3/4 (75%)",
      "statements": "3/4 (75%)",
    }
  `);

  expect({ code: __fixture.sources, lines: actual.getLineCoverage() })
    .toMatchInlineSnapshot(`
    [
      "  return "uncovered";",
      "  return "covered";",
      "covered();",
      "covered2();",
    ]
  `);
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
