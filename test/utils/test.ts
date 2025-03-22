import { join } from "node:path";
import { createCoverageMap, type FileCoverage } from "istanbul-lib-coverage";
import libSourceMaps from "istanbul-lib-source-maps";
import { parseAstAsync } from "vite";
import { expect, test as base } from "vitest";

import convert from "../../src/index";
import { readFixture, normalizeMap, generateReports } from "./index";

export const test = base.extend<{
  actual: FileCoverage;
  expected: FileCoverage;
  fixture: { name: string } & Awaited<ReturnType<typeof readFixture>>;
  debug: { generateReports: boolean };
  ignoreClassMethods: string[];
}>({
  debug: { generateReports: false },
  ignoreClassMethods: [],

  fixture: async ({}, use) => {
    const name = expect
      .getState()
      .currentTestName!.replace(/ /g, "-")
      .split(">-")
      .pop()!;

    return use({ name, ...(await readFixture(name)) });
  },

  actual: async ({ fixture, debug, ignoreClassMethods }, use) => {
    const coverageMap = await convert({
      ast: parseAstAsync(fixture.transpiled),
      code: fixture.transpiled,
      wrapperLength: 0,
      coverage: fixture.coverage[0],
      sourceMap: fixture.sourceMap,
      ignoreClassMethods,
    });

    const copy = createCoverageMap(JSON.parse(JSON.stringify(coverageMap)));

    const normalized = normalizeMap(coverageMap);
    const isEmpty = normalized.files().length === 0;
    const actual = isEmpty
      ? ({} as any)
      : normalized.fileCoverageFor(
          join("<process-cwd>", "test", "fixtures", fixture.name, "sources.ts"),
        );

    debug.generateReports = false;

    await use(actual);

    if (debug.generateReports) {
      generateReports(copy);
    }
  },

  expected: async ({ fixture, debug }, use) => {
    const sourceMapStore = libSourceMaps.createSourceMapStore();
    const coverageMap = await sourceMapStore.transformCoverage(
      fixture.istanbul,
    );

    debug.generateReports = false;
    const file = coverageMap.files()[0];
    await use(file ? coverageMap.fileCoverageFor(file) : ({} as any));

    if (debug.generateReports) {
      generateReports(coverageMap, "./istanbul-coverage");
    }
  },
});
