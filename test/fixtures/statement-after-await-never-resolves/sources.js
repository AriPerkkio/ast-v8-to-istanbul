const pending = new Promise(() => {});

async function run(a) {
  a || await pending;
  a;
}

await run(1);
run(0);
