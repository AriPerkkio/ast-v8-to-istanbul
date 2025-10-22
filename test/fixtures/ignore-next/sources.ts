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

function switchCase(input: unknown) {
  switch (input) {
    /* istanbul ignore next -- @preserve */
    case "A":
      return 1;

    case "B":
      return 2;

    case "C":
      return 3;

    /* istanbul ignore next -- @preserve */
    default:
      return 4;
  }
}

covered();

/* istanbul ignore next -- @preserve */
export const excludedStatement = 1;
export const coveredStatement = 1;

switchCase("B");

const condition = true;

export function coveredConsequent() {
  return "Hello world";
}
export function coveredAlternate() {
  return "Hello world";
}

condition ? coveredConsequent() : /* istanbul ignore next -- @preserve */ uncovered();
!condition ? /* istanbul ignore next -- @preserve */ uncovered() : coveredAlternate();
