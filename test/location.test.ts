import { test, expect } from "vitest";
import { offsetToNeedle } from "../src/location";

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

test("offsetToNeedle picks correct positions", () => {
  expect({
    start: offsetToNeedle(0, code),
    end: offsetToNeedle(38, code),
  }).toEqual({
    start: { line: 1, column: 0 },
    end: { line: 3, column: 1 },
  });

  expect({
    start: offsetToNeedle(153, code),
    end: offsetToNeedle(196, code),
  }).toEqual({
    start: { line: 5, column: 0 },
    end: { line: 7, column: 1 },
  });

  expect({
    start: offsetToNeedle(321, code),
    end: offsetToNeedle(364, code),
  }).toEqual({
    start: { line: 9, column: 0 },
    end: { line: 11, column: 1 },
  });

  expect({
    start: offsetToNeedle(489, code),
    end: offsetToNeedle(533, code),
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

  expect({
    start: offsetToNeedle(58, code),
    end: offsetToNeedle(61, code),
  }).toEqual({
    start: { line: 2, column: 9 },
    end: { line: 2, column: 12 },
  });
});

test("windows end-of-line", () => {
  const code = `\
// test/fixtures/function-declaration/sources.ts
function sum(a, b) {
  return a + b;
}
    `
    .split("\n")
    .join("\r\n");

  expect(offsetToNeedle(58, code)).toEqual({ line: 2, column: 9 });
  expect(offsetToNeedle(61, code)).toEqual({ line: 2, column: 12 });
});
