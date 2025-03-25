import { type Profiler } from "node:inspector";

type Normalized = Profiler.CoverageRange &
  Pick<Profiler.ScriptCoverage["functions"][number], "isBlockCoverage">;

export function normalize(
  scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
) {
  const ranges: Normalized[] = scriptCoverage.functions
    .map((fn) =>
      fn.ranges.map((range) => ({
        ...range,
        isBlockCoverage: fn.isBlockCoverage,
      })),
    )
    .flat()
    .sort((a, b) => a.startOffset - b.startOffset);

  const normalized = [];
  let current = ranges[0];

  for (const next of ranges.slice(1)) {
    if (current.endOffset < next.startOffset) {
      normalized.push(current);
      current = next;
    } else {
      if (current.startOffset < next.startOffset) {
        normalized.push({
          startOffset: current.startOffset,
          endOffset: next.startOffset - 1,
          count: current.count,
          isBlockCoverage: current.isBlockCoverage,
        });
      }

      normalized.push({
        startOffset: next.startOffset,
        endOffset: Math.min(current.endOffset, next.endOffset),
        count: next.count,
        isBlockCoverage: next.isBlockCoverage,
      });

      if (current.endOffset > next.endOffset) {
        current = {
          ...current,
          startOffset: next.endOffset + 1,
        };
      } else {
        current = next;
      }
    }
  }

  if (current) {
    normalized.push(current);
  }

  return normalized;
}

export function getCount(
  offset: Pick<Profiler.CoverageRange, "startOffset" | "endOffset">,
  coverages: Normalized[],
) {
  let closest: (Normalized & { diff: number }) | undefined = undefined;

  for (const coverage of coverages) {
    // Coverages should be sorted
    if (coverage.startOffset > offset.startOffset) {
      continue;
    }

    const diff = Math.abs(coverage.startOffset - offset.startOffset);

    if (!closest) {
      closest = { ...coverage, diff };
      continue;
    }

    if (closest.diff > diff) {
      closest = { ...coverage, diff };
    }
  }

  return closest?.count || 0;
}
