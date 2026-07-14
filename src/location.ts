import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  allGeneratedPositionsFor,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  type TraceMap,
  type Needle,
  type SourceMapSegment,
  type DecodedSourceMap,
  type SourceMap,
  sourceContentFor,
} from "@jridgewell/trace-mapping";
import { type Node } from "estree";
import { getIgnoredLines } from "./ignore-hints";

const WORD_PATTERN = /(\w+|\s|[^\w\s])/g;
const INLINE_MAP_PATTERN = /#\s*sourceMappingURL=(.*)\s*$/m;
const BASE_64_PREFIX = "data:application/json;base64,";

const NEW_LINE_CHAR_CODE = "\n".charCodeAt(0);

type Filename = string;

export class Locator {
  /** Offsets of each line's first character */
  #lineStarts: number[] = [0];
  #map: TraceMap;
  #directory: string;
  #ignoredLines = new Map<Filename, ReturnType<typeof getIgnoredLines>>();

  constructor(code: string, map: TraceMap, directory: string) {
    for (let offset = 0; offset < code.length; offset++) {
      if (code.charCodeAt(offset) === NEW_LINE_CHAR_CODE) {
        this.#lineStarts.push(offset + 1);
      }
    }
    this.#map = map;
    this.#directory = directory;
  }

  reset() {
    this.#ignoredLines.clear();
    this.#lineStarts = [0];
  }

  offsetToNeedle(offset: number): Needle {
    let low = 0;
    let high = this.#lineStarts.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;

      if (this.#lineStarts[mid] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { line: high + 1, column: offset - this.#lineStarts[high] };
  }

  getLoc(node: Pick<Node, "start" | "end">) {
    const startNeedle = this.offsetToNeedle(node.start);
    const start = getPosition(startNeedle, this.#map);

    if (start === null) {
      // Does not exist in source maps, e.g. generated code
      return null;
    }

    // End-mapping tracing logic from istanbul-lib-source-maps
    const endNeedle = this.offsetToNeedle(node.end);
    endNeedle.column -= 1;

    let end = getPosition(endNeedle, this.#map);

    if (end === null) {
      // search the previous lines as the mapping was not found on the same line
      // e.g. tsc that doesnt include } in source maps
      for (let line = endNeedle.line; line >= startNeedle.line && end === null; line--) {
        end = getPosition({ line, column: Infinity }, this.#map);
      }
      // Does not exist in source maps, e.g. generated code
      if (end === null) return null;
    }

    const loc = { start, end };

    const afterEndMappings = allGeneratedPositionsFor(this.#map, {
      source: loc.end.filename,
      line: loc.end.line,
      column: loc.end.column + 1,
      bias: LEAST_UPPER_BOUND,
    });

    if (afterEndMappings.length === 0) {
      loc.end.column = Infinity;
    } else {
      for (const mapping of afterEndMappings) {
        if (mapping.line === null) continue;

        const original = originalPositionFor(this.#map, mapping);
        if (original.line === loc.end.line) {
          loc.end = { ...original, filename: original.source! };
          break;
        }
      }
    }

    const filename = loc.start.filename;
    let ignoredLines = this.#ignoredLines.get(filename);

    if (!ignoredLines) {
      const sources = sourceContentFor(this.#map, filename);
      ignoredLines = getIgnoredLines(sources ?? tryReadFileSync(filename));

      this.#ignoredLines.set(filename, ignoredLines);
    }

    // Anything that starts between the line ignore hints is ignored
    if (ignoredLines.has(loc.start.line)) {
      return null;
    }

    return loc;
  }

  getSourceLines(loc: { start: Needle; end: Needle }, filename: string) {
    const index = this.#map.resolvedSources.findIndex(
      (source) => source === filename || resolve(this.#directory, source) === filename,
    );
    const sourcesContent = this.#map.sourcesContent?.[index];

    if (sourcesContent == null) {
      return null;
    }

    const lines = sourcesContent.split("\n").slice(loc.start.line - 1, loc.end.line);

    lines[0] = lines[0].slice(loc.start.column);

    // eslint-disable-next-line e18e/prefer-array-at -- https://github.com/e18e/eslint-plugin/issues/27
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, loc.end.column);

    return lines.join("\n");
  }
}

function getPosition(needle: Needle, map: TraceMap) {
  let position = originalPositionFor(map, needle);

  if (position.source == null) {
    position = originalPositionFor(map, {
      column: needle.column,
      line: needle.line,
      bias: LEAST_UPPER_BOUND,
    });
  }

  if (position.source == null) {
    return null;
  }

  return {
    line: position.line,
    column: position.column,
    filename: position.source,
  };
}

export function createEmptySourceMap(filename: string, code: string): DecodedSourceMap {
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

export async function getInlineSourceMap(filename: string, code: string) {
  const matches = code.match(INLINE_MAP_PATTERN);
  const match = matches?.[1];

  if (!match) return null;

  try {
    if (match.includes(BASE_64_PREFIX)) {
      const encoded = match.split(BASE_64_PREFIX).at(-1) || "";
      const decoded = atob(encoded);
      return JSON.parse(decoded) as SourceMap;
    }

    const directory = dirname(filename);
    const content = await readFile(resolve(directory, match), "utf-8");
    return JSON.parse(content) as SourceMap;
  } catch {
    return null;
  }
}

function tryReadFileSync(filename: string) {
  try {
    return readFileSync(filename, "utf8");
  } catch {
    return undefined;
  }
}
