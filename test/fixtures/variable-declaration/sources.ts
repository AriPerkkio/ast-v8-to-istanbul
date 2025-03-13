export function uncoveredDeclaration() {
  d = "two";
}

var a = 1;

var b;

let c = 2;

let d;

const e = 3;

b = 4;

d;

export { a, b, c, d, e };

let output = "1";

// prettier-ignore
switch (output) {
   case "1": output = "one"; break;
   case "2": output = "two"; break;
}
