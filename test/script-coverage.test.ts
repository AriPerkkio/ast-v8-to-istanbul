import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "vitest";
import { normalize, getCount } from "../src/script-coverage";

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
