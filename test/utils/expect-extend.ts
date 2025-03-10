import type { FileCoverage, Range } from "istanbul-lib-coverage";
import { expect } from "vitest";

expect.extend({ toMatchFunctions, toMatchStatements, toMatchBranches });

function toMatchFunctions(
  this: { isNot?: boolean },
  expected: FileCoverage["fnMap"],
  actual: FileCoverage["fnMap"],
) {
  if (this.isNot) {
    return {
      pass: true, // true, as in isNot failed
      message: () => ".not.toMatchFunctions(...) is not implemented",
    };
  }

  const mismatches: string[] = [];

  for (const key in expected) {
    const fnActual = actual[key];
    const fnExpected = expected[key];

    if (fnActual.name !== fnExpected.name) {
      mismatches.push(
        `Name did not match: ${fnActual.name} !== ${fnExpected.name}`,
      );
    }

    const locDiff = rangeDiff(fnActual.loc, fnExpected.loc);

    if (locDiff.length) {
      mismatches.push(`locs ${key} did not match:`);
      mismatches.push(...locDiff);
    }

    const declDiff = rangeDiff(fnActual.decl, fnExpected.decl);

    if (declDiff.length) {
      mismatches.push(`decls ${key} did not match:`);
      mismatches.push(...declDiff);
    }
  }

  return {
    pass: mismatches.length === 0,
    message: () => ["Function maps did not match:", ...mismatches].join("\n"),
  };
}

function toMatchStatements(
  this: { isNot?: boolean },
  expected: FileCoverage["statementMap"],
  actual: FileCoverage["statementMap"],
) {
  if (this.isNot) {
    return {
      pass: true, // true, as in isNot failed
      message: () => ".not.toMatchStatements(...) is not implemented",
    };
  }

  const mismatches: string[] = [];

  for (const key in expected) {
    const rangeExpected = expected[key];

    // Order is not guaranteed, so find closest match
    const rangeActual =
      findClosestByStart(actual, rangeExpected) || actual[key];

    const diff = rangeDiff(rangeActual, rangeExpected);

    if (diff.length) {
      mismatches.push(`range ${key} did not match:`);
      mismatches.push(...diff);
    }
  }

  return {
    pass: mismatches.length === 0,
    message: () => ["Statement maps did not match:", ...mismatches].join("\n"),
  };
}

function toMatchBranches(
  this: { isNot?: boolean },
  expected: FileCoverage["branchMap"],
  actual: FileCoverage["branchMap"],
) {
  if (this.isNot) {
    return {
      pass: true, // true, as in isNot failed
      message: () => ".not.toMatchBranches(...) is not implemented",
    };
  }

  const mismatches: string[] = [];

  for (const key in expected) {
    const branchActual = actual[key];
    const branchExpected = expected[key];

    if (branchActual.type !== branchExpected.type) {
      mismatches.push(
        `Type did not match: ${branchActual.type} !== ${branchExpected.type}`,
      );
    }

    const locDiff = rangeDiff(branchActual.loc, branchExpected.loc);

    if (locDiff.length) {
      mismatches.push(`locs ${key} did not match:`);
      mismatches.push(...locDiff);
    }

    branchExpected.locations.forEach((loc, i) => {
      const diff = rangeDiff(branchActual.locations[i], loc);

      if (diff.length) {
        mismatches.push(`Location ${i} did not match:`);
        mismatches.push(...diff);
      }
    });
  }

  return {
    pass: mismatches.length === 0,
    message: () => ["Branch maps did not match:", ...mismatches].join("\n"),
  };
}

function rangeDiff(a: Partial<Range>, b: Partial<Range>) {
  const diff: string[] = [];

  // https://github.com/istanbuljs/istanbuljs/blob/istanbul-lib-source-maps-v5.0.6/packages/istanbul-lib-source-maps/lib/get-mapping.js#L70-L77
  const skipEndColumns =
    a.end?.column === Infinity || b.end?.column === Infinity;
  const aEnd = { ...a.end, column: skipEndColumns ? 0 : a.end?.column };
  const bEnd = { ...b.end, column: skipEndColumns ? 0 : b.end?.column };

  if (a.start?.line !== b.start?.line || a.start?.column !== b.start?.column) {
    diff.push(
      `  actual:   [start.line: ${a.start?.line}, start.col: ${a.start?.column}`,
    );
    diff.push(
      `  expected: [start.line: ${b.start?.line}, start.col: ${b.start?.column}`,
    );
  }
  if (aEnd?.line !== bEnd?.line || aEnd?.column !== bEnd?.column) {
    diff.push(`  actual:   [end.line: ${aEnd?.line}, end.col: ${aEnd?.column}`);
    diff.push(`  expected: [end.line: ${bEnd?.line}, end.col: ${bEnd?.column}`);
  }

  return diff;
}

function findClosestByStart(
  a: FileCoverage["statementMap"],
  b: Partial<Range>,
) {
  return Object.values(a).find(
    (v) =>
      rangeDiff({ ...v, end: undefined }, { ...b, end: undefined }).length ===
      0,
  );
}
