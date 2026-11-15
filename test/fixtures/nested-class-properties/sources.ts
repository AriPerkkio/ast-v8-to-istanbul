// Initializers of an outer class must not be excluded when resolving counts of a nested class

class NeverInstantiated {
  instanceField = class Inner {
    static innerStatic = "Uncovered, outer instance initializer never ran";
  };
}

class NeverInstantiatedWithStatic {
  static outerStatic = "Covered static field";
  instanceField = class Inner {
    static innerStatic = "Uncovered, outer instance initializer never ran";
  };
}

class OnlyStatic {
  static staticField = class Inner {
    innerInstance = "Uncovered, Inner never instantiated";
  };
}

export { NeverInstantiated, NeverInstantiatedWithStatic, OnlyStatic };
