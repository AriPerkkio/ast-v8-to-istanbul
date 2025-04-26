import type { FileCoverage, Range } from "istanbul-lib-coverage";
import { expect } from "vitest";

expect.extend({ toMatchFunctions, toMatchStatements, toMatchBranches });

function toMatchFunctions(
  this: { isNot?: boolean },
  actual: FileCoverage["fnMap"],
  expected: FileCoverage["fnMap"],
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

    if (!fnActual) {
      return {
        pass: false,
        message: () =>
          [
            "Function maps did not match:",
            `Missing function at ${key}. Expected: ${fnExpected.name} at ${JSON.stringify(fnExpected.loc, null, 2)}`,
          ].join("\n"),
      };
    }

    if (fnActual.name !== fnExpected.name) {
      if (
        // Generated function names may differ when generated positions are not found in sources
        !fnActual.name.startsWith("(anonymous_") &&
        !fnExpected.name.startsWith("(anonymous_")
      ) {
        mismatches.push(
          `Name did not match: ${fnActual.name} !== ${fnExpected.name}`,
        );
      }
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
  actual: FileCoverage["statementMap"],
  expected: FileCoverage["statementMap"],
) {
  if (this.isNot) {
    return {
      pass: true, // true, as in isNot failed
      message: () => ".not.toMatchStatements(...) is not implemented",
    };
  }

  const mismatches: string[] = [];

  for (const key in expected) {
    const diff = rangeDiff(actual[key], expected[key]);

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
  actual: FileCoverage["branchMap"],
  expected: FileCoverage["branchMap"],
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

    if (!branchActual) {
      mismatches.push(
        `Branch missing at ${key}, expected: ${JSON.stringify(branchExpected, null, 2)}`,
      );
      continue;
    }

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

  if (!a) {
    return [
      `  actual: missing`,
      `  expected: [start.line: ${b.start?.line}, start.col: ${b.start?.column}`,
      `  expected: [end.line: ${b.end?.line}, end.col: ${b.end?.column}`,
    ];
  }

  if (a.start?.line !== b.start?.line || a.start?.column !== b.start?.column) {
    diff.push(
      `  actual:   [start.line: ${a.start?.line}, start.col: ${a.start?.column}`,
    );
    diff.push(
      `  expected: [start.line: ${b.start?.line}, start.col: ${b.start?.column}`,
    );
  }
  if (a.end?.line !== b.end?.line || a.end?.column !== b.end?.column) {
    diff.push(
      `  actual:   [end.line: ${a.end?.line}, end.col: ${a.end?.column}`,
    );
    diff.push(
      `  expected: [end.line: ${b.end?.line}, end.col: ${b.end?.column}`,
    );
  }

  return diff;
}
