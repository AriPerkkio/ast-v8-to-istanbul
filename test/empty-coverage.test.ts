import { normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createCoverageMap } from "istanbul-lib-coverage";
import MagicString from "magic-string";
import { expect, test } from "vitest";

import convert from "../src";
import { parse } from "./utils";

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

  const data = await convert({
    code,
    sourceMap,
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [],
    },
    ast: parse(code),
  });

  const coverage = createCoverageMap(data);
  expect(coverage.files()).toStrictEqual([filename]);

  expect(coverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/2 (0%)",
      "lines": "0/2 (0%)",
      "statements": "0/2 (0%)",
    }
  `);
});
