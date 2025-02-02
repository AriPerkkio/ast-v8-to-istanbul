import type { Needle } from "@jridgewell/trace-mapping";
import libCoverage, { type CoverageMap } from "istanbul-lib-coverage";

export function createCoverageMap(filename: string) {
  const coverageMap: CoverageMap = libCoverage.createCoverageMap();

  coverageMap.addFileCoverage({
    path: filename,
    branchMap: {},
    b: {},
    statementMap: {},
    s: {},
    fnMap: {},
    f: {},
  });

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
  let index =
    1 +
    (Object.keys(fileCoverage.f)
      .map((key) => parseInt(key))
      .sort()
      .pop() ?? -1);

  const name = options.name || `(anonymous_${index})`;

  fileCoverage.data.fnMap[index] = {
    name,
    decl: pickLocation(options.decl),
    loc: pickLocation(options.loc),
    line: options.loc.start.line,
  };
  fileCoverage.f[index] = options.covered || 0;
}

function pickLocation<T extends { start: Needle; end: Needle }>(original: T) {
  return {
    start: { line: original.start.line, column: original.start.column },
    end: { line: original.end.line, column: original.end.column },
  };
}
