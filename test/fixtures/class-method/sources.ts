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
  constructor_2() {}
  constructor_3() {}
  constructor_4() {}
  constructor_5() {}
}

class AndAnother {
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
