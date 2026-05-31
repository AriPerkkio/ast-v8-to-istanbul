class Greeter {
  greet() {
    return "Covered class method";
  }

  uncovered() {
    return "Uncovered class method";
  }
}

const utils = {
  double(value: number) {
    return value * 2;
  },

  unused(value: number) {
    return value / 2;
  },
};

new Greeter().greet();
utils.double(2);
