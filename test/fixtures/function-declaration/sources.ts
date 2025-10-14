export function sum(a: number, b: number) {
  return a + b;
}

export function subtract(a: number, b: number) {
  return a - b;
}

export function multiply(a: number, b: number) {
  return a * b;
}

export function remainder(a: number, b: number) {
  return a % b;
}

export default function(a: number, b: number) {
  return sum(a, b) / 2;
}

subtract(2, 3);

// TODO:
// function noop() {}
