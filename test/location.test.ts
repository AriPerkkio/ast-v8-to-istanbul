import { TraceMap } from "@jridgewell/trace-mapping";
import { test, expect } from "vitest";
import { createEmptySourceMap, Locator } from "../src/location";

const code = `\
function sum(a, b) {
  return a + b;
}
Object.defineProperty(__vite_ssr_exports__, "sum", { enumerable: true, configurable: true, get(){ return sum }});
function subtract(a, b) {
  return a - b;
}
Object.defineProperty(__vite_ssr_exports__, "subtract", { enumerable: true, configurable: true, get(){ return subtract }});
function multiply(a, b) {
  return a * b;
}
Object.defineProperty(__vite_ssr_exports__, "multiply", { enumerable: true, configurable: true, get(){ return multiply }});
function remainder(a, b) {
  return a % b;
}
Object.defineProperty(__vite_ssr_exports__, "remainder", { enumerable: true, configurable: true, get(){ return remainder }});
`;
const map = new TraceMap(createEmptySourceMap("example.js", code));

test("offsetToNeedle picks correct positions", () => {
  const locator = new Locator(code, map, "");

  expect({
    start: locator.offsetToNeedle(0),
    end: locator.offsetToNeedle(38),
  }).toEqual({
    start: { line: 1, column: 0 },
    end: { line: 3, column: 1 },
  });

  expect({
    start: locator.offsetToNeedle(153),
    end: locator.offsetToNeedle(196),
  }).toEqual({
    start: { line: 5, column: 0 },
    end: { line: 7, column: 1 },
  });

  expect({
    start: locator.offsetToNeedle(321),
    end: locator.offsetToNeedle(364),
  }).toEqual({
    start: { line: 9, column: 0 },
    end: { line: 11, column: 1 },
  });

  expect({
    start: locator.offsetToNeedle(489),
    end: locator.offsetToNeedle(533),
  }).toEqual({
    start: { line: 13, column: 0 },
    end: { line: 15, column: 1 },
  });
});

test("bug repro #1", () => {
  const code = `\
// test/fixtures/function-declaration/sources.ts
function sum(a, b) {
  return a + b;
}
  `;
  const locator = new Locator(
    code,
    new TraceMap(createEmptySourceMap("example.js", code)),
    "",
  );

  expect({
    start: locator.offsetToNeedle(58),
    end: locator.offsetToNeedle(61),
  }).toEqual({
    start: { line: 2, column: 9 },
    end: { line: 2, column: 12 },
  });
});

test.each([
  { name: "unix", eol: "\n" },
  { name: "windows", eol: "\r\n" },
])("$name end-of-line $eol", ({ eol }) => {
  const code = `\
// test/fixtures/function-declaration/sources.ts
function sum(a, b) {
  return a + b;
}
    `
    .split("\n")
    .join(eol);

  const locator = new Locator(
    code,
    new TraceMap(createEmptySourceMap("example.js", code)),
    "",
  );

  expect.soft(locator.offsetToNeedle(58)).toEqual({ line: 2, column: 9 });
  expect.soft(locator.offsetToNeedle(61)).toEqual({ line: 2, column: 12 });
});
