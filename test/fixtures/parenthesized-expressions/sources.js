// Parenthesized expressions, preserved in AST by e.g. oxc-parser. Kept as .js so that parentheses are preserved.
function parenthesized(value, fallback = (1)) {
  const single = (value);
  const double = ((value + 1));
  const conditional = value ? ((1)) : ((2));
  const logical = value || ((0));
  const arrow = () => ((value));

  return single + double + conditional + logical + arrow() + fallback;
}

class Parenthesized {
  field = (1);
}

new Parenthesized();
parenthesized(0);
parenthesized(1);
