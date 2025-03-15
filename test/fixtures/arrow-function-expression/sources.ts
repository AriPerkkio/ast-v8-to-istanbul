export const sum = (a: number, b: number) => {
  return a + b;
};

export let subtract = (a: number, b: number) => {
  return a - b;
};

export var multiply = (a: number, b: number) => {
  return a * b;
};

export const remainder = (a: number, b: number) => {
  return a % b;
};

export const foo = (bar) => {};

// prettier-ignore
export const arrow = a => (
  b => (
    c => (
      d => a + b + c + d
    )
  )
)

arrow(1)(2)(3);
