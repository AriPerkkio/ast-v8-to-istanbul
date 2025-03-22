# `ast-v8-to-istanbul`

[![Version][version-badge]][npm-url]

> - Speed of V8 coverage 🏎
> - Accuracy of Istanbul coverage 🔍

Experimental AST-aware [`v8-to-istanbul`](https://www.npmjs.com/package/v8-to-istanbul). Work-in-progress. 🚧

Unopinionated - _bring-your-own_ AST parser and source maps.

Passes all 195 tests<sup>[*](#istanbul-compatibility)</sup> of [`istanbul-lib-instrument`](https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-instrument/test/specs). ✅

```ts
import { convert } from "ast-v8-to-istanbul";
import { parseAstAsync } from "vite";
import type { CoverageMap } from "istanbul-lib-coverage";

const coverageMap: CoverageMap = await convert({
  // Bring-your-own AST parser
  ast: parseAstAsync(<code>),

  // Code of the executed file (not the source file)
  code: "function sum(a, b) {\n  return a + b ...",

  // Execution wrapper offset
  wrapperLength: 0,

  // Script coverage of the executed file
  coverage: {
    scriptId: "123",
    url: "file:///absolute/path/to/dist/index.js",
    functions: [
      {
        functionName: "sum",
        ranges: [{ startOffset: 223, endOffset: 261, count: 0 }],
        isBlockCoverage: false,
      },
      // ... etc
    ],
  },

  // Source map of the executed file
  sourceMap: {
    version: 3,
    sources: ["../sources.ts"],
    sourcesContent: ["export function sum(a: number, b: number) {\n..."],
    mappings: ";AAAO,SAAS,...",
    names: [],
  },
});
```

## Istanbul Compatibility

This project tests itself against test cases of `istanbul-lib-instrument` and verifies coverage maps are 100% identical. Some cases, like [deprecated `with()` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with) and edge cases of strict mode are skipped, as all tests are run in strict mode.

100% istanbul compatibility guarantees that coverage reports between V8 and Istanbul can be merged together.

## Limitations

- Unable to detect uncovered `AssignmentPattern`'s if line is otherwise covered
  - https://github.com/nodejs/node/issues/57435

- Unable to detect uncovered parts when block execution stops due to function throwing:
  - ```js
    function first() {
      throws()

      // unreachable, but incorrectly covered
      return "first";
    }

    const throws = ()  => { throw new Error() }

    try { first(1) } catch {}
    ```
  - ```json
    [
      {
        "ranges": [{ "startOffset": 0, "endOffset": 165, "count": 1 }],
        "isBlockCoverage": true
      },
      {
        "functionName": "first",
        "ranges": [{ "startOffset": 0, "endOffset": 92, "count": 1 }],
        "isBlockCoverage": true
      },
      {
        "functionName": "throws",
        "ranges": [{ "startOffset": 109, "endOffset": 137, "count": 1 }],
        "isBlockCoverage": true
      }
    ]
    ```

[version-badge]: https://img.shields.io/npm/v/ast-v8-to-istanbul
[npm-url]: https://www.npmjs.com/package/ast-v8-to-istanbul
