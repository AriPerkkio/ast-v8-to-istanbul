import { type Needle, originalPositionFor } from "@jridgewell/trace-mapping";

const EOF_PATTERN = /(?<=\r?\n)/u;

export type Positioned<T> = T & {
  start: number;
  end: number;
};

export function offsetToNeedle(offset: number, code: string): Needle {
  let current = 0;
  let line = 0;

  for (const [index, content] of code.split(EOF_PATTERN).entries()) {
    line = index + 1;

    if (current >= offset - 1) {
      return { column: Math.max(0, offset - current), line };
    }

    current += content.length;

    if (content.length > offset) {
      return { column: Math.max(0, offset - current), line };
    }
  }

  return { line, column: offset - current };
}

export function needleToOffset(
  needle: { column: number; line: number } | { column: null; line: null },
  code: string,
  bias = 0
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
    `Unable to find offset for ${JSON.stringify(needle, null, 2)}`
  );
}
