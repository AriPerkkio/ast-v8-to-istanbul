import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import inspector, { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import c from "tinyrainbow";
import { createInstrumenter } from "istanbul-lib-instrument";

import { toVisualizer } from "./source-map-visualizer";
import { toAstExplorer } from "./ast-explorer";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function setup() {
  const fixtures = await readdir(`${root}/fixtures`);

  for (const directory of fixtures) {
    log("Cleaning", `fixtures/${directory}/dist`);
    await rm(`${root}/fixtures/${directory}/dist`, {
      recursive: true,
      force: true,
    });

    log("Building", `fixtures/${directory}/sources.ts`);
    await esbuild.build({
      entryPoints: [`${root}/fixtures/${directory}/sources.ts`],
      sourcemap: "linked",
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: `${root}/fixtures/${directory}/dist/index.js`,
    });

    const [code, map] = await Promise.all([
      readFile(`${root}/fixtures/${directory}/dist/index.js`, "utf8"),
      readFile(`${root}/fixtures/${directory}/dist/index.js.map`, "utf8"),
    ]);

    log("Generating links", `fixtures/${directory}/dist/links.md`);
    const visualizer = toVisualizer({ code, map: JSON.parse(map) });
    const astExplorer = toAstExplorer({ code });

    await writeFile(
      `${root}/fixtures/${directory}/dist/links.md`,
      `- ${visualizer}\n\n- ${astExplorer}\n`,
      "utf8",
    );

    log("Generating Istanbul coverage for reference");
    const instrumenter = createInstrumenter({
      autoWrap: false,
      esModules: true,
      coverageVariable: `__istanbul_coverage_${directory}__`,
    });
    const instrumented = instrumenter.instrumentSync(
      code,
      `${root}/fixtures/${directory}/dist/index.js`,
      JSON.parse(map) as any,
    );
    await writeFile(
      `${root}/fixtures/${directory}/dist/instrumented.js`,
      instrumented,
      "utf8",
    );

    log("Collecting coverage of", directory);
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

    log("Writing coverage to", `fixtures/${directory}/coverage.json\n`);
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
        istanbul: globalThis[`__istanbul_coverage_${directory}__`],
      });

      globalThis[`__istanbul_coverage_${directory}__`] = undefined;
    });
  });
}

function log(...messages: string[]) {
  console.log(c.bgBlueBright("[setup]"), ...messages);
}
