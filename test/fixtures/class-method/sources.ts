class Greeter {
  constructor() {}

  greet() {
    return "Covered class method";
  }

  uncovered() {
    return "Uncovered class method";
  }
}

// To make name generation complex
const anonymous = function () {}

class Another {
  constructor() {}
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
