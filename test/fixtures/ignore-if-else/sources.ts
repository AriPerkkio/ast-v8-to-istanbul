const truthy = true;
const falsy = false;

/* istanbul ignore if -- @preserve */
if (falsy) {
  function uncovered_1() {
    return "uncovered but ignored";
  }
  uncovered_1();
}

/* istanbul ignore else -- @preserve */
if (truthy) {
  function covered_1() {
    return "covered, not ignored";
  }
  covered_1();
} else {
  function uncovered_2() {
    return "uncovered but ignored";
  }
  uncovered_2();
}

/* istanbul ignore else -- @preserve */
if (truthy) {
  function covered_2() {
    return "covered but implicit else ignored";
  }
  covered_2();
}
