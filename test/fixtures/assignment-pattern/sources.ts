function covered({ a, b = 123 }) {
  const { aaaaa, bbbbb = 123 } = { bbbbb: 456 };
  const { ccccc, ddddd = 123 } = {};

  const [eeeee, fffff = 10] = [];
  const [ggggg, hhhhh = 10] = [undefined, 20];

  return { aaaaa, bbbbb, ccccc, ddddd, eeeee, fffff, ggggg, hhhhh };
}

export function uncovered({ a, b = 123 }) {
  const { aaaaa, bbbbb = 123 } = { bbbbb: 456 };
  const { ccccc, ddddd = 123 } = {};

  const [eeeee, fffff = 10] = [];
  const [ggggg, hhhhh = 10] = [undefined, 20];

  return { aaaaa, bbbbb, ccccc, ddddd, eeeee, fffff, ggggg, hhhhh };
}

covered({});
