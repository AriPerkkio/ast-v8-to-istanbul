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

export class Locator {
  #cache = new Map<number, Needle>();
  #codeParts: string[];
  #map: TraceMap;

  constructor(code: string, map: TraceMap) {
    this.#codeParts = code.split("");
    this.#map = map;
  }

  reset() {
    this.#cache.clear();
    this.#codeParts = [];
  }

  offsetToNeedle(offset: number): Needle {
    const cacheHit = this.getClosestCacheHit(offset);

    let current = cacheHit?.offset ?? 0;
    let line = cacheHit?.line ?? 1;
    let column = cacheHit?.column ?? 0;

    for (let i = current; i <= this.#codeParts.length; i++) {
      const char = this.#codeParts[i];

      if (current === offset) {
        this.#cache.set(offset, { line, column });

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

    this.#cache.set(offset, { line, column });

    return { line, column };
  }

  private getClosestCacheHit(
    offset: number,
  ): Partial<Needle> & { offset?: number } {
    if (this.#cache.has(offset)) {
      return { ...this.#cache.get(offset), offset };
    }

    let hit = {};
    let closest = 0;

    this.#cache.forEach((val, key) => {
      if (key <= offset && closest < key) {
        hit = val;
        closest = key;
      }
    });

    return { ...hit, offset: closest };
  }

  getLoc(node: Node) {
    // End-mapping tracing logic from istanbul-lib-source-maps
    const endNeedle = this.offsetToNeedle(node.end);
    endNeedle.column -= 1;

    const start = getPosition(this.offsetToNeedle(node.start), this.#map);
    let end = getPosition(endNeedle, this.#map);

    // e.g. tsc that doesnt include } in source maps
    if (end === null) {
      endNeedle.column++;
      end = getPosition(endNeedle, this.#map);
    }

    if (start === null || end === null) {
      // Does not exist in source maps, e.g. generated code
      return null;
    }

    const loc = { start, end };

    const afterEndMappings = allGeneratedPositionsFor(this.#map, {
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

        const original = originalPositionFor(this.#map, mapping);
        if (original.line === loc.end.line) {
          loc.end = { ...original, filename: original.source };
          break;
        }
      }
    }

    return loc;
  }
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
