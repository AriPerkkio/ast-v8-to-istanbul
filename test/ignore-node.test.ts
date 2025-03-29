import { pathToFileURL } from "node:url";
import { parseAstAsync } from "vite";
import { expect, test } from "vitest";

import { convert } from "../src/index";

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
  sources: ["add.ts"],
  sourcesContent: [sourceCode],
  file: "/src/add.ts",
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

test("ignoreNode can ignore Vite's imports", async () => {
  const coverageMap = await convert({
    code,
    ast: parseAstAsync(code),
    coverage: { functions: [], url: pathToFileURL(sourceMap.file).href },
    sourceMap: sourceMap as any,
    ignoreNode: (node, type) => {
      return (
        type === "statement" &&
        node.type === "AwaitExpression" &&
        node.argument.type === "CallExpression" &&
        node.argument.callee.type === "Identifier" &&
        node.argument.callee.name === "__vite_ssr_import__"
      );
    },
  });

  const fileCoverage = coverageMap.fileCoverageFor(coverageMap.files()[0]);

  const lines = Object.keys(fileCoverage.getLineCoverage()).map((l) =>
    parseInt(l),
  );
  const linesToCover = sourceCode
    .split("\n")
    .filter((_, index) => lines.includes(1 + index));

  expect(linesToCover).toMatchInlineSnapshot(`
    [
      "  return a + b;",
      "  multiply(2, 3);",
      "  return "Hello world";",
    ]
  `);
});
