import { normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createCoverageMap } from "istanbul-lib-coverage";
import { expect, test } from "vitest";

import convert from "../src";
import { parse } from "./utils";

test("source map is optional", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const code = `\
function covered() {
    return "covered";
}

function uncovered() {
    return "uncovered";
}

covered();
covered();
  `
    .split("\n")
    .join("\r\n");

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,

      // Captured from actual Windows machine with Node v22.13.0
      functions: [
        {
          functionName: "",
          ranges: [{ startOffset: 0, endOffset: 128, count: 1 }],
          isBlockCoverage: true,
        },
        {
          functionName: "covered",
          ranges: [{ startOffset: 0, endOffset: 46, count: 2 }],
          isBlockCoverage: true,
        },
        {
          functionName: "uncovered",
          ranges: [{ startOffset: 50, endOffset: 100, count: 0 }],
          isBlockCoverage: false,
        },
      ],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/2 (50%)",
      "lines": "3/4 (75%)",
      "statements": "3/4 (75%)",
    }
  `);

  const lineCoverage = fileCoverage.getLineCoverage();

  const lines = code.split("\r\n").map((row, index) => {
    const coverage = lineCoverage[index + 1];
    const marker = coverage != null ? `${coverage}x` : "  ";

    return `${marker} | ${row}`.trimEnd();
  });

  expect(["", ...lines, ""].join("\n")).toMatchInlineSnapshot(`
    "
       | function covered() {
    2x |     return "covered";
       | }
       |
       | function uncovered() {
    0x |     return "uncovered";
       | }
       |
    1x | covered();
    1x | covered();
       |
    "
  `);
});
