import {
  allGeneratedPositionsFor,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  type TraceMap,
  type Needle,
  type SourceMapSegment,
  type DecodedSourceMap,
} from "@jridgewell/trace-mapping";
import { type Node } from "estree";

const WORD_PATTERN = /(\w+|\s|[^\w\s])/g;

export function offsetToNeedle(offset: number, code: string): Needle {
  let current = 0;
  let line = 1;
  let column = 0;

  for (const char of code) {
    if (current === offset) {
      return { line, column };
    }

    // Handle \r\n EOLs on next iteration
    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }

    current++;
  }

  return { line, column };
}

export function getLoc(node: Node, code: string, map: TraceMap) {
  // End-mapping tracing logic from istanbul-lib-source-maps
  const endNeedle = offsetToNeedle(node.end, code);
  endNeedle.column -= 1;

  const start = getPosition(offsetToNeedle(node.start, code), map);
  let end = getPosition(endNeedle, map);

  // e.g. tsc that doesnt include } in source maps
  if (end === null) {
    endNeedle.column++;
    end = getPosition(endNeedle, map);
  }

  if (start === null || end === null) {
    // Does not exist in source maps, e.g. generated code
    return null;
  }

  const loc = { start, end };

  const afterEndMappings = allGeneratedPositionsFor(map, {
    source: loc.end.filename!,
    line: loc.end.line,
    column: loc.end.column + 1,
    bias: LEAST_UPPER_BOUND,
  });

  if (afterEndMappings.length === 0) {
    loc.end.column = Infinity;
  } else {
    for (const mapping of afterEndMappings) {
      if (mapping.line === null) continue;

      const original = originalPositionFor(map, mapping);
      if (original.line === loc.end.line) {
        loc.end = { ...original, filename: original.source };
        break;
      }
    }
  }

  return loc;
}

function getPosition(needle: Needle, map: TraceMap) {
  const { line, column, source } = originalPositionFor(map, needle);

  if (line == null || column == null) {
    return null;
  }

  return { line, column, filename: source };
}

export function createEmptySourceMap(
  filename: string,
  code: string,
): DecodedSourceMap {
  const mappings: SourceMapSegment[][] = [];

  // Identical mappings as "magic-string"'s { hires: "boundary" }
  for (const [line, content] of code.split("\n").entries()) {
    const parts = content.match(WORD_PATTERN) || [];
    const segments: SourceMapSegment[] = [];
    let column = 0;

    for (const part of parts) {
      segments.push([column, 0, line, column]);
      column += part.length;
    }

    mappings.push(segments);
  }

  return {
    version: 3,
    mappings,
    file: filename,
    sources: [filename],
    sourcesContent: [code],
    names: [],
  };
}
