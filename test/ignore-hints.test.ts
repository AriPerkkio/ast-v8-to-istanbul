import { expect, test } from "vitest";

import { getIgnoreHints } from "../src/ignore-hints";

test("ignore next multiline comment", () => {
  const code = `\
/* istanbul ignore next -- @preserve */
export function hello() {
  return "Hello /* looks like comment but isn't */"
}
// ignore this comment
/*

istanbul

ignore

next --
@preserve */
`;

  expect(getIgnoreHints(code)).toMatchInlineSnapshot(`
    [
      {
        "loc": {
          "end": 40,
          "start": 0,
        },
        "type": "next",
      },
      {
        "loc": {
          "end": 185,
          "start": 143,
        },
        "type": "next",
      },
    ]
  `);
});

test("ignore file comment", () => {
  const code = `\
  /* istanbul ignore file -- @preserve */

  // ignore this comment
  `;

  expect(getIgnoreHints(code)).toMatchInlineSnapshot(`
    [
      {
        "loc": {
          "end": 0,
          "start": 0,
        },
        "type": "file",
      },
    ]
  `);
});
