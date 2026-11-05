// https://github.com/AriPerkkio/ast-v8-to-istanbul/issues/207
async function run(a: number) {
  a || (await a);

  if (a) {
    return;
  }
}

await run(1);
await run(0);
