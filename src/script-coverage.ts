import { type Profiler } from "node:inspector";

type Normalized = { start: number; end: number; count: number };

export function normalize(
  scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
) {
  if (scriptCoverage.functions.length === 0) {
    return [];
  }

  const ranges: (Normalized & { area: number })[] = scriptCoverage.functions
    .flatMap((fn) =>
      fn.ranges.map((range) => ({
        start: range.startOffset,
        end: range.endOffset,
        count: range.count,
        area: range.endOffset - range.startOffset,
      })),
    )
    .sort((a, b) => {
      const diff = b.area - a.area;
      if (diff !== 0) return diff;

      return a.end - b.end;
    });

  let maxEnd = 0;
  for (const r of ranges) {
    if (r.end > maxEnd) {
      maxEnd = r.end;
    }
  }

  const hits = new Uint32Array(maxEnd + 1);

  for (const range of ranges) {
    hits.fill(range.count, range.start, range.end + 1);
  }

  const normalized: Normalized[] = [];

  let start = 0;

  for (let end = 1; end <= hits.length; end++) {
    const isLast = end === hits.length;
    const current = isLast ? null : hits[end];
    const previous = hits[start];

    if (current !== previous || isLast) {
      normalized.push({
        start,
        end: end - 1,
        count: previous,
      });
      start = end;
    }
  }

  return normalized;
}

export function getCount(
  offset: Pick<Profiler.CoverageRange, "startOffset" | "endOffset">,
  coverages: Normalized[],
) {
  let low = 0;
  let high = coverages.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const coverage = coverages[mid];

    if (
      coverage.start <= offset.startOffset &&
      offset.startOffset <= coverage.end
    ) {
      return coverage.count;
    } else if (offset.startOffset < coverage.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return 0;
}
