// V8 reports <static_initializer> and <instance_members_initializer> as ranges that span from the first to the last member of their kind.
// When static and instance members are interleaved, these ranges overlap.

class NeverInstantiated {
  static staticFirst = "Covered static field";
  instanceFirst = "Uncovered instance field";
  static staticSecond = "Covered static field";
  instanceSecond = "Uncovered instance field";

  static {
    this.staticFirst = "Covered static block";
  }
}

class Instantiated {
  instanceFirst = "Covered instance field, 3 times";
  static staticFirst = "Covered static field, once";
  instanceSecond = "Covered instance field, 3 times";
  static staticSecond = "Covered static field, once";

  static {
    this.staticFirst = "Covered static block, once";
  }
}

new Instantiated();
new Instantiated();
new Instantiated();
