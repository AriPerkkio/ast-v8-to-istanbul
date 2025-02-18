import { readFile } from "node:fs/promises";
import { Profiler } from "node:inspector";
import { normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SourceMapInput } from "@jridgewell/trace-mapping";
import {
  CoverageMap,
  createCoverageMap,
  FileCoverageData,
} from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";

export async function readFixture(filename: string) {
  const root = fileURLToPath(
    new URL(`../fixtures/${filename}`, import.meta.url),
  );

  const [transpiled, sourceMap, coverage] = await Promise.all([
    readFile(`${root}/dist/index.js`, "utf8"),
    readFile(`${root}/dist/index.js.map`, "utf8"),
    readFile(`${root}/dist/coverage.json`, "utf8"),
  ]);

  return {
    transpiled,
    sourceMap: JSON.parse(sourceMap) as SourceMapInput,
    coverage: JSON.parse(coverage) as Profiler.ScriptCoverage[],
  };
}

export function normalizeMap(coverageMap: CoverageMap) {
  const normalized = createCoverageMap();

  for (const filename of coverageMap.files()) {
    const coverage = coverageMap
      .fileCoverageFor(filename)
      .toJSON() as FileCoverageData;

    coverage.path = normalizeFilename(coverage.path);

    normalized.addFileCoverage(coverage);
  }

  return normalized;
}

function normalizeFilename(filename: string) {
  return normalize(filename)
    .replace(normalize(process.cwd()), "<process-cwd>")
    .replace(normalize(resolve(process.cwd(), "../../")), "<project-root>");
}

export function generateReports(coverageMap: CoverageMap) {
  const context = libReport.createContext({
    dir: "./coverage",
    coverageMap,
  });

  reports.create("html").execute(context);
  reports.create("json").execute(context);
}
