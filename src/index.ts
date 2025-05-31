import type { Profiler } from "node:inspector";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type EncodedSourceMap, TraceMap } from "@jridgewell/trace-mapping";
import { type Node } from "estree";
import type { CoverageMapData } from "istanbul-lib-coverage";

import { type FunctionNodes, getFunctionName, getWalker } from "./ast";
import {
  addBranch,
  addFunction,
  addStatement,
  type Branch,
  createCoverageMapData,
} from "./coverage-map";
import { getIgnoreHints } from "./ignore-hints";
import { createEmptySourceMap, getInlineSourceMap, Locator } from "./location";
import { getCount, normalize } from "./script-coverage";

export { convert };

/**
 * Maps V8 `ScriptCoverage` to Istanbul's `CoverageMap`.
 * Results are identical with `istanbul-lib-instrument`.
 */
export default async function convert<
  T = Node,
  Program = T & { type: "Program" },
>(options: {
  /** Code of the executed runtime file, not the original source file */
  code: string;

  /** Length of the execution wrapper, e.g. wrapper used in node:vm */
  wrapperLength?: number;

  /** Source map for the current file */
  sourceMap?: Omit<EncodedSourceMap, "version"> & { version: number };

  /** ScriptCoverage for the current file */
  coverage: Pick<Profiler.ScriptCoverage, "functions" | "url">;

  /** AST for the transpiled file that matches the coverage results */
  ast: Program | Promise<Program>;

  /** Class method names to ignore for coverage, identical to https://github.com/istanbuljs/nyc?tab=readme-ov-file#ignoring-methods */
  ignoreClassMethods?: string[];

  /** Filter to ignore code based on AST nodes */
  ignoreNode?: (
    node: T,
    type: "function" | "statement" | "branch",
  ) => boolean | "ignore-this-and-nested-nodes" | void;

  /**
   * Filter to ignore code based on source code
   * - Note that this is slower than `ignoreNode` as exclusion happens after remapping
   */
  ignoreSourceCode?: (
    code: string,
    type: "function" | "statement" | "branch",
    location: Record<"start" | "end", { line: number; column: number }>,
  ) => boolean | void;
}): Promise<CoverageMapData> {
  const ignoreHints = getIgnoreHints(options.code);

  // File ignore contains always only 1 entry
  if (ignoreHints.length === 1 && ignoreHints[0].type === "file") {
    return {};
  }

  const wrapperLength = options.wrapperLength || 0;
  const filename = fileURLToPath(options.coverage.url);
  const directory = dirname(filename);

  const map = new TraceMap(
    (options.sourceMap as typeof options.sourceMap & { version: 3 }) ||
      (await getInlineSourceMap(filename, options.code)) ||
      createEmptySourceMap(filename, options.code),
  );
  const locator = new Locator(options.code, map, directory);

  const coverageMapData = createCoverageMapData(filename, map);
  const ranges = normalize(options.coverage);
  const ast = await options.ast;

  const walker = getWalker();

  await walker.walk(ast, ignoreHints, options.ignoreClassMethods, {
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
    onClassMethod(babelNode) {
      const node: Node = {
        type: "FunctionExpression",
        start: babelNode.start!,
        end: babelNode.end!,
        body: {
          type: "BlockStatement",
          start: babelNode.body.start!,
          end: babelNode.body.end!,
          body: [],
        },
        params: [],
      };

      onFunction(node, {
        loc: node.body,
        decl: {
          start: babelNode.key.start!,
          end: babelNode.key.end!,
        },
      });
    },

    onObjectMethod(babelNode) {
      const node: Node = {
        type: "FunctionExpression",
        start: babelNode.start!,
        end: babelNode.end!,
        body: {
          type: "BlockStatement",
          start: babelNode.body.start!,
          end: babelNode.body.end!,
          body: [],
        },
        params: [],
      };

      onFunction(node, {
        loc: node.body,
        decl: {
          start: babelNode.key.start!,
          end: babelNode.key.end!,
        },
      });
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
        if (
          (child.type === "PropertyDefinition" ||
            child.type === "ClassProperty" ||
            child.type === "ClassPrivateProperty") &&
          child.value
        ) {
          onStatement(child.value as Node);
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

  locator.reset();

  return coverageMapData;

  function onFunction(
    node: FunctionNodes,
    positions: {
      loc: Pick<Node, "start" | "end">;
      decl: Pick<Node, "start" | "end">;
    },
  ) {
    if (onIgnore(node, "function")) {
      return;
    }

    const loc = locator.getLoc(positions.loc);
    if (loc === null) return;

    const decl = locator.getLoc(positions.decl);
    if (decl === null) return;

    const covered = getCount(
      {
        startOffset: node.start + wrapperLength,
        endOffset: node.end + wrapperLength,
      },
      ranges,
    );

    if (options.ignoreSourceCode) {
      const current = locator.getLoc(node) || loc;
      const sources = locator.getSourceLines(
        current,
        getSourceFilename(current),
      );

      if (
        sources != null &&
        options.ignoreSourceCode(sources, "function", {
          start: { line: current.start.line, column: current.start.column },
          end: { line: current.end.line, column: current.end.column },
        })
      ) {
        return;
      }
    }

    addFunction({
      coverageMapData,
      covered,
      loc,
      decl,
      filename: getSourceFilename(loc),
      name: getFunctionName(node),
    });
  }

  function onStatement(node: Node, parent?: Node) {
    if (onIgnore(parent || node, "statement")) {
      return;
    }

    const loc = locator.getLoc(node);
    if (loc === null) return;

    const covered = getCount(
      {
        startOffset: (parent || node).start + wrapperLength,
        endOffset: (parent || node).end + wrapperLength,
      },
      ranges,
    );

    if (options.ignoreSourceCode) {
      const current = (parent && locator.getLoc(parent)) || loc;
      const sources = locator.getSourceLines(
        current,
        getSourceFilename(current),
      );

      if (
        sources != null &&
        options.ignoreSourceCode(sources, "statement", {
          start: { line: current.start.line, column: current.start.column },
          end: { line: current.end.line, column: current.end.column },
        })
      ) {
        return;
      }
    }

    addStatement({
      coverageMapData,
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
    if (onIgnore(node, "branch")) {
      return;
    }

    const loc = locator.getLoc(node);
    if (loc === null) return;

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

      const location = locator.getLoc(branch);
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

    if (options.ignoreSourceCode) {
      const sources = locator.getSourceLines(loc, getSourceFilename(loc));

      if (
        sources != null &&
        options.ignoreSourceCode(sources, "branch", {
          start: { line: loc.start.line, column: loc.start.column },
          end: { line: loc.end.line, column: loc.end.column },
        })
      ) {
        return;
      }
    }

    addBranch({
      coverageMapData,
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

  function onIgnore(node: Node, type: "function" | "statement" | "branch") {
    if (!options.ignoreNode) {
      return false;
    }

    const scope = options.ignoreNode(node as T, type);

    if (scope === "ignore-this-and-nested-nodes") {
      walker.onIgnore(node);
    }

    return scope;
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
