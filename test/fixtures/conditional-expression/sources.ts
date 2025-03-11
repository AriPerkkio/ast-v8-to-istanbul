const condition = true;

condition ? noop() : false;

/* prettier-ignore */ /* @ts-expect-error */
condition === false ?
  noop() :
  false;

function noop() {}
