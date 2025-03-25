if (true) {
  noop();
} else {
  noop();
}

if (false) {
  noop();
} else {
  noop();
}

if (false) {
  noop();
}

if (true) {
  noop();
}

function nested(arg) {
  if (arg) {
    noop();
  }
}

function nested2(arg) {
  if (!arg) {
    noop();
  }
}

function nested3(arg) {
  if (arg) {
    noop();
  }
}

nested(true);
nested2(true);
nested3(true);
nested3(false);

function noop() {}
