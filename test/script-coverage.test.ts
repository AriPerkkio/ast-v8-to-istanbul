import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "vitest";
import {
  normalize,
  getCount,
  getClassInitializers,
  ClassMemberRanges,
} from "../src/script-coverage";

test("normalizes single function coverage", async () => {
  expect(
    normalize({
      functions: [
        {
          functionName: "",
          isBlockCoverage: true,
          ranges: [
            { startOffset: 0, endOffset: 100, count: 1 },
            { startOffset: 25, endOffset: 50, count: 0 },
            { startOffset: 51, endOffset: 75, count: 0 },
          ],
        },
      ],
    }),
  ).toStrictEqual([
    { count: 1, end: 24, start: 0 },
    { count: 0, end: 49, start: 25 },
    { count: 1, end: 50, start: 50 },
    { count: 0, end: 74, start: 51 },
    { count: 1, end: 99, start: 75 },
  ]);
});

test("normalizes multiple function coverages", async () => {
  expect(
    normalize({
      functions: [
        {
          functionName: "",
          ranges: [
            { startOffset: 0, endOffset: 200, count: 1 },
            { startOffset: 50, endOffset: 80, count: 0 },
            { startOffset: 100, endOffset: 125, count: 0 },
          ],
          isBlockCoverage: true,
        },
        {
          functionName: "noop",
          ranges: [{ startOffset: 150, endOffset: 175, count: 1 }],
          isBlockCoverage: true,
        },
      ],
    }),
  ).toStrictEqual([
    { start: 0, end: 49, count: 1 },
    { start: 50, end: 79, count: 0 },
    { start: 80, end: 99, count: 1 },
    { start: 100, end: 124, count: 0 },
    { start: 125, end: 199, count: 1 },
  ]);
});

test("normalizes empty coverage set", async () => {
  expect(
    normalize({
      functions: [],
    }),
  ).toStrictEqual([]);
});

test("normalizes, bug repro #1", () => {
  const normalized = normalize({
    functions: [
      {
        functionName: "",
        ranges: [
          { startOffset: 0, endOffset: 163, count: 1 },
          { startOffset: 64, endOffset: 83, count: 0 },
          { startOffset: 95, endOffset: 108, count: 0 },
        ],
        isBlockCoverage: true,
      },
      {
        functionName: "noop",
        ranges: [{ startOffset: 109, endOffset: 128, count: 1 }],
        isBlockCoverage: true,
      },
    ],
  });

  expect(normalized).toStrictEqual([
    { start: 0, end: 63, count: 1 },
    { start: 64, end: 82, count: 0 },
    { start: 83, end: 94, count: 1 },
    { start: 95, end: 107, count: 0 },
    { start: 108, end: 162, count: 1 },
  ]);
});

test("getCount covered", () => {
  expect(
    getCount({ startOffset: 25, endOffset: 50 }, [
      { start: 0, end: 24, count: 0 },
      { start: 25, end: 50, count: 15 },
      { start: 51, end: 100, count: 0 },
    ]),
  ).toBe(15);
});

test("getCount uncovered", () => {
  expect(getCount({ startOffset: 25, endOffset: 50 }, [{ start: 0, end: 100, count: 0 }])).toBe(0);
});

test("overlapping ranges", () => {
  const coverage = {
    functions: [
      {
        functionName: "",
        ranges: [{ startOffset: 0, endOffset: 12, count: 1 }],
        isBlockCoverage: true,
      },
      {
        functionName: "",
        ranges: [{ startOffset: 3, endOffset: 10, count: 2 }],
        isBlockCoverage: true,
      },
      {
        functionName: "normalize",
        ranges: [{ startOffset: 5, endOffset: 8, count: 3 }],
        isBlockCoverage: true,
      },
    ],
  };

  const output = normalize(coverage);

  expect(output).toStrictEqual([
    { start: 0, end: 2, count: 1 },
    { start: 3, end: 4, count: 2 },
    { start: 5, end: 7, count: 3 },
    { start: 8, end: 9, count: 2 },
    { start: 10, end: 11, count: 1 },
  ]);
});

test("range end does not bleed into adjacent range", () => {
  // e.g. minified "function a(){}function b(){ /* longer body */ }" where
  // ranges are back-to-back and "b" starts exactly at exclusive end of "a"
  const normalized = normalize({
    functions: [
      {
        functionName: "a",
        ranges: [{ startOffset: 0, endOffset: 14, count: 5 }],
        isBlockCoverage: false,
      },
      {
        functionName: "b",
        ranges: [{ startOffset: 14, endOffset: 40, count: 9 }],
        isBlockCoverage: false,
      },
    ],
  });

  expect(normalized).toStrictEqual([
    { start: 0, end: 13, count: 5 },
    { start: 14, end: 39, count: 9 },
  ]);

  expect(getCount({ startOffset: 14, endOffset: 40 }, normalized)).toBe(9);
});

