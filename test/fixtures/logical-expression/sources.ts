const condition = true;

condition && noop();

condition || noop();

/* @ts-expect-error */
condition === false &&
   noop();

condition === true ||
   noop();

let a = 1, b = 2;

if (
   a === 2 ||
   b === 2 ||
   a === b
) {
  noop();
}

function noop() {}
