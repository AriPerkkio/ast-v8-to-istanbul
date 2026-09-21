type Params = { list: { n: number }[]; x: number; y: number };

// Arrow in the left operand of the chain, i.e. inside the inner (a && b) && c
export function f(p: Params) {
  return p.list.every((m) => m.n === 0) && p.x === 0 && p.y === 0;
}

// Arrow in the outermost right operand for comparison
export function g(p: Params) {
  return p.x === 0 && p.y === 0 && p.list.every((m) => m.n === 0);
}

f({ list: [{ n: 0 }], x: 0, y: 0 });
g({ list: [{ n: 0 }], x: 0, y: 0 });
