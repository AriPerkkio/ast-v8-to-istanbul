import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { type Needle, type TraceMap } from "@jridgewell/trace-mapping";
import libCoverage, {
  type CoverageMap,
  type FileCoverageData,
} from "istanbul-lib-coverage";

// https://github.com/istanbuljs/istanbuljs/blob/main/docs/raw-output.md#branch-types
export type Branch =
  | "if"
  | "binary-expr"
  | "cond-expr"
  | "switch"
  | "default-arg";

type FileCoverageDataWithMeta = FileCoverageData & { meta: Meta };

type Meta = {
  lastFunction: number;
  lastBranch: number;
  lastStatement: number;
};

export function createEmptyCoverageMap() {
  return libCoverage.createCoverageMap();
}

export function createCoverageMap(filename: string, sourceMap: TraceMap) {
  const coverageMap = createEmptyCoverageMap();
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

    coverageMap.addFileCoverage({
      path,
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},

      // @ts-expect-error -- internal
      meta,
    });
  }

  return coverageMap;
}

export function addFunction(options: {
  coverageMap: CoverageMap;
  filename: string;
  name?: string;
  covered?: number;
  decl: { start: Needle; end: Needle };
  loc: { start: Needle; end: Needle };
}) {
  const fileCoverage = options.coverageMap.fileCoverageFor(options.filename);
  const meta = (fileCoverage.data as FileCoverageDataWithMeta).meta;

  fileCoverage.data.fnMap[meta.lastFunction] = {
    name: options.name || `(anonymous_${meta.lastFunction})`,
    decl: pickLocation(options.decl),
    loc: pickLocation(options.loc),
    line: options.loc.start.line,
  };
  fileCoverage.f[meta.lastFunction] = options.covered || 0;

  meta.lastFunction++;
}

export function addStatement(options: {
  coverageMap: CoverageMap;
  filename: string;
  covered?: number;
  loc: { start: Needle; end: Needle };
}) {
  const fileCoverage = options.coverageMap.fileCoverageFor(options.filename);
  const meta = (fileCoverage.data as FileCoverageDataWithMeta).meta;

  fileCoverage.data.statementMap[meta.lastStatement] = pickLocation(
    options.loc,
  );
  fileCoverage.s[meta.lastStatement] = options.covered || 0;

  meta.lastStatement++;
}

export function addBranch(options: {
  coverageMap: CoverageMap;
  filename: string;
  type: Branch;
  loc: { start: Needle; end: Needle };
  locations: { start: Partial<Needle>; end: Partial<Needle> }[];
  covered?: number[];
}) {
  const fileCoverage = options.coverageMap.fileCoverageFor(options.filename);
  const meta = (fileCoverage.data as FileCoverageDataWithMeta).meta;

  fileCoverage.data.branchMap[meta.lastBranch] = {
    loc: pickLocation(options.loc),
    type: options.type,
    // @ts-expect-error -- Istanbul cheats types for implicit else
    locations: options.locations.map((loc) => pickLocation(loc)),
    line: options.loc.start.line,
  };
  fileCoverage.b[meta.lastBranch] =
    options.covered || Array(options.locations.length).fill(0);

  meta.lastBranch++;
}

function pickLocation<T extends { start: Needle; end: Needle }>(original: T) {
  return {
    start: { line: original.start.line, column: original.start.column },
    end: { line: original.end.line, column: original.end.column },
  };
}
