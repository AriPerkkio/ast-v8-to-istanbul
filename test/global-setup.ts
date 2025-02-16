import esbuild from "esbuild";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function setup() {
  const directory = fileURLToPath(
    new URL("./fixtures/functions", import.meta.url)
  );

  await rm(`${directory}/dist`, { recursive: true, force: true });

  await esbuild.build({
    entryPoints: [`${directory}/sources.ts`],
    sourcemap: "inline",
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: `${directory}/dist/index.js`,
  });
}
