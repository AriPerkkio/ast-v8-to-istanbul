function uncovered() {
  return "uncovered";
}

/* istanbul ignore start -- @preserve */
function uncovered3() {
  return "uncovered but excluded";
}
/* istanbul ignore end -- @preserve */

function covered() {
  return "covered";
}

/* istanbul ignore start -- @preserve */
function covered2() {
  return "covered but excluded";
}
/* istanbul ignore end -- @preserve */

covered();
covered2();
