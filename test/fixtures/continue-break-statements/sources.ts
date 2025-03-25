let counter = 0;

for (const [index] of Array(5).fill(0).entries()) {
  if (index === 2) {
    continue;
  }

  if (index === 4) {
    continue;
  }

  if (index === 3) {
    break;
  }

  if (index === 4) {
    break;
  }

  counter++;
}
