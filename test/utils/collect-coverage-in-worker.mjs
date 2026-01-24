/*
 * Wrapper for collecting V8 coverage in isolated environment so that
 * test run doesn't interfere with Vitest's coverage reporting.
 */

import { Session } from "node:inspector";
import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";

const { filename, args } = workerData;
globalThis.args = args;
globalThis.output = undefined;

const coverage = await collectCoverage(
  () => import(pathToFileURL(filename).href),
  pathToFileURL(filename).pathname,
);

parentPort.postMessage(
  JSON.stringify({
    coverage,
    output: globalThis.output,
  }),
);

async function collectCoverage(method, filename) {
  const session = new Session();

  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  await method();

  const coverage = await new Promise((resolve, reject) => {
    session.post("Profiler.takePreciseCoverage", (error, data) => {
      if (error) return reject(error);

      const filtered = data.result.filter((entry) => entry.url.includes(filename));

      if (filtered.length !== 1) {
        reject(new Error(`Expected 1 entry, got ${filtered.length}`));
      }

      resolve(filtered[0]);
    });
  });

  session.post("Profiler.disable");
  session.post("Runtime.disable");
  session.disconnect();

  return coverage;
}
