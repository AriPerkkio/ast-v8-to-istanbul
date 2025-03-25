import { normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import MagicString from "magic-string";
import { parseAstAsync } from "vite";
import { expect, test } from "vitest";

import convert from "../src";

test("generates empty coverage for non-executed file", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const s = new MagicString(`\
export function first() {
  return "Hello world";
}

export function second() {
  return "Hello world";
}
`);
  const code = s.toString();
  const sourceMap = s.generateMap({ hires: "boundary", file: filename });

  const coverage = await convert({
    code,
    sourceMap: sourceMap as any,
    coverage: {
      url: pathToFileURL(filename).href,
      scriptId: "1",
      functions: [],
    },
    ast: parseAstAsync(code),
  });

  expect(coverage.files()).toMatchInlineSnapshot(`
    [
      "/some/file.ts",
    ]
  `);

  expect(coverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/2 (0%)",
      "lines": "0/2 (0%)",
      "statements": "0/2 (0%)",
    }
  `);
});
