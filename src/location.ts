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
} from "@jridgewell/trace-mapping";
import { type Node } from "estree";

const WORD_PATTERN = /(\w+|\s|[^\w\s])/g;
const INLINE_MAP_PATTERN = /#\s*sourceMappingURL=(.*)\s*$/m;
const BASE_64_PREFIX = "data:application/json;base64,";

/** How often should offset calculations be cached */
const CACHE_THRESHOLD = 250;

export class Locator {
  #cache = new Map<number, Needle>();
  #codeParts: string[];
  #map: TraceMap;
  #directory: string;

  constructor(code: string, map: TraceMap, directory: string) {
    this.#codeParts = code.split("");
    this.#map = map;
    this.#directory = directory;
  }

  reset() {
    this.#cache.clear();
    this.#codeParts = [];
  }

  offsetToNeedle(offset: number): Needle {
    const closestThreshold =
      Math.floor(offset / CACHE_THRESHOLD) * CACHE_THRESHOLD;
    const cacheHit = this.#cache.get(closestThreshold);

    let current = cacheHit ? closestThreshold : 0;
    let line = cacheHit?.line ?? 1;
    let column = cacheHit?.column ?? 0;

    for (let i = current; i <= this.#codeParts.length; i++) {
      if (current === offset) {
        return { line, column };
      }

      if (current % CACHE_THRESHOLD === 0) {
        this.#cache.set(current, { line, column });
      }

      const char = this.#codeParts[i];

      if (char === "\r" && this.#codeParts[i + 1] === "\n") {
        line++;
        column = 0;

        // Jump over next \n directly. Increase current only by 1 for whole \r\n.
        i++;
      } else if (char === "\n") {
        line++;
        column = 0;
      } else {
        column++;
      }

      current++;
    }

    return { line, column };
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
    endNeedle.column = Math.max(0, endNeedle.column - 1);

    let end = getPosition(endNeedle, this.#map);

    // e.g. tsc that doesnt include } in source maps
    if (end === null) {
      endNeedle.column++;
      end = getPosition(endNeedle, this.#map);
    }

    if (end === null) {
      // Does not exist in source maps, e.g. generated code
      return null;
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

    return loc;
  }

  getSourceLines(loc: { start: Needle; end: Needle }, filename: string) {
    const index = this.#map.resolvedSources.findIndex(
      (source) => source === filename || resolve(this.#directory, source),
    );
    const sourcesContent = this.#map.sourcesContent?.[index];

    if (sourcesContent == null) {
      return null;
    }

    const lines = sourcesContent
      .split("\n")
      .slice(loc.start.line - 1, loc.end.line);

    lines[0] = lines[0].slice(loc.start.column);
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
