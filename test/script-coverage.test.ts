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
    { count: 0, end: 75, start: 25 },
    { count: 1, end: 100, start: 76 },
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
    { start: 50, end: 80, count: 0 },
    { start: 81, end: 99, count: 1 },
    { start: 100, end: 125, count: 0 },
    { start: 126, end: 200, count: 1 },
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
    { start: 64, end: 83, count: 0 },
    { start: 84, end: 94, count: 1 },
    { start: 95, end: 108, count: 0 },
    { start: 109, end: 163, count: 1 },
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
  expect(
    getCount({ startOffset: 25, endOffset: 50 }, [
      { start: 0, end: 100, count: 0 },
    ]),
  ).toBe(0);
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
    { start: 5, end: 8, count: 3 },
    { start: 9, end: 10, count: 2 },
    { start: 11, end: 12, count: 1 },
  ]);
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
