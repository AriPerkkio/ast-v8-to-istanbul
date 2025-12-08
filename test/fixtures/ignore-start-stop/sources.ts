function uncovered() {
  return "uncovered";
}

/* istanbul ignore start -- @preserve */
function uncovered3() {
  return "uncovered but excluded";
}
/* istanbul ignore stop -- @preserve */

function covered() {
  return "covered";
}

/* istanbul ignore start -- @preserve */
function covered2() {
  return "covered but excluded";
}
/* istanbul ignore stop -- @preserve */

covered();
covered2();
