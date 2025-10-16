import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCoverageMap } from "istanbul-lib-coverage";
import MagicString from "magic-string";
import { expect, onTestFinished, test } from "vitest";

import convert from "../src";
import { createEmptySourceMap } from "../src/location";
import { parse } from "./utils";

test("function not in source maps is excluded", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const code = new MagicString(`\
export function covered() {
  return "Hello world";
}

export function excluded() {
  return "Hello world";
}

export function uncovered() {
  return "Hello world";
}
`).toString();

  const sourceMap = new MagicString(`\
export function covered() {
  return "Hello world";
}





export function uncovered() {
  return "Hello world";
}
`).generateMap({ hires: "boundary", file: filename });

  const data = await convert({
    code,
    sourceMap,
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 55, count: 1 }],
        },
        {
          functionName: "excluded",
          isBlockCoverage: true,
          ranges: [{ startOffset: 57, endOffset: 111, count: 1 }],
        },
        {
          functionName: "uncovered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 113, endOffset: 169, count: 0 }],
        },
      ],
    },
    ast: parse(code),
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/2 (50%)",
      "lines": "1/2 (50%)",
      "statements": "1/2 (50%)",
    }
  `);

  const functions = Object.values(fileCoverage.fnMap).map((fn) => fn.name);

  expect(functions).toMatchInlineSnapshot(`
    [
      "covered",
      "uncovered",
    ]
  `);

  expect(fileCoverage.getLineCoverage()).toMatchInlineSnapshot(`
    {
      "10": 0,
      "2": 1,
    }
  `);
});

test("map.sources can be file urls", async () => {
  const source = pathToFileURL(normalize(resolve("/some/path/to/source.ts")));
  const target = pathToFileURL(normalize(resolve("/other/path/to/target.js")));

  const s = new MagicString(`\
export function covered() {
  return "Hello world";
}
`);

  const code = s.toString();
  const sourceMap = s.generateMap({
    file: target.href,
    hires: "boundary",
  });

  sourceMap.sources = [source.href];

  const data = await convert({
    code,
    sourceMap,
    coverage: {
      url: target.href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 55, count: 1 }],
        },
      ],
    },
    ast: parse(code),
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(fileURLToPath(source));

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
});

test("source map is optional", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const s = new MagicString(`\
export function covered() {
  return "Hello world";
}
`);

  const code = s.toString();

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
        },
      ],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
});

test("empty source map mappings match magic-string", async () => {
  const filename = "hello.js";
  const code = `\
function hello(name) {
  return "Hello " + name;
}`;

  const expected = new MagicString(code, { filename }).generateDecodedMap({
    file: filename,
    hires: "boundary",
    includeContent: true,
    source: filename,
  });

  const actual = createEmptySourceMap(filename, code);

  expect(actual.mappings).toStrictEqual(expected.mappings);
});

test("inline source map as base64", async () => {
  const filename = normalize(resolve("/some/file.ts"));

  const s = new MagicString(`\
    export function covered() {
      return "Hello world";
    }
`);

  s.replace("export function", "\n\n\nexport function");

  let code = s.toString();
  const map = s.generateDecodedMap({ hires: "boundary", source: filename });
  const encoded = Buffer.from(JSON.stringify(map)).toString("base64");

  code += `\n//# sourceMappingURL=data:application/json;base64,${encoded}\n`;

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
        },
      ],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
  expect(fileCoverage.getLineCoverage()).toMatchInlineSnapshot(`
    {
      "2": 1,
    }
  `);
});

test("inline source map as filename", async () => {
  const uuid = randomUUID();
  const filename = normalize(resolve(import.meta.dirname, `file-${uuid}.ts`));
  const mapName = normalize(
    resolve(import.meta.dirname, `file-${uuid}.js.map`),
  );

  const s = new MagicString(`\
    export function covered() {
      return "Hello world";
    }
`);

  s.replace("export function", "\n\n\nexport function");

  let code = s.toString();
  const map = s.generateDecodedMap({ hires: "boundary", source: filename });

  onTestFinished(() => rmSync(mapName, { force: true }));
  await writeFile(mapName, JSON.stringify(map, null, 2), "utf8");

  code += `\n//# sourceMappingURL=file-${uuid}.js.map\n`;

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "covered",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: 53, count: 1 }],
        },
      ],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "1/1 (100%)",
      "lines": "1/1 (100%)",
      "statements": "1/1 (100%)",
    }
  `);
  expect(fileCoverage.getLineCoverage()).toMatchInlineSnapshot(`
    {
      "2": 1,
    }
  `);
});

test("windows repro #95", async () => {
  const code = `\
import util from "/util.ts";

export const getHello = () => {
    return 'hello';
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXRpbCBmcm9tIFwiL3V0aWwudHNcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRIZWxsbyA9ICgpID0+IHtcclxuICByZXR1cm4gJ2hlbGxvJztcclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QjtBQUNBLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNqQixDQUFDOyJ9
`
    .split("\n")
    .join("\r\n");

  const filename = normalize(resolve("/some/file.ts"));

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "0/1 (0%)",
      "lines": "0/2 (0%)",
      "statements": "0/2 (0%)",
    }
  `);
});

test("windows repro #97", async () => {
  const code = `\
import util, { works } from "/util.ts";
export default () => {
  const value = util();
  return value;
};
export const working = () => {
  const value = works();
  return value;
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXRpbCwge3dvcmtzfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiB7XG4gIGNvbnN0IHZhbHVlPSB1dGlsKCk7XG5cbiAgcmV0dXJuIHZhbHVlXG59XG5cbmV4cG9ydCBjb25zdCB3b3JraW5nID0gKCkgPT4ge1xuICBjb25zdCB2YWx1ZSA9IHdvcmtzKCk7XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuIl0sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFFBQU8sYUFBWTtBQUUxQixlQUFlLE1BQU07QUFDbkIsUUFBTSxRQUFPLEtBQUs7QUFFbEIsU0FBTztBQUNUO0FBRU8sYUFBTSxVQUFVLE1BQU07QUFDM0IsUUFBTSxRQUFRLE1BQU07QUFFcEIsU0FBTztBQUNUOyIsIm5hbWVzIjpbXX0=
`
    .split("\n")
    .join("\r\n");

  const filename = normalize(resolve("/some/file.ts"));

  const data = await convert({
    code,
    sourceMap: undefined,
    ast: parse(code),
    coverage: {
      url: pathToFileURL(filename).href,
      functions: [
        {
          functionName: "",
          ranges: [{ startOffset: 0, endOffset: 768, count: 1 }],
          isBlockCoverage: true,
        },
        {
          functionName: "default",
          ranges: [{ startOffset: 55, endOffset: 104, count: 1 }],
          isBlockCoverage: true,
        },
        {
          functionName: "working",
          ranges: [{ startOffset: 129, endOffset: 179, count: 1 }],
          isBlockCoverage: true,
        },
      ],
    },
  });

  const coverage = createCoverageMap(data);
  const fileCoverage = coverage.fileCoverageFor(filename);

  expect(fileCoverage).toMatchInlineSnapshot(`
    {
      "branches": "0/0 (100%)",
      "functions": "2/2 (100%)",
      "lines": "5/5 (100%)",
      "statements": "5/5 (100%)",
    }
  `);
});
