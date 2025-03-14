# `ast-v8-to-istanbul`

Experimental AST-aware [`v8-to-istanbul`](https://www.npmjs.com/package/v8-to-istanbul). Work-in-progress.

```ts
import { convert } from "ast-v8-to-istanbul";
import { parseAstAsync } from "vite";
import type { CoverageMap } from "istanbul-lib-coverage";

const coverageMap: CoverageMap = await convert({
  // Bring-your-own AST parser
  getAst: parseAstAsync,

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

## Limitations

- Unable to detect uncovered `AssignmentPattern`'s if line is otherwise covered
  - https://github.com/nodejs/node/issues/57435
