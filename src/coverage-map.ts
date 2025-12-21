import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { type Needle, type TraceMap } from "@jridgewell/trace-mapping";
import {
  type CoverageMapData as IstanbulCoverageMapData,
  type FileCoverageData,
} from "istanbul-lib-coverage";

// https://github.com/istanbuljs/istanbuljs/blob/main/docs/raw-output.md#branch-types
export type Branch =
  | "if"
  | "binary-expr"
  | "cond-expr"
  | "switch"
  | "default-arg";

export type CoverageMapData = IstanbulCoverageMapData & {
  [key: string]: FileCoverageData;
};

type FileCoverageDataWithMeta = FileCoverageData & { meta: Meta };

type Meta = {
  lastFunction: number;
  lastBranch: number;
  lastStatement: number;
  seen: Record<string, number>;
};

export function createCoverageMapData(filename: string, sourceMap: TraceMap) {
  const data: CoverageMapData = {};
  const directory = dirname(filename);

  for (const source of sourceMap.sources) {
    let path = filename;

    if (source) {
      if (source.startsWith("file://")) {
        path = fileURLToPath(source);
      } else {
        path = resolve(directory, source);
      }
    }

    const meta: Meta = {
      lastBranch: 0,
      lastFunction: 0,
      lastStatement: 0,
      seen: {},
    };

    data[path] = {
      path,
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},

      // @ts-expect-error -- internal
      meta,
    };
  }

  return data;
}

export function addFunction(options: {
  coverageMapData: CoverageMapData;
  filename: string;
  name?: string;
  covered?: number;
  decl: { start: Needle; end: Needle };
  loc: { start: Needle; end: Needle };
}) {
  const fileCoverage = options.coverageMapData[options.filename];
  const meta = (fileCoverage as FileCoverageDataWithMeta).meta;

  const key = `f:${cacheKey(options.decl)}`;
  let index = meta.seen[key];

  if (index == null) {
    index = meta.lastFunction;
    meta.lastFunction++;
    meta.seen[key] = index;

    fileCoverage.fnMap[index] = {
      name: options.name || `(anonymous_${index})`,
      decl: pickLocation(options.decl),
      loc: pickLocation(options.loc),
      line: options.loc.start.line,
    };
  }

  fileCoverage.f[index] ||= 0;
  fileCoverage.f[index] += options.covered || 0;
}

export function addStatement(options: {
  coverageMapData: CoverageMapData;
  filename: string;
  covered?: number;
  loc: { start: Needle; end: Needle };
}) {
  const fileCoverage = options.coverageMapData[options.filename];
  const meta = (fileCoverage as FileCoverageDataWithMeta).meta;

  const key = `s:${cacheKey(options.loc)}`;
  let index = meta.seen[key];

  if (index == null) {
    index = meta.lastStatement;
    meta.lastStatement++;
    meta.seen[key] = index;
    fileCoverage.statementMap[index] = pickLocation(options.loc);
  }

  fileCoverage.s[index] = options.covered || 0;
}

export function addBranch(options: {
  coverageMapData: CoverageMapData;
  filename: string;
  type: Branch;
  loc: { start: Needle; end: Needle };
  locations: { start: Partial<Needle>; end: Partial<Needle> }[];
  covered?: number[];
}) {
  const fileCoverage = options.coverageMapData[options.filename];
  const meta = (fileCoverage as FileCoverageDataWithMeta).meta;

  const key = ["b", ...options.locations.map(cacheKey)].join(":");
  let index = meta.seen[key];

  if (index == null) {
    index = meta.lastBranch;
    meta.lastBranch++;
    meta.seen[key] = index;

    fileCoverage.branchMap[index] = {
      loc: pickLocation(options.loc),
      type: options.type,
      // @ts-expect-error -- Istanbul cheats types for implicit else
      locations: options.locations.map((loc) => pickLocation(loc)),
      line: options.loc.start.line,
    };
  }

  if (!fileCoverage.b[index]) {
    fileCoverage.b[index] = Array(options.locations.length).fill(0);
  }

  options.covered?.forEach((hit, i) => {
    fileCoverage.b[index][i] += hit;
  });
}

function pickLocation(loc: { start: Needle; end: Needle }) {
  return {
    start: { line: loc.start.line, column: loc.start.column },
    end: { line: loc.end.line, column: loc.end.column },
  };
}

function cacheKey(loc: { start: Partial<Needle>; end: Partial<Needle> }) {
  return `${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`;
}
