import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import inspector, { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import c from "tinyrainbow";
import { createInstrumenter } from "istanbul-lib-instrument";

import { toVisualizer } from "./source-map-visualizer";
import { toAstExplorer } from "./ast-explorer";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function setup() {
  const fixtures = await readdir(`${root}/fixtures`);

  for (const directory of fixtures) {
    console.log(c.bgBlueBright("[setup]"), `Creating fixtures/${directory}`);

    await rm(`${root}/fixtures/${directory}/dist`, {
      recursive: true,
      force: true,
    });
    await mkdir(`${root}/fixtures/${directory}/dist`);

    const { code, map } = await transform(`${root}/fixtures/${directory}`);

    const visualizer = toVisualizer({ code, map });
    const astExplorer = toAstExplorer({ code });

    await writeFile(
      `${root}/fixtures/${directory}/dist/links.md`,
      `- ${visualizer}\n\n- ${astExplorer}\n`,
      "utf8",
    );

    const instrumenter = createInstrumenter({
      autoWrap: false,
      esModules: true,
      coverageVariable: `__istanbul_coverage_${directory}__`,
      // @ts-expect-error -- untyped
      ignoreClassMethods: ["excluded"],
    });
    const instrumented = instrumenter.instrumentSync(
      code,
      `${root}/fixtures/${directory}/dist/index.js`,
      { ...map, version: map.version.toString() },
    );
    await writeFile(
      `${root}/fixtures/${directory}/dist/instrumented.js`,
      instrumented,
      "utf8",
    );

    const cache = new Date().getTime();
    const { v8, istanbul } = await collectCoverage(
      () =>
        Promise.all([
          import(`${root}/fixtures/${directory}/dist/index.js?cache=${cache}`),
          import(
            `${root}/fixtures/${directory}/dist/instrumented.js?cache=${cache}`
          ),
        ]),
      directory,
    );

    await writeFile(
      `${root}/fixtures/${directory}/dist/coverage.json`,
      JSON.stringify(v8, null, 2),
      "utf8",
    );
    await writeFile(
      `${root}/fixtures/${directory}/dist/coverage-istanbul.json`,
      JSON.stringify(istanbul, null, 2),
      "utf8",
    );
  }

  console.log("");
}

async function collectCoverage(
  method: () => unknown | Promise<unknown>,
  directory: string,
) {
  const session = new inspector.Session();

  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  await method();

  return await new Promise<{
    v8: Profiler.ScriptCoverage[];
    istanbul: unknown;
  }>((resolve, reject) => {
    session.post("Profiler.takePreciseCoverage", async (error, data) => {
      if (error) return reject(error);

      const filtered = data.result.filter(
        (entry) =>
          entry.url.includes("test/fixtures") &&
          entry.url.includes("/dist/index.js"),
      );

      resolve({
        v8: filtered,
        istanbul:
          // @ts-expect-error -- untyped
          globalThis[`__istanbul_coverage_${directory}__`] || {},
      });

      // @ts-expect-error -- untyped
      globalThis[`__istanbul_coverage_${directory}__`] = undefined;
    });
  });
}

async function transform(directory: string) {
  const { code, map } = (await import(
    `${directory}/sources.ts?transform-result`
  )) as typeof import("file?transform-result");

  await writeFile(`${directory}/dist/index.js`, code);
  await writeFile(`${directory}/dist/index.js.map`, JSON.stringify(map));

  return { code, map };
}
