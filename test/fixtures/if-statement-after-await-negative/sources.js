async function run(a) {
  a || await a;
  if (a) {
    a;
  }
}

await run(1);
await run(1);
await run(0);
