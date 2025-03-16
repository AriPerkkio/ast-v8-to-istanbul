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

new MathClass().subtract(2, 3);
MathObject.multiply(2, 3);
