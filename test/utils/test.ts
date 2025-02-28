import { createCoverageMap, type FileCoverage } from "istanbul-lib-coverage";
import { parseAstAsync } from "vite";
import { expect, test as base } from "vitest";

import convert from "../../src/index";
import {
  readFixture,
  normalizeMap,
  getIstanbulInstrumented,
  generateReports,
} from "./index";

export const test = base.extend<{
  actual: FileCoverage;
  expected: FileCoverage;
  fixture: { name: string } & Awaited<ReturnType<typeof readFixture>>;
  debug: { generateReports: boolean };
}>({
  debug: { generateReports: false },
  fixture: async ({}, use) => {
    const name = expect.getState().currentTestName!.replace(/ /g, "-");
    const { transpiled, sourceMap, coverage } = await readFixture(name);

    return use({ name, transpiled, sourceMap, coverage });
  },

  actual: async ({ fixture, debug }, use) => {
    const coverageMap = await convert({
      getAst: parseAstAsync,
      code: fixture.transpiled,
      wrapperLength: 185, // Tests are executed by vite-node in global setup
      coverage: fixture.coverage[0],
      sourceMap: fixture.sourceMap,
    });

    const copy = createCoverageMap(JSON.parse(JSON.stringify(coverageMap)));

    const normalized = normalizeMap(coverageMap);
    const actual = normalized.fileCoverageFor(
      `<process-cwd>/test/fixtures/${fixture.name}/sources.ts`,
    );

    await use(actual);

    if (debug.generateReports) {
      generateReports(copy);
    }
  },

  expected: async ({ fixture, debug }, use) => {
    const coverageMap = await getIstanbulInstrumented(
      fixture.transpiled,
      fixture.coverage[0].url,
      fixture.sourceMap,
    );

    const expected = coverageMap.fileCoverageFor(coverageMap.files()[0]);

    await use(expected);

    if (debug.generateReports) {
      generateReports(coverageMap, "./istanbul-coverage");
    }
  },
});
