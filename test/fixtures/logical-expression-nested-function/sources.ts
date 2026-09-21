type Params = { list: { n: number }[]; x: number; y: number };

// The arrow is in the first operand, inside the inner node of `(a && b) && c`.
export function f(p: Params) {
  return p.list.every((m) => m.n === 0) && p.x === 0 && p.y === 0;
}

// The arrow is in the last operand, a direct child of the outermost node.
export function g(p: Params) {
  return p.x === 0 && p.y === 0 && p.list.every((m) => m.n === 0);
}

// The first operand is a parenthesized group.
export function h(p: Params) {
  return (p.x === 1 || p.y === 0) && p.list.every((m) => m.n === 0) && p.x === p.y;
}

// Each list has two items, so each arrow runs twice and its enclosing function runs once.
f({ list: [{ n: 0 }, { n: 0 }], x: 0, y: 0 });
g({ list: [{ n: 0 }, { n: 0 }], x: 0, y: 0 });
h({ list: [{ n: 0 }, { n: 0 }], x: 0, y: 0 });
