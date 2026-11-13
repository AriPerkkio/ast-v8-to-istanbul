// Function expressions as values of object properties
const api = {
  covered: function () {
    return "Covered property function";
  },
  uncovered: function () {
    return "Uncovered property function";
  },
  uncoveredNamed: function named() {
    return "Uncovered named property function";
  },
  uncoveredAsync: async function () {
    return "Uncovered async property function";
  },
  uncoveredGenerator: function* () {
    yield "Uncovered generator property function";
  },
  ["uncoveredComputed"]: function () {
    return "Uncovered computed property function";
  },
};

// Shape of ES5 class output of TypeScript and Babel
const descriptors = [
  {
    key: "covered",
    value: function covered() {
      return "Covered descriptor";
    },
  },
  {
    key: "uncovered",
    value: function uncovered() {
      return "Uncovered descriptor";
    },
  },
];

// Object methods with modifiers before the key
const methods = {
  async uncoveredAsync() {
    return "Uncovered async method";
  },
  *uncoveredGenerator() {
    yield "Uncovered generator method";
  },
  get uncoveredGetter() {
    return "Uncovered getter";
  },
  set uncoveredSetter(value: string) {
    this.value = value;
  },
  ["uncoveredComputed"]() {
    return "Uncovered computed method";
  },
  value: "",
};

api.covered();
descriptors[0].value();
