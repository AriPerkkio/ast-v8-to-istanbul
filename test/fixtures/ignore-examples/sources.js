/* v8 ignore if */
if (parameter) {
  noop("Ignored");
} else {
  noop("Included");
}

/* v8 ignore else */
if (parameter) {
  noop("Included");
} else {
  noop("Ignored");
}

/* v8 ignore next */
noop("Ignored");
noop("Included");


/* istanbul ignore next */
noop("Ignored");

/* c8 ignore next */
noop("Ignored");

/* node:coverage ignore next */
noop("Ignored");

/* v8 ignore next */
function ignored() {
  noop("all");
  noop("lines");
  noop("are");
  noop("ignored");
}

/* v8 ignore next */
class Ignored {
  ignored() {
    noop("Ignored");
  }

  alsoIgnored() {
    noop("Ignored");
  }
}

/* v8 ignore next */
condition
  ? noop("ignored")
  : noop("also ignored");

/* v8 ignore next */
try {
  noop("Ignored");
} catch (error) {
  noop("Ignored");
}

try {
  noop("Included");
}
/* v8 ignore next */
catch (error) {
  noop("Ignored");
}

try {
  noop("Included");
} catch (error) /* v8 ignore next */ {
  noop("Ignored");
}

try {
  noop("Included");
} catch (error) {
  /* v8 ignore next */
  noop("Ignored");
  /* v8 ignore next */
  noop("Ignored");
}

(() => {
  switch (parameter) {
    case 1:
      return "Included";
  
    /* v8 ignore next */
    case 2:
      return "Ignored";
  
    case 3:
      return "Included";
  
    /* v8 ignore next */
    default:
      return "Ignored";
  }
})();

function noop() {}

var parameter = true, condition = false;
