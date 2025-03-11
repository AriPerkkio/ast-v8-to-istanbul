import { type Needle } from "@jridgewell/trace-mapping";

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

export function isLocationSame(a: Needle, b: Needle) {
  return a.line === b.line && a.column === b.column;
}
