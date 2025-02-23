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
}

declare module "vitest" {
  interface Assertion<T = any> extends CoverageMatchers<T> {}
  interface AsymmetricMatchersContaining extends CoverageMatchers {}
}
