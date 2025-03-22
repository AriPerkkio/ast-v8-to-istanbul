import { normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import MagicString from "magic-string";
import { parseAstAsync } from "vite";
import { expect, test } from "vitest";

import convert from "../src";

test("function not in source maps is excluded", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const code = new MagicString(`\
export function covered() {
  return "Hello world";
}

export function excluded() {
  return "Hello world";
}

export function uncovered() {
  return "Hello world";
}
`).toString();

  const sourceMap = new MagicString(`\
export function covered() {
  return "Hello world";
}





export function uncovered() {
  return "Hello world";
}
`).generateMap({ hires: "boundary", file: filename });

  const coverage = await convert({
    code,
    sourceMap: sourceMap as any,
    coverage: {
      url: pathToFileURL(filename).href,
      scriptId: "1",
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 55, count: 1 }],
        },
        {
          functionName: "excluded",
          isBlockCoverage: true,
          ranges: [{ startOffset: 57, endOffset: 111, count: 1 }],
        },
        {
          functionName: "uncovered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 113, endOffset: 169, count: 0 }],
        },
      ],
    },
    ast: parseAstAsync(code),
  });

  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/2 (50%)",
      "lines": "1/2 (50%)",
      "statements": "1/2 (50%)",
    }
  `);

  const functions = Object.values(fileCoverage.fnMap).map((fn) => fn.name);

  expect(functions).toMatchInlineSnapshot(`
    [
      "covered",
      "uncovered",
    ]
  `);

  expect(fileCoverage.getLineCoverage()).toMatchInlineSnapshot(`
    {
      "10": 0,
      "2": 1,
    }
  `);
});
