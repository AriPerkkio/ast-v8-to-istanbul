import type { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import {
  originalPositionFor,
  TraceMap,
  type Needle,
  type SourceMapInput,
} from "@jridgewell/trace-mapping";

import { getFunctionName, walk } from "./ast";
import { addFunction, createCoverageMap } from "./coverage-map";
import { offsetToNeedle } from "./location";

export default async function convert(options: {
  code: string;
  wrapperLength?: number;
  sourceMap: SourceMapInput;
  coverage: Profiler.ScriptCoverage;
  getAst: (
    code: string,
  ) => Parameters<typeof walk>[0] | Promise<Parameters<typeof walk>[0]>;
  debug?: boolean;
}) {
  const wrapperLength = options.wrapperLength || 0;

  const map = new TraceMap(options.sourceMap);

  const coverageMap = createCoverageMap(options.coverage.url, map);
  const ast = await options.getAst(options.code);

  if (options.debug) {
    await debugMappings(map);
  }

  await walk(ast, {
    onFunctionDeclaration(node) {
      const loc = {
        start: getPosition(offsetToNeedle(node.start, options.code)),
        end: getPosition(offsetToNeedle(node.end, options.code)),
      };

      let covered = 0;
      const start = node.start + wrapperLength;
      const end = node.end + wrapperLength;

      for (const { ranges } of options.coverage.functions) {
        for (const range of ranges) {
          if (range.startOffset === start && range.endOffset === end) {
            covered += range.count;
            // TODO: Can we break the loop here?
          }
        }
      }

      const originalFilename = loc.start.filename || loc.end.filename;

      if (!originalFilename) {
        throw new Error(
          `Missing original filename for ${JSON.stringify(loc, null, 2)}`,
        );
      }

      addFunction({
        coverageMap,
        covered,
        loc,
        decl: loc,
        filename: fileURLToPath(
          new URL(originalFilename, options.coverage.url),
        ),
        name: getFunctionName(node),
      });
    },
  });

  return coverageMap;

  function getPosition(needle: Needle) {
    const { line, column, source } = originalPositionFor(map, needle);

    if (line == null || column == null) {
      throw new Error(
        `Position is InvalidOriginalMapping ${JSON.stringify(
          { position: { line, column }, needle },
          null,
          2,
        )}`,
      );
    }

    return { line, column, filename: source };
  }
}

async function debugMappings(map: TraceMap) {
  const { eachMapping } = await import("@jridgewell/trace-mapping");

  console.log("Mappings:");
  eachMapping(map, (mapping) => {
    console.log({
      from: { line: mapping.originalLine, col: mapping.originalColumn },
      to: { line: mapping.generatedLine, col: mapping.generatedColumn },
    });
  });
}
