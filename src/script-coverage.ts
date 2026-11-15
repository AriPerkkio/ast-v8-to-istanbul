import { type Profiler } from "node:inspector";

type Normalized = { start: number; end: number; count: number };
type RawRange = Normalized & { area: number; order: number };

/** Files larger than this use event sweep to avoid allocating huge hits arrays */
const HITS_ARRAY_MAX_SIZE = 2_000_000;

const INITIALIZERS = {
  static: "<static_initializer>",
  instance: "<instance_members_initializer>",
} as const;

type FunctionCoverage = Profiler.ScriptCoverage["functions"][number];

/**
 * Collects `<static_initializer>` and `<instance_members_initializer>` functions by their start offset.
 * V8 reports each as a range from the first to the last member of its kind, so when a class mixes
 * static and instance members, these ranges can overlap and contain members of the other kind.
 */
export function getClassInitializers(scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">) {
  const initializers = {
    static: new Map<number, FunctionCoverage>(),
    instance: new Map<number, FunctionCoverage>(),
  };

  for (const fn of scriptCoverage.functions) {
    const kind =
      fn.functionName === INITIALIZERS.static
        ? "static"
        : fn.functionName === INITIALIZERS.instance
          ? "instance"
          : null;

    if (kind && fn.ranges.length > 0) {
      initializers[kind].set(fn.ranges[0].startOffset, fn);
    }
  }

  return initializers;
}

/** Class member that contains a node, see `getWalker().getClassMembers()` */
interface ClassMember {
  kind: "static" | "instance";

  /** Start offset of the class member */
  start: number | null | undefined;

  /** Start offset of the first member of other kind in the same class */
  otherKindStart: number | null | undefined;
}

/**
 * Resolves ranges for nodes inside class members.
 * Excludes the initializers of other kind from the member's own class, as their ranges may overlap the member.
 */
export class ClassMemberRanges {
  #initializers?: ReturnType<typeof getClassInitializers>;

  /** Ranges without specific initializers, keyed by excluded start offsets */
  #rangesByExcluded = new Map<string, Normalized[]>();

  /** Resolved ranges of each innermost class member */
  #rangesByMember = new WeakMap<ClassMember, Normalized[]>();

  constructor(
    private scriptCoverage: Pick<Profiler.ScriptCoverage, "functions">,
    private ranges: Normalized[],
    private wrapperLength: number,
  ) {}

  /** @param members Class members that contain the node, outermost first */
  get(members: readonly ClassMember[]): Normalized[] {
    const innermost = members.at(-1);

    if (!innermost) {
      return this.ranges;
    }

    // Each member is pushed on top of specific enclosing members, so it identifies the whole stack
    let ranges = this.#rangesByMember.get(innermost);

    if (!ranges) {
      ranges = this.#resolve(members);
      this.#rangesByMember.set(innermost, ranges);
    }

    return ranges;
  }

  #resolve(members: readonly ClassMember[]): Normalized[] {
    this.#initializers ||= getClassInitializers(this.scriptCoverage);
    const excluded = new Set<FunctionCoverage>();

    for (const member of members) {
      if (member.start == null || member.otherKindStart == null) continue;

      const otherKind = member.kind === "static" ? "instance" : "static";
      const initializer = this.#initializers[otherKind].get(
        member.otherKindStart + this.wrapperLength,
      );
      const range = initializer?.ranges[0];
      const start = member.start + this.wrapperLength;

      if (range && range.startOffset <= start && start < range.endOffset) {
        excluded.add(initializer);
      }
    }

    if (excluded.size === 0) {
      return this.ranges;
    }

    // Members of the same class share the excluded initializers, normalize only once for them
    const key = Array.from(excluded, (fn) => fn.ranges[0].startOffset).join(",");
    let ranges = this.#rangesByExcluded.get(key);

    if (!ranges) {
      ranges = normalize({
        functions: this.scriptCoverage.functions.filter((fn) => !excluded.has(fn)),
      });
      this.#rangesByExcluded.set(key, ranges);
    }

    return ranges;
  }
}

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
