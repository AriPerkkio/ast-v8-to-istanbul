import {
  originalPositionFor,
  TraceMap,
  type Needle,
  type SourceMapInput,
} from "@jridgewell/trace-mapping";
import type { Program } from "estree";
import type { Profiler } from "node:inspector";

import { offsetToNeedle } from "./location.ts";
import { getFunctionName, walk } from "./ast.ts";
import { addFunction, createCoverageMap } from "./coverage-map.ts";

export default async function convert(options: {
  code: string;
  wrapperLength?: number;
  sourceMap: SourceMapInput;
  coverage: Profiler.ScriptCoverage;
  getAst: (
    code: string
  ) => Parameters<typeof walk>[0] | Promise<Parameters<typeof walk>[0]>;
}) {
  const wrapperLength = options.wrapperLength || 0;

  const map = new TraceMap(options.sourceMap);
  const coverageMap = createCoverageMap(options.coverage.url);

  await walk(await options.getAst(options.code), {
    onFunctionDeclaration(node) {
      const loc = {
        start: getPosition(offsetToNeedle(node.start, options.code)),
        end: getPosition(offsetToNeedle(node.end, options.code)),
      };

      const decl = {
        start: getPosition(offsetToNeedle(node.id.start, options.code)),
        end: getPosition(offsetToNeedle(node.id.end, options.code)),
      };

      console.log({
        node,
        start: offsetToNeedle(node.id.start, options.code),
        end: offsetToNeedle(node.id.end, options.code),
      });

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

      addFunction({
        coverageMap,
        covered,
        loc: { start: loc.start, end: loc.end },
        decl: { start: decl.start, end: decl.end },
        filename: options.coverage.url,
        name: getFunctionName(node),
      });
    },
  });

  return coverageMap;

  function getPosition(needle: Needle) {
    const { line, column } = originalPositionFor(map, needle);

    if (line == null || column == null) {
      throw new Error(
        `Position is InvalidOriginalMapping ${JSON.stringify(
          { position: { line, column }, needle },
          null,
          2
        )}`
      );
    }

    return { line, column };
  }
}
