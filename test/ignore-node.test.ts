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
  const data = await convert({
    code,
    ast: parse(code),
    coverage: { functions: [], url: pathToFileURL(sourceMap.file).href },
    sourceMap,
    ignoreNode: (node, type) => {
      return (
        type === "statement" &&
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        node.id.name.startsWith("__vite_ssr_import_")
      );
    },
  });

  const coverageMap = createCoverageMap(data);
  const fileCoverage = coverageMap.fileCoverageFor(coverageMap.files()[0]);

  expect({ code: sourceCode, lines: fileCoverage.getLineCoverage() })
    .toMatchInlineSnapshot(`
    [
      "  return a + b;",
      "  multiply(2, 3);",
      "  return "Hello world";",
    ]
  `);
});

test("ignoreNode can ignore nested nodes", async () => {
  const code = `\
    function firstFn() {
      if ("first branch") {
        // if + implicit else
      }
      if ("second branch") {
        // if + implicit else
      }
    }

    // This should be ignored
    if (import.meta.vitest) {
      function secondFn() {
        if ("third branch") {
          // if + implicit else
        }
      }
    }
  `;

  const data = await convert({
    code,
    ast: parse(code),
    coverage: { functions: [], url: import.meta.url },
    sourceMap: undefined,
    ignoreNode: (node, type) => {
      if (
        (type === "branch" || type === "statement") &&
        node.type === "IfStatement" &&
        node.test.type === "MemberExpression" &&
        node.test.object.type === "MetaProperty" &&
        node.test.property.type === "Identifier" &&
        node.test.object.meta.name === "import" &&
        node.test.object.property.name === "meta" &&
        node.test.property.name === "vitest"
      ) {
        return "ignore-this-and-nested-nodes";
      }
    },
  });

  const coverageMap = createCoverageMap(data);
  const fileCoverage = coverageMap.fileCoverageFor(coverageMap.files()[0]);

  const functions = Object.values(fileCoverage.fnMap).map((fn) => fn.name);
  expect(functions).toMatchInlineSnapshot(`
    [
      "firstFn",
    ]
  `);

  expect({ code, lines: fileCoverage.getLineCoverage() })
    .toMatchInlineSnapshot(`
    [
      "      if ("first branch") {",
      "      if ("second branch") {",
    ]
  `);

  expect(fileCoverage.getBranchCoverageByLine()).keys("2", "5");
});
