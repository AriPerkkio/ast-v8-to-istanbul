import { type Profiler } from "node:inspector";

type Normalized = { start: number; end: number; count: number };
type RawRange = Normalized & { area: number; order: number };

/** Files larger than this use event sweep to avoid allocating huge hits arrays */
const HITS_ARRAY_MAX_SIZE = 2_000_000;

export function normalize(
  scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
  hitsArrayMaxSize = HITS_ARRAY_MAX_SIZE,
): Normalized[] {
  if (scriptCoverage.functions.length === 0) {
    return [];
  }

  let order = 0;
  const ranges: RawRange[] = scriptCoverage.functions.flatMap((fn) =>
    fn.ranges.map((range) => ({
      start: range.startOffset,
      end: range.endOffset,
      count: range.count,
      area: range.endOffset - range.startOffset,
      order: order++,
    })),
  );

  let maxEnd = 0;
  for (const r of ranges) {
    if (r.end > maxEnd) {
      maxEnd = r.end;
    }
  }

  if (maxEnd <= hitsArrayMaxSize) {
    return normalizeWithHitsArray(ranges, maxEnd);
  }

  return normalizeWithEventSweep(ranges);
}

function normalizeWithHitsArray(ranges: RawRange[], maxEnd: number): Normalized[] {
  // Paint ranges into hits array so that the most specific range is applied last
  ranges.sort((a, b) => {
    const diff = b.area - a.area;
    if (diff !== 0) return diff;

    return a.end - b.end;
  });

  const hits = new Uint32Array(maxEnd);

  for (const range of ranges) {
    // V8's endOffset is exclusive - the offset at range's end belongs to the parent range
    hits.fill(range.count, range.start, range.end);
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

function normalizeWithEventSweep(ranges: RawRange[]): Normalized[] {
  const events: { offset: number; range: RawRange; isStart: boolean }[] = [];

  for (const range of ranges) {
    if (range.start < range.end) {
      events.push({ offset: range.start, range, isStart: true });
      events.push({ offset: range.end, range, isStart: false });
    }
  }

  events.sort((a, b) => a.offset - b.offset);

  const active: RawRange[] = [];
  const normalized: Normalized[] = [];
  let cursor = events.length > 0 ? events[0].offset : 0;
  let index = 0;

  while (index < events.length) {
    const offset = events[index].offset;

    if (active.length > 0 && cursor < offset) {
      const count = getMostSpecificRange(active).count;
      const previous = normalized.at(-1);

      if (previous && previous.end + 1 === cursor && previous.count === count) {
        previous.end = offset - 1;
      } else {
        normalized.push({ start: cursor, end: offset - 1, count });
      }
    }

    while (index < events.length && events[index].offset === offset) {
      const event = events[index];

      if (event.isStart) {
        active.push(event.range);
      } else {
        active.splice(active.indexOf(event.range), 1);
      }

      index++;
    }

    cursor = offset;
  }

  return normalized;
}

/** Pick the range that painting would have applied last in `normalizeWithHitsArray` */
function getMostSpecificRange(ranges: RawRange[]): RawRange {
  let winner = ranges[0];

  for (let index = 1; index < ranges.length; index++) {
    const range = ranges[index];

    if (
      range.area < winner.area ||
      (range.area === winner.area && range.end > winner.end) ||
      (range.area === winner.area && range.end === winner.end && range.order > winner.order)
    ) {
      winner = range;
    }
  }

  return winner;
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
