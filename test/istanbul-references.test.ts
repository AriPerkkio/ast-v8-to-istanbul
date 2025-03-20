import { randomUUID } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { Session, type Profiler } from "node:inspector";
import { resolve } from "node:path";
import { type FileCoverage } from "istanbul-lib-coverage";
import MagicString from "magic-string";
import { parseAstAsync } from "vite";
import { describe, expect, onTestFinished, test } from "vitest";
import yaml from "yaml";
import convert from "../src";

declare global {
  // eslint-disable-next-line no-var
  var args: any, output: any;
}

type TestCase = {
  name: string;
  code: string;
  tests: {
    name: string;
    filename: string;
    args: any[];
    out: any[];
    lines: { [key: string]: number };
    statements: { [key: string]: number };
    functions: { [key: string]: number };
    brances: { [key: string]: number };
  }[];
};

const directory = resolve(import.meta.dirname, "./istanbul-references");
const files = await readdir(directory);

const suites = await Promise.all(
  files
    .filter((file) => file.endsWith(".yaml"))
    .map(async (suite) => {
      const content = await readFile(`${directory}/${suite}`, "utf8");
      const parsed: TestCase[] = yaml
        .parseAllDocuments(content)
        .map((doc) => doc.toJSON());

      parsed.forEach(({ tests }) => {
        tests.forEach((t) => {
          const filename = `${suite}-${t.name}-${randomUUID()}.js`
            .replaceAll(".yaml", "")
            .replaceAll(" ", "-")
            .replaceAll("%", "")
            .replaceAll("/", "-");

          t.filename = filename;
        });
      });

      return { suite, tests: parsed };
    }),
);

describe.each(suites)("$suite", async ({ tests }) => {
  describe.each(tests)("$name", (t) => {
    test.for(t.tests)("$name", async (testCase, ctx) => {
      // TODO: Add support for ignoreClassMethods
      if (
        testCase.name?.includes("ignore class") ||
        t.name.includes("ignore class")
      ) {
        ctx.skip("Ignore not yet supported");
      }

      const { filename, args, out, ...expected } = testCase;
      const fullname = `${directory}/${filename}`;

      onTestFinished(() => rm(fullname, { force: true }));
      await writeFile(fullname, t.code);

      globalThis.args = args;
      globalThis.output = undefined;
      const coverage = await collectCoverage(() => import(fullname), fullname);

      const coverageMap = await convert({
        code: t.code,
        coverage,
        getAst: parseAstAsync,
        sourceMap: new MagicString(t.code).generateMap({
          hires: "boundary",
          file: fullname,
        }) as any,
      });

      if (out !== undefined) {
        expect.soft(globalThis.output).toEqual(out);
      }

      const message = `\nCode: \n\n${t.code}\n`;

      const isEmpty = coverageMap.files().length === 0;
      const fileCoverage = isEmpty
        ? ({} as FileCoverage)
        : coverageMap.fileCoverageFor(fullname);

      if (expected.statements) {
        expect.soft(fileCoverage.s, message).toEqual(expected.statements);
      }
      if (expected.functions) {
        expect.soft(fileCoverage.f, message).toEqual(expected.functions);
      }
      if (expected.brances) {
        expect.soft(fileCoverage.b, message).toEqual(expected.brances);
      }
      if (expected.lines) {
        expect
          .soft(fileCoverage.getLineCoverage(), message)
          .toEqual(expected.lines);
      }
    });
  });
});

async function collectCoverage(
  method: () => void | Promise<void>,
  filename: string,
) {
  const session = new Session();

  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  await method();

  const coverage = await new Promise<Profiler.ScriptCoverage>(
    (resolve, reject) => {
      session.post("Profiler.takePreciseCoverage", (error, data) => {
        if (error) return reject(error);

        const filtered = data.result.filter((entry) =>
          entry.url.includes(filename),
        );

        if (filtered.length !== 1) {
          reject(new Error(`Expected 1 entry, got ${filtered.length}`));
        }

        resolve(filtered[0]);
      });
    },
  );

  session.post("Profiler.disable");
  session.post("Runtime.disable");
  session.disconnect();

  return coverage;
}
