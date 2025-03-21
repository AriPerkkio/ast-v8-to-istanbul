class SomeClass {
  covered() {
    return "Covered class method";
  }
  excluded() {
    function something(a) {
      const b = 2;
      return a + b;
    }

    something(1);
    return "Excluded class method";
  }
  uncovered() {
    return "Uncovered class method";
  }
}

new SomeClass().covered();

function TestClass() {}
TestClass.prototype.excluded = function excluded(i) {
  function something(a) {
    const b = 2;
    return a + b;
  }

  something(3);
  return i;
};
TestClass.prototype.goodMethod = function goodMethod(i) {
  return i;
};
var testClass = new TestClass();
testClass.goodMethod();

testClass.excluded();
