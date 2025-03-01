// @ts-ignore -- generated on runtime
import * as transpiled from "./dist/index.js";

// @ts-ignore -- generated on runtime
import * as instrumented from "./dist/instrumented.js";

new transpiled.MathClass().subtract(2, 3);
transpiled.MathObject.multiply(2, 3);

new instrumented.MathClass().subtract(2, 3);
instrumented.MathObject.multiply(2, 3);
