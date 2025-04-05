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

type CoverageMapData = IstanbulCoverageMapData & {
  [key: string]: FileCoverageData;
};

type FileCoverageDataWithMeta = FileCoverageData & { meta: Meta };

type Meta = {
  lastFunction: number;
  lastBranch: number;
  lastStatement: number;
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

  fileCoverage.fnMap[meta.lastFunction] = {
    name: options.name || `(anonymous_${meta.lastFunction})`,
    decl: options.decl,
    loc: options.loc,
    line: options.loc.start.line,
  };
  fileCoverage.f[meta.lastFunction] = options.covered || 0;

  meta.lastFunction++;
}

export function addStatement(options: {
  coverageMapData: CoverageMapData;
  filename: string;
  covered?: number;
  loc: { start: Needle; end: Needle };
}) {
  const fileCoverage = options.coverageMapData[options.filename];
  const meta = (fileCoverage as FileCoverageDataWithMeta).meta;

  fileCoverage.statementMap[meta.lastStatement] = options.loc;
  fileCoverage.s[meta.lastStatement] = options.covered || 0;

  meta.lastStatement++;
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

  fileCoverage.branchMap[meta.lastBranch] = {
    loc: options.loc,
    type: options.type,
    // @ts-expect-error -- Istanbul cheats types for implicit else
    locations: options.locations,
    line: options.loc.start.line,
  };
  fileCoverage.b[meta.lastBranch] =
    options.covered || Array(options.locations.length).fill(0);

  meta.lastBranch++;
}
