import { type Profiler } from "node:inspector";

type Normalized = { start: number; end: number; count: number };

export function normalize(
  scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
) {
  const ranges: Normalized[] = scriptCoverage.functions
    .map((fn) =>
      fn.ranges.map((range) => ({
        start: range.startOffset,
        end: range.endOffset,
        count: range.count,
      })),
    )
    .flat()
    .sort((a, b) => {
      const diff = a.start - b.start;
      if (diff !== 0) return diff;
      return a.end - b.end;
    });

  const maxEnd = Math.max(...ranges.map((r) => r.end));
  const hits: number[] = [];

  for (let cursor = 0; cursor <= maxEnd; cursor++) {
    let match: (Normalized & { diff: number }) | undefined;

    for (const range of ranges) {
      if (range.start <= cursor && cursor <= range.end) {
        const diff = range.end - range.start;

        if (!match || diff < match.diff) {
          match = { ...range, diff };
        }
      }
    }

    hits.push(match?.count ?? 0);
  }

  const normalized: Normalized[] = [];

  let previous = hits[0];
  let start = 0;

  for (let end = 0; end < hits.length; end++) {
    const count = hits[end];
    const isLast = end === hits.length - 1;

    if (count !== previous || isLast) {
      normalized.push({
        start,
        end: isLast ? end : end - 1,
        count: previous,
      });

      previous = count;
      start = end;
    }
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
    if (coverage.start > offset.startOffset) {
      continue;
    }

    const diff = Math.abs(coverage.start - offset.startOffset);

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