test("event sweep is equivalent with hits array", () => {
  // Deterministic PRNG (mulberry32) so failures are reproducible
  let seed = 0xc0ffee;
  function random() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let iteration = 0; iteration < 250; iteration++) {
    const functions = Array.from({ length: 1 + Math.floor(random() * 4) }, () => ({
      functionName: "",
      isBlockCoverage: true,
      ranges: Array.from({ length: 1 + Math.floor(random() * 5) }, () => {
        const startOffset = Math.floor(random() * 200);
        return {
          startOffset,
          endOffset: startOffset + Math.floor(random() * 100),
          count: Math.floor(random() * 4),
        };
      }),
    }));

    const viaHitsArray = normalize({ functions });
    const viaEventSweep = normalize({ functions }, 0);

    for (let offset = 0; offset <= 310; offset++) {
      const probe = { startOffset: offset, endOffset: offset };
      const expected = getCount(probe, viaHitsArray);
      const actual = getCount(probe, viaEventSweep);

      expect(actual, `Mismatch at offset ${offset} for input ${JSON.stringify(functions)}`).toBe(
        expected,
      );
    }
  }
});

test("event sweep is equivalent with hits array for functions.json", async () => {
  const functions = JSON.parse(
    await readFile(resolve(import.meta.dirname, "fixtures", "e2e", "functions.json"), "utf8"),
  );

  const viaHitsArray = normalize({ functions });
  const viaEventSweep = normalize({ functions }, 0);

  const maxEnd = viaHitsArray.at(-1)!.end;

  for (let offset = 0; offset <= maxEnd + 10; offset++) {
    const probe = { startOffset: offset, endOffset: offset };
    const expected = getCount(probe, viaHitsArray);
    const actual = getCount(probe, viaEventSweep);

    if (actual !== expected) {
      expect.fail(`Mismatch at offset ${offset}: ${actual} !== ${expected}`);
    }
  }
});

test("normalized functions.json matches snapshot", async () => {
  const functions = await readFile(
    resolve(import.meta.dirname, "fixtures", "e2e", "functions.json"),
    "utf8",
  );
  const normalized = normalize({ functions: JSON.parse(functions) });

  await expect(JSON.stringify(normalized, null, 2)).toMatchFileSnapshot(
    "__snapshots__/functions.json",
  );
});

test("collects class initializers by start offset", () => {
  // class A { static a = 1; i = 2; static b = 3; j = 4; }
  const top = {
    functionName: "",
    isBlockCoverage: true,
    ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
  };
  const staticInitializer = {
    functionName: "<static_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 10, endOffset: 43, count: 1 }],
  };
  const instanceInitializer = {
    functionName: "<instance_members_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 24, endOffset: 50, count: 0 }],
  };

  expect(
    getClassInitializers({ functions: [top, staticInitializer, instanceInitializer] }),
  ).toStrictEqual({
    static: new Map([[10, staticInitializer]]),
    instance: new Map([[24, instanceInitializer]]),
  });
});

test("collects class initializers of multiple classes", () => {
  // class A { static s = 1; i = 2; }
  // class B { i = 2; static s = 1; }
  const staticA = {
    functionName: "<static_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 10, endOffset: 22, count: 1 }],
  };
  const instanceA = {
    functionName: "<instance_members_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 24, endOffset: 29, count: 0 }],
  };
  const instanceB = {
    functionName: "<instance_members_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 43, endOffset: 48, count: 0 }],
  };
  const staticB = {
    functionName: "<static_initializer>",
    isBlockCoverage: false,
    ranges: [{ startOffset: 50, endOffset: 62, count: 1 }],
  };

  expect(
    getClassInitializers({ functions: [staticA, instanceA, instanceB, staticB] }),
  ).toStrictEqual({
    static: new Map([
      [10, staticA],
      [50, staticB],
    ]),
    instance: new Map([
      [24, instanceA],
      [43, instanceB],
    ]),
  });
});

test("collects no class initializers from coverage without classes", () => {
  expect(
    getClassInitializers({
      functions: [
        {
          functionName: "",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 100, count: 1 }],
        },
        {
          functionName: "noop",
          isBlockCoverage: true,
          ranges: [{ startOffset: 50, endOffset: 75, count: 0 }],
        },
      ],
    }),
  ).toStrictEqual({ static: new Map(), instance: new Map() });
});

test("collects no class initializers from empty coverage set", () => {
  expect(getClassInitializers({ functions: [] })).toStrictEqual({
    static: new Map(),
    instance: new Map(),
  });
});

test("skips class initializers without ranges", () => {
  expect(
    getClassInitializers({
      functions: [{ functionName: "<static_initializer>", isBlockCoverage: false, ranges: [] }],
    }),
  ).toStrictEqual({ static: new Map(), instance: new Map() });
});

