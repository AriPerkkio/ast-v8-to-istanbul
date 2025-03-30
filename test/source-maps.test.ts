import { normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
    sourceMap,
    coverage: {
      url: pathToFileURL(filename).href,
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

test("map.sources can be file urls", async () => {
  const source = pathToFileURL(normalize(resolve("/some/path/to/source.ts")));
  const target = pathToFileURL(normalize(resolve("/other/path/to/target.js")));

  const s = new MagicString(`\
export function covered() {
  return "Hello world";
}
`);

  const code = s.toString();
  const sourceMap = s.generateMap({
    file: target.href,
    hires: "boundary",
  });

  sourceMap.sources = [source.href];

  const coverage = await convert({
    code,
    sourceMap,
    coverage: {
      url: target.href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 55, count: 1 }],
        },
      ],
    },
    ast: parseAstAsync(code),
  });

  const fileCoverage = coverage.fileCoverageFor(fileURLToPath(source));

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
});

test("source map is optional", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const s = new MagicString(`\
export function covered() {
  return "Hello world";
}
`);

  const code = s.toString();

  const coverage = await convert({
    code,
    sourceMap: undefined,
    ast: parseAstAsync(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
        },
      ],
    },
  });

  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
});
