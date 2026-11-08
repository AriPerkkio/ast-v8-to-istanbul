// V8 reports <static_initializer> and <instance_members_initializer> with identical ranges

class NeverInstantiated {
  static staticField = "Covered static field";
  instanceField = "Uncovered instance field";

  static {
    this.staticField = "Covered static block";
  }
}

class Instantiated {
  instanceField = "Covered instance field, 3 times";
  static staticField = "Covered static field, once";

  static {
    this.staticField = "Covered static block, once";
  }
}

new Instantiated();
new Instantiated();
new Instantiated();
