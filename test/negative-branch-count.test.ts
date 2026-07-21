import { normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createCoverageMap } from "istanbul-lib-coverage";
import { expect, test } from "vitest";

import convert from "../src";
import { parse } from "./utils";

test("implicit else branch count is not negative", async () => {
  const filename = normalize(resolve("/some/file.ts"));
  const code = "if (a) b\n";
  const data = await convert({
    code,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "",
          ranges: [
            { startOffset: 0, endOffset: code.length, count: 1 },
            { startOffset: 7, endOffset: 8, count: 100 },
          ],
          isBlockCoverage: true,
        },
      ],
    },
  });

  const fileCoverage = createCoverageMap(data).fileCoverageFor(filename);

  for (const [key, counts] of Object.entries(fileCoverage.b)) {
    for (const count of counts) {
      expect(count, `branch ${key} has negative count`).toBeGreaterThanOrEqual(0);
    }
  }
});
