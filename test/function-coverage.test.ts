import { expect } from "vitest";

import { test } from "./utils";

test("function declaration", async ({ actual, expected }) => {
  expect(actual).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/4 (25%)",
      "lines": "2/5 (40%)",
      "statements": "2/5 (40%)",
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
      "lines": "12/15 (80%)",
      "statements": "12/16 (75%)",
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
      "lines": "6/8 (75%)",
      "statements": "6/8 (75%)",
    }
  `);

  expect(actual.fnMap).toMatchFunctions(expected.fnMap);
  expect(Object.keys(actual.f)).toEqual(Object.keys(expected.f));

  expect(actual.statementMap).toMatchStatements(expected.statementMap);
  expect(Object.keys(actual.s)).toEqual(Object.keys(expected.s));
});
