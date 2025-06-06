import {
  type CoverageSummary,
  type CoverageMap,
  type FileCoverage,
} from "istanbul-lib-coverage";
import { expect } from "vitest";

import "./expect-extend";

expect.addSnapshotSerializer({
  test: (val) => val?.constructor?.name === "CoverageMap",
  serialize: (val: CoverageMap, config, indentation, depth, refs, printer) => {
    return printer(
      formatSummary(val.getCoverageSummary()),
      config,
      indentation,
      depth,
      refs,
    );
  },
});

expect.addSnapshotSerializer({
  test: (val) => val?.constructor?.name === "FileCoverage",
  serialize: (val: FileCoverage, config, indentation, depth, refs, printer) => {
    return printer(
      formatSummary(val.toSummary()),
      config,
      indentation,
      depth,
      refs,
    );
  },
});

expect.addSnapshotSerializer({
  test: (val) =>
    Array.isArray(val) &&
    val.every((entry) => entry?.constructor.name === "FileCoverage"),
  serialize: (
    val: FileCoverage[],
    config,
    indentation,
    depth,
    refs,
    printer,
  ) => {
    const summary = val.reduce(
      (all, current) => ({
        ...all,
        [current.path]: formatSummary(current.toSummary()),
      }),
      {},
    );

    return printer(summary, config, indentation, depth, refs);
  },
});

function formatSummary(summary: CoverageSummary) {
  return (["branches", "functions", "lines", "statements"] as const).reduce(
    (all, current) => ({
      ...all,
      [current]: `${summary[current].covered}/${summary[current].total} (${summary[current].pct}%)`,
    }),
    {},
  );
}
