import { expect } from "vitest";

import { test } from "./utils";

test("function declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/4 (25%)",
      "lines": "1/4 (25%)",
      "statements": "1/4 (25%)",
    }
  `);

  expect(actual.fnMap).toMatchFunctions(expected.fnMap);
  expect(Object.keys(actual.f)).toEqual(Object.keys(expected.f));

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});

test("arrow function expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "4/9 (44.44%)",
      "lines": "11/14 (78.57%)",
      "statements": "11/15 (73.33%)",
    }
  `);

  expect(actual.fnMap).toMatchFunctions(expected.fnMap);
  expect(Object.keys(actual.f)).toEqual(Object.keys(expected.f));

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});

test("function expression", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "2/4 (50%)",
      "lines": "4/6 (66.66%)",
      "statements": "4/6 (66.66%)",
    }
  `);

  expect(actual.fnMap).toMatchFunctions(expected.fnMap);
  expect(Object.keys(actual.f)).toEqual(Object.keys(expected.f));

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});
