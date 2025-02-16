import { test, expect } from "vitest";
import { needleToOffset, offsetToNeedle } from "../src/location";

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
  expect
    .soft({
      start: offsetToNeedle(0, code),
      end: offsetToNeedle(38, code),
    })
    .toEqual({
      start: { line: 1, column: 0 },
      end: { line: 3, column: 1 },
    });

  expect
    .soft({
      start: offsetToNeedle(153, code),
      end: offsetToNeedle(196, code),
    })
    .toEqual({
      start: { line: 5, column: 0 },
      end: { line: 7, column: 1 },
    });

  expect
    .soft({
      start: offsetToNeedle(321, code),
      end: offsetToNeedle(364, code),
    })
    .toEqual({
      start: { line: 9, column: 0 },
      end: { line: 11, column: 1 },
    });

  expect
    .soft({
      start: offsetToNeedle(489, code),
      end: offsetToNeedle(533, code),
    })
    .toEqual({
      start: { line: 13, column: 0 },
      end: { line: 15, column: 1 },
    });
});

test("needleToOffset returns correct positions", () => {
  expect
    .soft({
      start: needleToOffset({ line: 1, column: 0 }, code),
      end: needleToOffset({ line: 3, column: 1 }, code),
    })
    .toEqual({ start: 0, end: 38 });

  expect
    .soft({
      start: needleToOffset({ line: 5, column: 0 }, code),
      end: needleToOffset({ line: 7, column: 1 }, code),
    })
    .toEqual({ start: 153, end: 196 });

  expect
    .soft({
      start: needleToOffset({ line: 9, column: 0 }, code),
      end: needleToOffset({ line: 11, column: 1 }, code),
    })
    .toEqual({ start: 321, end: 364 });

  expect
    .soft({
      start: needleToOffset({ line: 13, column: 0 }, code),
      end: needleToOffset({ line: 15, column: 1 }, code),
    })
    .toEqual({ start: 489, end: 533 });
});
