import { type CoverageMap, createCoverageMap, type FileCoverage } from "istanbul-lib-coverage";
import libSourceMaps from "istanbul-lib-source-maps";
import { expect, test as base } from "vitest";

import convert from "../../src/index";
import { readFixture, normalizeMap, generateReports, parse } from "./index";

export const test = base.extend<{
  actual: FileCoverage;
  expected: FileCoverage;
  ignoreClassMethods: string[];
  debug: undefined;

  /**  @internal */
  __coverageMaps: { v8: CoverageMap; istanbul: CoverageMap };
  /**  @internal */
  __fixture: { name: string } & Awaited<ReturnType<typeof readFixture>>;
}>({
  ignoreClassMethods: [],

  actual: async ({ __coverageMaps }, use) => {
    const coverageMap = __coverageMaps.v8;
    const normalized = normalizeMap(coverageMap);

    const isEmpty = normalized.files().length === 0;
    const actual = isEmpty ? ({} as any) : normalized.fileCoverageFor(normalized.files()[0]);

    await use(actual);
  },

  expected: async ({ __coverageMaps }, use) => {
    const coverageMap = __coverageMaps.istanbul;

    const file = coverageMap.files()[0];
    const expected = file ? coverageMap.fileCoverageFor(file) : ({} as any);

    await use(expected);
  },

  // This is called when ever test case destructures `debug` - it's magic
  debug: async ({ __coverageMaps }, use) => {
    await use(undefined);

    generateReports(__coverageMaps.v8, "./fixture-coverage");
    generateReports(__coverageMaps.istanbul, "./istanbul-coverage");
  },

  __fixture: async ({}, use) => {
    const name = expect.getState().currentTestName!.replace(/ /g, "-").split(">-").pop()!;

    return use({ name, ...(await readFixture(name)) });
  },

  __coverageMaps: async ({ __fixture, ignoreClassMethods }, use) => {
    const data = await convert({
      ast: parse(__fixture.transpiled),
      code: __fixture.transpiled,
      wrapperLength: 0,
      coverage: __fixture.coverage[0],
      sourceMap: __fixture.sourceMap,
      ignoreClassMethods,
    });

    const sourceMapStore = libSourceMaps.createSourceMapStore();
    const istanbul = await sourceMapStore.transformCoverage(__fixture.istanbul);

    await use({ v8: createCoverageMap(data), istanbul });
  },
});
