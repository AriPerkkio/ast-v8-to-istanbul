import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createCoverageMap } from "istanbul-lib-coverage";
import { expect, test } from "vitest";

import { convert } from "../src/index";
import { parse } from "./utils";

const sourceCode = `\
import { multiply } from "./multiply";

export function add(a: number, b: number) {
  return a + b;
}

export function uncovered() {
  multiply(2, 3);
  return "Hello world";
}
`;

const sourceMap = {
  version: 3,
  mappings:
    "AAAA;AAEO,SAAS,IAAI,GAAW,GAAW;AACxC,SAAO,IAAI;AACb;;AAEO,SAAS,YAAY;AAC1B,qCAAS,GAAG,CAAC;AACb,SAAO;AACT",
  names: [],
  ignoreList: [],
  sources: [resolve("add.ts")],
  sourcesContent: [sourceCode],
  file: resolve("add.ts"),
};

const code = `\
const __vite_ssr_import_0__ = await __vite_ssr_import__("/src/multiply.ts", {"importedNames":["multiply"]});
function add(a, b) {
  return a + b;
}
Object.defineProperty(__vite_ssr_exports__, "add", { enumerable: true, configurable: true, get(){ return add }});;
function uncovered() {
  (0,__vite_ssr_import_0__.multiply)(2, 3);
  return "Hello world";
}
Object.defineProperty(__vite_ssr_exports__, "uncovered", { enumerable: true, configurable: true, get(){ return uncovered }});
`;

test("ignoreSourceCode is called with each covered part", async () => {
  const parts: {
    code: string;
    type: "function" | "statement" | "branch";
    location: Record<"start" | "end", { line: number; column: number }>;
  }[] = [];

  await convert({
    code,
    ast: parse(code),
    coverage: { functions: [], url: pathToFileURL(sourceMap.file).href },
    sourceMap,
    ignoreSourceCode: (code, type, location) => {
      parts.push({ code, type, location });
    },
  });

  const formatted = parts.map(
    (part) =>
      `\n     { type: ${part.type} }\n` +
      part.code
        .split("\n")
        .map(
          (line, index) => `${(index + part.location.start.line).toString().padStart(2)} | ${line}`,
        )
        .join("\n"),
  );

  expect(formatted.join("\n")).toMatchInlineSnapshot(`
    "
         { type: statement }
     1 | import { multiply } from "./multiply";

         { type: function }
     3 | function add(a: number, b: number) {
     4 |   return a + b;
     5 | }

         { type: statement }
     4 | return a + b;

         { type: function }
     7 | function uncovered() {
     8 |   multiply(2, 3);
     9 |   return "Hello world";
    10 | }

         { type: statement }
     8 | multiply(2, 3);

         { type: statement }
     9 | return "Hello world";"
  `);
});

test("ignoreSourceCode can exclude", async () => {
  const data = await convert({
    code,
    ast: parse(code),
    coverage: { functions: [], url: pathToFileURL(sourceMap.file).href },
    sourceMap,
    ignoreSourceCode: (code, type) => {
      // Ignore import statement
      if (code.includes("import ") && code.includes(" from ") && type === "statement") {
        return true;
      }

      // Ignore "function uncovered"
      return code.includes("function uncovered() {") && type === "function";
    },
  });

  const coverageMap = createCoverageMap(data);
  const fileCoverage = coverageMap.fileCoverageFor(coverageMap.files()[0]);

  expect({ code: sourceCode, lines: fileCoverage.getLineCoverage() }).toMatchInlineSnapshot(`
    [
      "  return a + b;",
      "  multiply(2, 3);",
      "  return "Hello world";",
    ]
  `);
});
