class MathClass {
  sum(a: number, b: number) {
    return a + b;
  }

  subtract(a: number, b: number) {
    return a - b;
  }
}

const MathObject = {
  multiply(a: number, b: number) {
    return a * b;
  },

  remainder(a: number, b: number) {
    return a % b;
  },
};

export { MathClass, MathObject };
