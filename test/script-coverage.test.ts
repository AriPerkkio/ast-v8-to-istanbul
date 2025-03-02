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
    { count: 1, endOffset: 24, isBlockCoverage: true, startOffset: 0 },
    { count: 0, endOffset: 50, isBlockCoverage: true, startOffset: 25 },
    { count: 0, endOffset: 75, isBlockCoverage: true, startOffset: 51 },
    { count: 1, endOffset: 100, isBlockCoverage: true, startOffset: 76 },
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
    { startOffset: 0, endOffset: 49, count: 1, isBlockCoverage: true },
    { startOffset: 50, endOffset: 80, count: 0, isBlockCoverage: true },
    { startOffset: 81, endOffset: 99, count: 1, isBlockCoverage: true },
    { startOffset: 100, endOffset: 125, count: 0, isBlockCoverage: true },
    { startOffset: 126, endOffset: 149, count: 1, isBlockCoverage: true },
    { startOffset: 150, endOffset: 175, count: 1, isBlockCoverage: true },
    { startOffset: 176, endOffset: 200, count: 1, isBlockCoverage: true },
  ]);
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
    { startOffset: 0, endOffset: 63, count: 1, isBlockCoverage: true },
    { startOffset: 64, endOffset: 83, count: 0, isBlockCoverage: true },
    { startOffset: 84, endOffset: 94, count: 1, isBlockCoverage: true },
    { startOffset: 95, endOffset: 108, count: 0, isBlockCoverage: true },
    { startOffset: 109, endOffset: 128, count: 1, isBlockCoverage: true },
    { startOffset: 129, endOffset: 163, count: 1, isBlockCoverage: true },
  ]);
});

test("getCount covered", () => {
  expect(
    getCount({ startOffset: 25, endOffset: 50 }, [
      { startOffset: 0, endOffset: 24, count: 0, isBlockCoverage: true },
      { startOffset: 25, endOffset: 50, count: 15, isBlockCoverage: true },
      { startOffset: 51, endOffset: 100, count: 0, isBlockCoverage: true },
    ]),
  ).toBe(15);
});

test("getCount uncovered", () => {
  expect(
    getCount({ startOffset: 25, endOffset: 50 }, [
      { startOffset: 0, endOffset: 100, count: 0, isBlockCoverage: true },
    ]),
  ).toBe(0);
});
