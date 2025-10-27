import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import inspector, { type Profiler } from "node:inspector";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCoverageMap } from "istanbul-lib-coverage";
import { createInstrumenter, type Instrumenter } from "istanbul-lib-instrument";
import c from "tinyrainbow";
import type { TestProject } from "vitest/node";

import { toAstExplorer } from "./ast-explorer";
import { toVisualizer } from "./source-map-visualizer";

const root = fileURLToPath(new URL("../", import.meta.url));
const excludes = ["e2e"];

export async function setup(project: TestProject) {
  const fixtures = await readdir(`${root}/fixtures`);

  for (const directory of fixtures) {
    if (excludes.includes(directory)) {
      continue;
    }

    console.log(c.bgBlueBright("[setup]"), `Creating fixtures/${directory}`);

    await rm(`${root}/fixtures/${directory}/dist`, {
      recursive: true,
      force: true,
    });
    await mkdir(`${root}/fixtures/${directory}/dist`);
    const { code, map } = await transform(
      project,
      `${root}/fixtures/${directory}`,
    );

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
      instrumenter,
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
  instrumenter: Instrumenter,
): Promise<{ v8: Profiler.ScriptCoverage[]; istanbul: unknown }> {
  const session = new inspector.Session();

  // @ts-expect-error -- untyped
  globalThis[`__istanbul_coverage_${directory}__`] = undefined;

  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  try {
    await method();
  } catch {
    const istanbul = createCoverageMap({});
    istanbul.addFileCoverage(instrumenter.lastFileCoverage());

    return {
      v8: [
        {
          scriptId: "1",
          url: `file://${root}/fixtures/${directory}/dist/index.js`,
          functions: [],
        },
      ],
      istanbul,
    };
  }

  return await new Promise((resolve, reject) => {
    session.post("Profiler.takePreciseCoverage", async (error, data) => {
      if (error) return reject(error);

      const filtered = data.result.filter(
        (entry) =>
          entry.url.includes("test/fixtures") &&
          entry.url.includes("/dist/index.js"),
      );

      resolve({
        v8: filtered,

        // @ts-expect-error -- untyped
        istanbul: globalThis[`__istanbul_coverage_${directory}__`] || {},
      });
    });
  });
}

async function transform(project: TestProject, directory: string) {
  const files = await readdir(directory);
  const filename = files.find((file) => file.includes("sources"))!;
  const extension = extname(filename);

  const result = await project.vite.environments.client.transformRequest(
    `${directory}/sources${extension}?transform-result`,
  );

  if (!result) {
    throw new Error(`Failed to transform ${directory}`);
  }

  const { code, map } = eval(result.code);

  await writeFile(`${directory}/dist/index.js`, code);
  await writeFile(`${directory}/dist/index.js.map`, JSON.stringify(map));

  return { code, map };
}
