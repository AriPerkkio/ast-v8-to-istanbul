import { type Profiler } from "node:inspector";

type Normalized = { start: number; end: number; count: number };

export function normalize(
  scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
) {
  const ranges: (Normalized & { area: number })[] = scriptCoverage.functions
    .map((fn) =>
      fn.ranges.map((range) => ({
        start: range.startOffset,
        end: range.endOffset,
        count: range.count,
        area: range.endOffset - range.startOffset,
      })),
    )
    .flat()
    .sort((a, b) => {
      const diff = b.area - a.area;
      if (diff !== 0) return diff;

      return a.end - b.end;
    });

  const maxEnd = Math.max(...ranges.map((r) => r.end), 0);
  const hits: number[] = Array(maxEnd).fill(0);

  for (const range of ranges) {
    for (let i = range.start; i <= range.end; i++) {
      hits[i] = range.count;
    }
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
  let low = 0;
  let high = coverages.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const coverage = coverages[mid];

    if (coverage.start <= offset.startOffset && offset.startOffset <= coverage.end) {
      return coverage.count;
    } else if (offset.startOffset < coverage.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return 0;
}
