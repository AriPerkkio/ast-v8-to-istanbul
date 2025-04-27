import { readFile } from "node:fs/promises";
import { type Profiler } from "node:inspector";
import { normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as babelParser } from "@babel/parser";
import { type EncodedSourceMap } from "@jridgewell/trace-mapping";
import { parse as acornParser } from "acorn";
import { type Node } from "estree";
import {
  createCoverageMap,
  type CoverageMap,
  type FileCoverage,
  type FileCoverageData,
} from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import { parseSync as oxcParser } from "oxc-parser";
import c from "tinyrainbow";
import { parseAstAsync as viteParser } from "vite";
import { expect } from "vitest";

export { test } from "./test";

// env variable controlled by test config. Defaults to Vite.
const PARSER = (process.env.TEST_PARSER ?? "vite") as
  | "vite"
  | "acorn"
  | "oxc-parser"
  | "babel";

export async function readFixture(filename: string) {
  const root = fileURLToPath(
    new URL(`../fixtures/${filename}`, import.meta.url),
  );

  const [transpiled, sourceMap, v8, istanbul] = await Promise.all([
    readFile(`${root}/dist/index.js`, "utf8"),
    readFile(`${root}/dist/index.js.map`, "utf8"),
    readFile(`${root}/dist/coverage.json`, "utf8"),
    readFile(`${root}/dist/coverage-istanbul.json`, "utf8"),
  ]);

  return {
    transpiled,
    sourceMap: JSON.parse(sourceMap) as EncodedSourceMap,
    coverage: JSON.parse(v8) as Profiler.ScriptCoverage[],
    istanbul: createCoverageMap(JSON.parse(istanbul)),
  };
}

export function normalizeMap(coverageMap: CoverageMap) {
  const normalized: Record<string, FileCoverageData> = {};

  for (const filename of coverageMap.files()) {
    const coverage = copy(
      coverageMap.fileCoverageFor(filename).toJSON(),
    ) as FileCoverageData;

    coverage.path = normalizeFilename(coverage.path);

    normalized[coverage.path] = coverage;
  }

  return createCoverageMap(normalized);
}

function normalizeFilename(filename: string) {
  return normalize(filename)
    .replace(normalize(process.cwd()), "<process-cwd>")
    .replace(normalize(resolve(process.cwd(), "../../")), "<project-root>");
}

export function generateReports(
  coverageMap: CoverageMap,
  dir = "./fixture-coverage",
) {
  const context = libReport.createContext({
    dir,
    coverageMap,
  });

  reports.create("html").execute(context);
  reports.create("json").execute(context);
}

export function assertCoverage(actual: FileCoverage, expected: FileCoverage) {
  try {
    expect(actual.branchMap).toMatchBranches(expected.branchMap);
    expect(actual.b, "Branches did not match").toEqual(expected.b);

    expect(actual.fnMap).toMatchFunctions(expected.fnMap);
    expect(actual.f, "Functions did not match").toEqual(expected.f);

    expect(actual.statementMap).toMatchStatements(expected.statementMap);
    expect(actual.s, "Statements did not match").toEqual(expected.s);

    expect(actual.getLineCoverage(), "Lines did not match").toEqual(
      expected.getLineCoverage(),
    );
  } catch (error) {
    Error.captureStackTrace(error as Error, assertCoverage);
    throw error;
  }
}

export async function parse(code: string): Promise<Node> {
  if (PARSER === "acorn") {
    return acornParser(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    }) as Node;
  }

  if (PARSER === "oxc-parser") {
    return oxcParser("example.js", code, { sourceType: "module" })
      .program as Node;
  }

  if (PARSER === "babel") {
    return babelParser(code, { sourceType: "module" }).program as Node;
  }

  return await viteParser(code);
}

function copy(obj: object) {
  const string = JSON.stringify(obj, (_, value) =>
    value === Infinity ? "__Infinity__" : value,
  );
  const json = JSON.parse(string, (_, value) =>
    value === "__Infinity__" ? Infinity : value,
  );

  return json;
}

export function cliCoverageReport(
  label: "v8" | "istanbul",
  map: EncodedSourceMap,
  coverage: FileCoverage,
) {
  const code = map.sourcesContent?.[0];
  const filename = map.sources[0];

  if (!code) return "Missing source code";
  if (!filename) return "Missing filename";

  const LINE_START = -1;
  const LINE_END = Infinity;

  const lines = code.split("\n");
  const coveragePerLine = new Map<
    number,
    { statements: { start: number; end: number; covered: boolean }[] }
  >(lines.map((_, line) => [1 + line, { statements: [] }]));

  for (const [index, statement] of Object.entries(coverage.statementMap)) {
    const covered = coverage.s[index] !== 0;

    for (let line = statement.start.line; line <= statement.end.line; line++) {
      const entry = coveragePerLine.get(line)!;

      const start =
        line === statement.start.line ? statement.start.column : LINE_START;
      const end = line === statement.end.line ? statement.end.column : LINE_END;

      entry.statements.push({ start, end, covered });
    }
  }

  for (const [, entry] of coveragePerLine) {
    entry.statements.sort((a, b) => {
      const diff = a.start - b.start;

      if (diff === 0) return a.end - b.end;
      return diff;
    });

    for (const [index, current] of entry.statements.entries()) {
      const next = entry.statements[1 + index];

      if (next && current.end > next.start) {
        current.end = next.start;
      }
    }
  }

  let report = c.inverse(` ${label} - ${relative(process.cwd(), filename)} \n`);

  for (const [index, line] of lines.entries()) {
    let lineCode = line;
    const entry = coveragePerLine.get(1 + index)!;

    let padding = 0;

    for (const { covered, start, end } of entry.statements) {
      const color = covered ? c.bgGreen : c.bgRed;
      const prev = lineCode.length;

      lineCode =
        lineCode.substring(padding, padding + start) +
        color(lineCode.substring(padding + start, padding + end)) +
        lineCode.substring(padding + end);

      padding += prev - lineCode.length;
    }

    report += `${(1 + index).toString().padStart(3)} | ${lineCode}\n`;
  }

  console.log(report);
}
