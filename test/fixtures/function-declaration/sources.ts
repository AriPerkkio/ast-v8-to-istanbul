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

if (typeof sum === "function") {
  function another() {
    return 2;
  }

  another();
} else {
  function another() {
    return 3;
  }

  another();
}

subtract(2, 3);
