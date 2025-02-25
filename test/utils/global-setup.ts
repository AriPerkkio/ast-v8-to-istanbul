import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import inspector, { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import c from "tinyrainbow";

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

    log("Collecting coverage with", `fixtures/${directory}/execute.ts`);
    const coverage = await collectCoverage(
      () => import(`${root}/fixtures/${directory}/execute.ts`),
    );

    log("Writing coverage to", `fixtures/${directory}/coverage.json\n`);
    await writeFile(
      `${root}/fixtures/${directory}/dist/coverage.json`,
      JSON.stringify(coverage, null, 2),
      "utf8",
    );
  }
}

async function collectCoverage(method: () => void | Promise<void>) {
  const session = new inspector.Session();

  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  await method();

  return await new Promise<Profiler.ScriptCoverage[]>((resolve, reject) => {
    session.post("Profiler.takePreciseCoverage", async (error, data) => {
      if (error) return reject(error);

      const filtered = data.result.filter(
        (entry) =>
          entry.url.includes("test/fixtures") && entry.url.includes("/dist/"),
      );

      resolve(filtered);
    });
  });
}

function log(...messages: string[]) {
  console.log(c.bgBlueBright("[setup]"), ...messages);
}
