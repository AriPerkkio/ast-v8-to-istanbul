import { randomUUID } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { type Profiler } from "node:inspector";
import { normalize, resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { createCoverageMap, type FileCoverage } from "istanbul-lib-coverage";
import MagicString from "magic-string";
import { describe, expect, onTestFinished, test } from "vitest";
import yaml from "yaml";

import convert from "../src";
import { parse } from "./utils";

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
  instrumentOpts?: {
    ignoreClassMethods?: string[];
  };
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
    test.for(t.tests)("$name", async (testCase) => {
      const { filename, args, out, ...expected } = testCase;
      const fullname = normalize(`${directory}/${filename}`);

      onTestFinished(() => rm(fullname, { force: true }));
      await writeFile(fullname, t.code);

      const worker = new Worker(
        resolve(import.meta.dirname, "./utils/collect-coverage-in-worker.mjs"),
        { workerData: { args, filename: fullname } },
      );

      const { coverage, output } = await new Promise<{
        coverage: Profiler.ScriptCoverage;
        output: unknown;
      }>((res, rej) => {
        worker.on("error", rej);
        worker.on("message", (message) => res(JSON.parse(message)));
      });

      await worker.terminate();

      const data = await convert({
        code: t.code,
        coverage,
        ast: parse(t.code),
        sourceMap: new MagicString(t.code).generateMap({
          hires: "boundary",
          file: fullname,
        }),
        ignoreClassMethods: t.instrumentOpts?.ignoreClassMethods,
      });

      if (out !== undefined) {
        expect.soft(output).toEqual(out);
      }

      const message = `\nCode: \n\n${t.code}\n`;

      const coverageMap = createCoverageMap(data);
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
