// Function expressions as branches. Their own V8 ranges are not the branch's range.

const conditional = (value: boolean) => (value ? () => "Consequent" : () => "Alternate");
conditional(true);
conditional(true);
conditional(false);

const conditionalFunction = (value: boolean) =>
  value
    ? function () {
        return "Consequent";
      }
    : async () => "Alternate";
conditionalFunction(true);

const logical = (value: unknown) => value || (() => "Fallback");
logical(0);
logical(0);
logical(1);

const nullish = (value: unknown) => value ?? function () {};
nullish(null);

function defaultArrow(callback = () => "Default") {
  return callback;
}
defaultArrow();
defaultArrow();

function defaultFunction(
  callback = function () {
    return "Default";
  },
) {
  return callback;
}
defaultFunction();
