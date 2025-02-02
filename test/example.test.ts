import reports from "istanbul-reports";
import libReport from "istanbul-lib-report";
import { parseAstAsync } from "vite";

import convert from "../src/index.ts";
import { functions } from "./fixtures/functions.ts";
import { sources } from "./fixtures/sources.ts";

const WRAPPER_LENGHT = 185;

const coverageMap = await convert({
  getAst: parseAstAsync,
  code: sources.source,
  wrapperLength: WRAPPER_LENGHT,
  coverage: {
    url: "/Users/ari/Git/vitest/test/coverage-test/fixtures/src/math.ts",
    functions,
    scriptId: "1",
  },
  sourceMap: sources.sourceMap.sourcemap as any,
});

const context = libReport.createContext({
  dir: "./coverage",
  coverageMap,
});

reports.create("text").execute(context);
reports.create("html").execute(context);
reports.create("json").execute(context);
