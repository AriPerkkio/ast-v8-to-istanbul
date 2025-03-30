import type { Profiler } from "node:inspector";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type EncodedSourceMap, TraceMap } from "@jridgewell/trace-mapping";
import type { Node } from "estree";
import type { CoverageMap } from "istanbul-lib-coverage";

import { type FunctionNodes, getFunctionName, walk } from "./ast";
import {
  addBranch,
  addFunction,
  addStatement,
  type Branch,
  createCoverageMap,
  createEmptyCoverageMap,
} from "./coverage-map";
import { getIgnoreHints } from "./ignore-hints";
import { createEmptySourceMap, getLoc } from "./location";
import { getCount, normalize } from "./script-coverage";

export { convert };

/**
 * Maps V8 `ScriptCoverage` to Istanbul's `CoverageMap`.
 * Results are identical with `istanbul-lib-instrument`.
 */
export default async function convert(options: {
  /** Code of the executed runtime file, not the original source file */
  code: string;

  /** Length of the execution wrapper, e.g. wrapper used in node:vm */
  wrapperLength?: number;

  /** Source map for the current file */
  sourceMap?: Omit<EncodedSourceMap, "version"> & { version: number };

  /** ScriptCoverage for the current file */
  coverage: Pick<Profiler.ScriptCoverage, "functions" | "url">;

  /** AST for the transpiled file that matches the coverage results */
  ast: Node | Promise<Node>;

  /** Class method names to ignore for coverage, identical to https://github.com/istanbuljs/nyc?tab=readme-ov-file#ignoring-methods */
  ignoreClassMethods?: string[];

  /** Filter to ignore code based on AST nodes */
  ignoreNode?: (
    node: Node,
    type: "function" | "statement" | "branch",
  ) => boolean | void;
}): Promise<CoverageMap> {
  const ignoreHints = getIgnoreHints(options.code);

  // File ignore contains always only 1 entry
  if (ignoreHints.length === 1 && ignoreHints[0].type === "file") {
    return createEmptyCoverageMap();
  }

  const wrapperLength = options.wrapperLength || 0;
  const filename = fileURLToPath(options.coverage.url);
  const directory = dirname(filename);

  const map = new TraceMap(
    (options.sourceMap as typeof options.sourceMap & { version: 3 }) ||
      createEmptySourceMap(filename, options.code),
  );

  const coverageMap = createCoverageMap(filename, map);
  const ranges = normalize(options.coverage);
  const ast = await options.ast;

  await walk(ast, ignoreHints, options.ignoreClassMethods, {
    // Functions
    onFunctionDeclaration(node) {
      onFunction(node, {
        loc: node.body,
        decl: node.id,
      });
    },
    onFunctionExpression(node) {
      if (isCovered(node)) {
        return;
      }

      onFunction(node, {
        loc: node.body,
        decl: node.id || { ...node, end: node.start + 1 },
      });
    },
    onArrowFunctionExpression(node) {
      onFunction(node, {
        loc: node.body,
        decl: { ...node, end: node.start + 1 },
      });

      // Implicit return-statement of bodyless arrow function
      if (node.body.type !== "BlockStatement") {
        onStatement(node.body, node);
      }
    },
    onMethodDefinition(node) {
      if (node.value.type === "FunctionExpression") {
        setCovered(node.value);
      }

      onFunction(node, {
        loc: node.value.body,
        decl: node.key,
      });
    },
    onProperty(node) {
      if (node.value.type === "FunctionExpression") {
        setCovered(node.value);

        onFunction(node, {
          loc: node.value.body,
          decl: node.key,
        });
      }
    },

    // Statements
    onBreakStatement: onStatement,
    onContinueStatement: onStatement,
    onDebuggerStatement: onStatement,
    onReturnStatement: onStatement,
    onThrowStatement: onStatement,
    onTryStatement: onStatement,
    onForStatement: onStatement,
    onForInStatement: onStatement,
    onForOfStatement: onStatement,
    onWhileStatement: onStatement,
    onDoWhileStatement: onStatement,
    onWithStatement: onStatement,
    onLabeledStatement: onStatement,
    onExpressionStatement(node) {
      if (
        node.expression.type === "Literal" &&
        node.expression.value === "use strict"
      ) {
        return;
      }

      onStatement(node);
    },
    onVariableDeclarator(node) {
      if (node.init) {
        onStatement(node.init, node);
      }
    },
    onClassBody(node) {
      for (const child of node.body) {
        if (child.type === "PropertyDefinition" && child.value) {
          onStatement(child.value);
        }
      }
    },

    // Branches
    onIfStatement(node, branches) {
      onBranch("if", node, branches);
      onStatement(node);
    },
    onConditionalExpression(node) {
      onBranch("cond-expr", node, [node.consequent, node.alternate]);
    },
    onLogicalExpression(node, branches) {
      onBranch("binary-expr", node, branches);
    },
    onSwitchStatement(node) {
      onBranch("switch", node, node.cases);
      onStatement(node);
    },
    onAssignmentPattern(node) {
      onBranch("default-arg", node, [node.right]);
    },
  });

  return coverageMap;

  function onFunction(
    node: FunctionNodes,
    positions: { loc: Node; decl: Node },
  ) {
    if (options.ignoreNode?.(node, "function")) {
      return;
    }

    const loc = getLoc(positions.loc, options.code, map);
    const decl = getLoc(positions.decl, options.code, map);

    if (loc === null || decl === null) {
      return;
    }

    const covered = getCount(
      {
        startOffset: node.start + wrapperLength,
        endOffset: node.end + wrapperLength,
      },
      ranges,
    );

    addFunction({
      coverageMap,
      covered,
      loc,
      decl,
      filename: getSourceFilename(loc),
      name: getFunctionName(node),
    });
  }

  function onStatement(node: Node, parent?: Node) {
    if (options.ignoreNode?.(node, "statement")) {
      return;
    }

    const loc = getLoc(node, options.code, map);
    if (loc === null) {
      return;
    }

    const covered = getCount(
      {
        startOffset: (parent || node).start + wrapperLength,
        endOffset: (parent || node).end + wrapperLength,
      },
      ranges,
    );

    addStatement({
      coverageMap,
      loc,
      covered,
      filename: getSourceFilename(loc),
    });
  }

  function onBranch(
    type: Branch,
    node: Node,
    branches: (Node | null | undefined)[],
  ) {
    if (options.ignoreNode?.(node, "branch")) {
      return;
    }

    const loc = getLoc(node, options.code, map);
    if (loc === null) {
      return;
    }

    const locations = [];
    const covered: number[] = [];

    for (const branch of branches) {
      if (!branch) {
        locations.push({
          start: { line: undefined, column: undefined },
          end: { line: undefined, coolumn: undefined },
        });

        const count = getCount(
          {
            startOffset: node.start + wrapperLength,
            endOffset: node.end + wrapperLength,
          },
          ranges,
        );
        const previous = covered.at(-1) || 0;
        covered.push(count - previous);

        continue;
      }

      const location = getLoc(branch, options.code, map);
      if (location !== null) {
        locations.push(location);
      }

      const bias = branch.type === "BlockStatement" ? 1 : 0;

      covered.push(
        getCount(
          {
            startOffset: branch.start + bias + wrapperLength,
            endOffset: branch.end - bias + wrapperLength,
          },
          ranges,
        ),
      );
    }

    if (type === "if") {
      if (locations.length > 0) {
        locations[0] = loc;
      }
    }

    if (locations.length === 0) {
      return;
    }

    addBranch({
      coverageMap,
      loc,
      locations,
      type,
      covered,
      filename: getSourceFilename(loc),
    });
  }

  function getSourceFilename(position: {
    start: { filename: string | null };
    end: { filename: string | null };
  }) {
    const sourceFilename = position.start.filename || position.end.filename;

    if (!sourceFilename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(position, null, 2)}`,
      );
    }

    if (sourceFilename.startsWith("file://")) {
      return fileURLToPath(sourceFilename);
    }

    return resolve(directory, sourceFilename);
  }
}

function setCovered(node: Node) {
  // @ts-expect-error -- internal
  node.__covered = true;
}

function isCovered(node: Node) {
  // @ts-expect-error -- internal
  return node.__covered === true;
}
