import {
  allGeneratedPositionsFor,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  type TraceMap,
  type Needle,
} from "@jridgewell/trace-mapping";
import { type Node } from "estree";

const EOF_PATTERN = /(?<=\r?\n)/u;

export function offsetToNeedle(offset: number, code: string): Needle {
  let current = 0;
  let line = 1;
  let column = 0;

  for (const char of code) {
    if (current === offset) {
      return { line, column };
    }

    // TODO: Add tests for Windows \r\n eof
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

export function needleToOffset(
  needle: { column: number; line: number } | { column: null; line: null },
  code: string,
  bias = 0,
): number {
  let offset = 0;

  if (needle.line == null) {
    throw new Error("Line is null");
  }

  for (const [index, line] of code.split(EOF_PATTERN).entries()) {
    if (index >= needle.line - 1) {
      return offset + needle.column + bias;
    }

    offset += line.length;
  }

  throw new Error(
    `Unable to find offset for ${JSON.stringify(needle, null, 2)}`,
  );
}

export function getLoc(node: Node, code: string, map: TraceMap) {
  // End-mapping tracing logic from istanbul-lib-source-maps
  const endNeedle = offsetToNeedle(node.end, code);
  endNeedle.column -= 1;

  const loc = {
    start: getPosition(offsetToNeedle(node.start, code), map),
    end: getPosition(endNeedle, map),
    map,
  };

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
