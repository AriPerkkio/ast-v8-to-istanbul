export function covered() {
  return "Hello world";
}

/* istanbul ignore next -- @preserve */
export function excluded() {
  return "Hello world";
}

export function uncovered() {
  return "Hello world";
}

covered();

/* istanbul ignore next -- @preserve */
export const excludedStatement = 1;
export const coveredStatement = 1;
