const condition = true;

condition && noop();

condition || noop();

/* prettier-ignore */ /* @ts-expect-error */
condition === false &&
   noop();

/* prettier-ignore */
condition === true ||
   noop();

function noop() {}
