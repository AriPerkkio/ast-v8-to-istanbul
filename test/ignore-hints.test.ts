import { EOL } from "node:os";
import { describe, expect, test } from "vitest";

import { getIgnoredLines, getIgnoreHints } from "../src/ignore-hints";

const tools = ["istanbul", "v8", "c8", "node:coverage"];

describe.each(tools)("%s ignore hints", async (_tool) => {
  // Make all ignore hints equal length so that locations match
  const tool = _tool.padEnd(15, " ");

  test("ignore next multiline comment", () => {
    const code = `\
/* ${tool} ignore next -- @preserve */
export function hello() {
  return "Hello /* looks like comment but isn't */"
}
// ignore this comment
/*

${tool}

ignore

next --
@preserve */
  `;

    expect(getIgnoreHints(code)).toStrictEqual([
      { loc: { start: 0, end: 47 }, type: "next" },
      { loc: { start: 150, end: 199 }, type: "next" },
    ]);
  });

  test("ignore next inline comment", () => {
    const code = `\
// ${tool} ignore next -- @preserve
export function hello() {
  return "Hello /* looks like comment but isn't */"
}`;

    expect(getIgnoreHints(code)).toStrictEqual([
      { loc: { start: 0, end: 44 }, type: "next" },
    ]);
  });

  test("ignore if comment", () => {
    const code = `\
// ${tool} ignore if -- @preserve
if(window) {
  something()
}
`;

    expect(getIgnoreHints(code)).toStrictEqual([
      { loc: { start: 0, end: 42 }, type: "if" },
    ]);
  });

  test("ignore else comment", () => {
    const code = `\
// ${tool} ignore else -- @preserve
if(window) {
  something()
}
`;

    expect(getIgnoreHints(code)).toStrictEqual([
      { loc: { start: 0, end: 44 }, type: "else" },
    ]);
  });

  test("ignore file comment", () => {
    const code = `\
    // No matter where it is, loc should be 0
    export const a = 1;

    /* ${tool} ignore file -- @preserve */

    // ignore this comment
    `;

    expect(getIgnoreHints(code)).toStrictEqual([
      { loc: { end: 0, start: 0 }, type: "file" },
    ]);
  });

  test("ignore start and stop", () => {
    const code = `\
export function hello1(): string {
  return "Hello1"
}

/* ${tool} ignore start */
export function hello2(): string {
  return "Hello2"
}
/* ${tool} ignore stop */

<!-- /* ${tool} ignore start */ -->
export function hello3(): string {
  return "Hello3"
}
<!-- /* ${tool} ignore stop */ -->

<SomeFrameWorkComment content="/* ${tool} ignore start */" />
export function hello4(): string {
  return "Hello4"
}
<SomeFrameWorkComment content="/* ${tool} ignore stop */" />

export function hello5(): string {
  return "Hello5"
}
`.replaceAll("\n", EOL);

    expect([...getIgnoredLines(code)]).toStrictEqual([
      5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21,
    ]);
  });
});
