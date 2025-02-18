import esbuild from "esbuild";
import { readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import inspector, { Profiler } from "node:inspector";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function setup() {
  const fixtures = await readdir(`${root}/fixtures`);

  for (const directory of fixtures) {
    await rm(`${root}/fixtures/${directory}/dist`, {
      recursive: true,
      force: true,
    });

    await esbuild.build({
      entryPoints: [`${root}/fixtures/${directory}/sources.ts`],
      sourcemap: "linked",
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: `${root}/fixtures/${directory}/dist/index.js`,
    });

    const coverage = await collectCoverage(
      () => import(`${root}/fixtures/${directory}/execute.ts`)
    );

    await writeFile(
      `${root}/fixtures/${directory}/dist/coverage.json`,
      JSON.stringify(coverage, null, 2),
      "utf8"
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
          entry.url.includes("test/fixtures") && entry.url.includes("/dist/")
      );

      resolve(filtered);
    });
  });
}
