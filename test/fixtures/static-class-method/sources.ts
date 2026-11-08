// https://github.com/AriPerkkio/ast-v8-to-istanbul/issues/215
class Shapes {
  static uncovered() {
    return "Uncovered static method";
  }

  static async uncoveredAsync() {
    return "Uncovered static async method";
  }

  static get uncoveredGetter() {
    return "Uncovered static getter";
  }

  static covered() {
    return "Covered static method";
  }

  area() {
    return 0;
  }
}

Shapes.covered();
new Shapes().area();
