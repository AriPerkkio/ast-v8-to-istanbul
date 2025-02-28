import "vitest";
import type { FileCoverage } from "istanbul-lib-coverage";

interface CoverageMatchers<R = unknown> {
  /** Compare `FileCoverage['fnMap']` */
  toMatchFunctions: (
    actual: FileCoverage["fnMap"],
    options?: { ignoreDeclEnd?: boolean },
  ) => R;

  /** Compare `FileCoverage['statementMap']` */
  toMatchStatements: (actual: FileCoverage["statementMap"]) => R;

  /** Compare `FileCoverage['branchMap']` */
  toMatchBranches: (actual: FileCoverage["branchMap"]) => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CoverageMatchers<T> {}
  interface AsymmetricMatchersContaining extends CoverageMatchers {}
}