// class A { static a = 1; i = 2; static b = 3; j = 4; }
const interleavedClass = {
  functions: [
    {
      functionName: "",
      isBlockCoverage: true,
      ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
    },
    {
      functionName: "<static_initializer>",
      isBlockCoverage: false,
      ranges: [{ startOffset: 10, endOffset: 43, count: 1 }],
    },
    {
      functionName: "<instance_members_initializer>",
      isBlockCoverage: false,
      ranges: [{ startOffset: 24, endOffset: 50, count: 0 }],
    },
  ],
};

function createClassMemberRanges(coverage: Parameters<typeof normalize>[0], wrapperLength = 0) {
  const ranges = normalize(coverage);
  return { ranges, classMemberRanges: new ClassMemberRanges(coverage, ranges, wrapperLength) };
}

test("class member ranges are not changed outside class members", () => {
  const { ranges, classMemberRanges } = createClassMemberRanges(interleavedClass);

  expect(classMemberRanges.get([])).toBe(ranges);
});

test("class member ranges exclude initializer of other kind that overlaps the member", () => {
  const { ranges, classMemberRanges } = createClassMemberRanges(interleavedClass);

  // "static b = 3" is inside both initializers, and the smaller instance initializer wins
  const staticB = { kind: "static", start: 31, otherKindStart: 24 } as const;
  expect(getCount({ startOffset: 31, endOffset: 43 }, ranges)).toBe(0);
  expect(getCount({ startOffset: 31, endOffset: 43 }, classMemberRanges.get([staticB]))).toBe(1);

  // "i = 2" is inside both initializers too
  const instanceI = { kind: "instance", start: 24, otherKindStart: 10 } as const;
  expect(getCount({ startOffset: 24, endOffset: 29 }, classMemberRanges.get([instanceI]))).toBe(0);
});

test("class member ranges are not changed when initializer of other kind does not overlap the member", () => {
  const { ranges, classMemberRanges } = createClassMemberRanges(interleavedClass);

  // "j = 4" is after the static initializer
  expect(classMemberRanges.get([{ kind: "instance", start: 45, otherKindStart: 10 }])).toBe(ranges);

  // Class has no members of other kind
  expect(classMemberRanges.get([{ kind: "instance", start: 45, otherKindStart: undefined }])).toBe(
    ranges,
  );
});

test("class member ranges exclude initializers of enclosing class members only", () => {
  // class O { static a = 1; i = class I { static x = 1; }; static b = 2; }
  const { classMemberRanges } = createClassMemberRanges({
    functions: [
      {
        functionName: "",
        isBlockCoverage: true,
        ranges: [{ startOffset: 0, endOffset: 70, count: 1 }],
      },
      {
        functionName: "<static_initializer>",
        isBlockCoverage: false,
        ranges: [{ startOffset: 10, endOffset: 67, count: 1 }],
      },
      {
        functionName: "<instance_members_initializer>",
        isBlockCoverage: false,
        ranges: [{ startOffset: 24, endOffset: 53, count: 0 }],
      },
    ],
  });

  const outerI = { kind: "instance", start: 24, otherKindStart: 10 } as const;
  const innerX = { kind: "static", start: 38, otherKindStart: undefined } as const;

  // "static x = 1" never ran, as instance initializer of O never ran
  expect(
    getCount({ startOffset: 38, endOffset: 46 }, classMemberRanges.get([outerI, innerX])),
  ).toBe(0);
});

test("class member ranges are cached", () => {
  const { classMemberRanges } = createClassMemberRanges(interleavedClass);

  const staticA = { kind: "static", start: 10, otherKindStart: 24 } as const;
  const staticB = { kind: "static", start: 31, otherKindStart: 24 } as const;

  // "static a = 1" is not inside instance initializer
  const ranges = classMemberRanges.get([staticB]);
  expect(classMemberRanges.get([staticB])).toBe(ranges);
  expect(classMemberRanges.get([{ ...staticB }])).toBe(ranges);
  expect(classMemberRanges.get([staticA])).not.toBe(ranges);
});

test("class member ranges respect wrapper length", () => {
  const wrapperLength = 100;
  const { classMemberRanges } = createClassMemberRanges(
    {
      functions: interleavedClass.functions.map((fn) => ({
        ...fn,
        ranges: fn.ranges.map((range) => ({
          ...range,
          startOffset: range.startOffset + wrapperLength,
          endOffset: range.endOffset + wrapperLength,
        })),
      })),
    },
    wrapperLength,
  );

  const staticB = { kind: "static", start: 31, otherKindStart: 24 } as const;
  expect(getCount({ startOffset: 131, endOffset: 143 }, classMemberRanges.get([staticB]))).toBe(1);
});
