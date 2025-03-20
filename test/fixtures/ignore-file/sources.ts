/* istanbul ignore file -- @preserve */

export function uncovered() {
  return "Hello world";
}

if (globalThis.nonExisting) {
  console.log("side effects");
}

const a = 1;
const b = { c: 2 };

export { a, b };
