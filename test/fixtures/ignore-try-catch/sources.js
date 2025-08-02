function main() {
  try {
    noop();
  } catch {
    noop();
  }

  /* istanbul ignore next -- @preserve */
  try {
    noop();
  } catch {
    noop();
  }

  try {
    noop();
  } catch /* istanbul ignore next -- @preserve */ {
    noop();
  }

  try {
    noop();
  } catch (error) /* istanbul ignore next -- @preserve */ {
    noop(error);
  }
}

function noop() {}

main();
