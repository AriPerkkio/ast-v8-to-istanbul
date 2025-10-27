import libCoverage from "istanbul-lib-coverage";
import { expect } from "vitest";
import convert from "../src";
import { e2e } from "./utils/e2e";

e2e("checker.ts", async ({ fixture, annotate }) => {
  const { result, duration } = await timer(() => convert(fixture));
  annotate(`checker.ts converted in ${duration}`);

  const fileCoverage = getFileCoverage(result);
  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/27805 (0%)",
      "functions": "0/3267 (0%)",
      "lines": "0/23198 (0%)",
      "statements": "0/24054 (0%)",
    }
  `);
});

e2e("functions.ts", async ({ fixture, annotate }) => {
  const { result, duration } = await timer(() => convert(fixture));
  annotate(`functions.ts converted in ${duration}`);

  const fileCoverage = getFileCoverage(result);
  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "1661/10000 (16.61%)",
      "functions": "268/1000 (26.8%)",
      "lines": "1866/7000 (26.65%)",
      "statements": "1866/7000 (26.65%)",
    }
  `);
});

e2e("vitest-cli-api-bundled.js", async ({ fixture, annotate }) => {
  const { result, duration } = await timer(() => convert(fixture));
  annotate(`vitest-cli-api-bundled.js converted in ${duration}`);

  const fileCoverage = getFileCoverage(result);
  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/4128 (0%)",
      "functions": "0/1009 (0%)",
      "lines": "0/5842 (0%)",
      "statements": "0/6145 (0%)",
    }
  `);
});

async function timer<T>(method: () => Promise<T>): Promise<{
  result: T;
  duration: string;
}> {
  const start = performance.now();
  const result = await method();

  const duration = `${(performance.now() - start).toFixed(2)} ms`;

  return { result, duration };
}

function getFileCoverage(coverageMap: libCoverage.CoverageMapData) {
  const map = libCoverage.createCoverageMap(coverageMap);
  return map.fileCoverageFor(map.files()[0]);
}
