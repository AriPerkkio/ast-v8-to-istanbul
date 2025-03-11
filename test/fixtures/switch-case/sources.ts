const condition = "B";

switch (condition) {
  case "A":
    noop(1);

  case "B": {
    noop(2);
    break;
  }
  case "C":
  case "D":
    noop(3);

  default:
    noop(4);
}

function noop() {}
