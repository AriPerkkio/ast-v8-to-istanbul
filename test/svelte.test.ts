import { expect } from "vitest";

import { assertCoverage, test } from "./utils";

test("svelte if statement", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/2 (0%)",
      "functions": "0/0 (100%)",
      "lines": "0/2 (0%)",
      "statements": "0/3 (0%)",
    }
  `);

  assertCoverage(actual, expected);
});

test("svelte for loop", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/3 (0%)",
      "lines": "0/3 (0%)",
      "statements": "0/5 (0%)",
    }
  `);

  assertCoverage(actual, expected);
});
