// Function expressions as values of class properties

class Instantiated {
  uncoveredArrow = () => "Uncovered arrow, property initialized twice";
  uncoveredFunction = function () {
    return "Uncovered function, property initialized twice";
  };
  coveredArrow = () => "Covered arrow, property initialized twice";
}

class StaticOnly {
  static uncoveredArrow = () => "Uncovered static arrow, property initialized once";
  static uncoveredAsync = async () => "Uncovered static async arrow, property initialized once";
}

new Instantiated();
new Instantiated().coveredArrow();
