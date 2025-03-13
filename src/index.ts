import type { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import {
  allGeneratedPositionsFor,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
  type Needle,
  type SourceMapInput,
} from "@jridgewell/trace-mapping";
import type { Node } from "estree";

import { type FunctionNodes, getFunctionName, walk } from "./ast";
import {
  addBranch,
  addFunction,
  addStatement,
  type Branch,
  createCoverageMap,
} from "./coverage-map";
import { offsetToNeedle } from "./location";
import { getCount, normalize } from "./script-coverage";

export default async function convert(options: {
  code: string;
  wrapperLength?: number;
  sourceMap: SourceMapInput;
  coverage: Profiler.ScriptCoverage;
  getAst: (
    code: string,
  ) => Parameters<typeof walk>[0] | Promise<Parameters<typeof walk>[0]>;
}) {
  const wrapperLength = options.wrapperLength || 0;

  const map = new TraceMap(options.sourceMap);
  const coverageMap = createCoverageMap(options.coverage.url, map);
  const ast = await options.getAst(options.code);
  const ranges = normalize(options.coverage);

  await walk(ast, {
    // Functions
    onFunctionDeclaration(node) {
      onFunction(node, {
        loc: node.body,
        decl: node.id,
      });
    },
    onArrowFunctionExpression(node) {
      onFunction(node, {
        loc: node.body,
        decl: {
          ...node,

          // TODO: This matches Istanbul's output, but is it correct? Using 'node.end' seems more correct.
          end: node.start + 1,
        },
      });
    },
    onMethodDefinition(node) {
      onFunction(node, {
        loc: node.value.body,
        decl: node.key,
      });
    },
    onProperty(node) {
      if (node.value.type === "FunctionExpression") {
        onFunction(node, {
          loc: node.value.body,
          decl: node.key,
        });
      }
    },

    // Statements
    onExpressionStatement: onStatement,
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
    onVariableDeclarator(node) {
      if (node.init) {
        onStatement(node.init);
      }
    },

    // Branches
    onIfStatement(node) {
      onBranch("if", node, [node.consequent, node.alternate]);
      onStatement(node);
    },
    onConditionalExpression(node) {
      onBranch("cond-expr", node, [node.consequent, node.alternate]);
    },
    onLogicalExpression(node) {
      onBranch("binary-expr", node, [node.left, node.right]);
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
    const loc = getLoc(positions.loc);
    const decl = getLoc(positions.decl);

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
      filename: getFilename(loc),
      name: getFunctionName(node),
    });
  }

  function onStatement(node: Node) {
    const loc = getLoc(node);

    const covered = getCount(
      {
        startOffset: node.start + wrapperLength,
        endOffset: node.end + wrapperLength,
      },
      ranges,
    );

    addStatement({
      coverageMap,
      loc,
      covered,
      filename: getFilename(loc),
    });
  }

  function onBranch(
    type: Branch,
    node: Node,
    branches: (Node | null | undefined)[],
  ) {
    const loc = getLoc(node);

    const locations = [];
    const covered = [];

    for (const branch of branches) {
      if (!branch) {
        locations.push({
          start: { line: undefined, column: undefined },
          end: { line: undefined, coolumn: undefined },
        });

        covered.push(0);

        continue;
      }

      locations.push(getLoc(branch));

      covered.push(
        getCount(
          {
            startOffset: branch.start + wrapperLength,
            endOffset: branch.end + wrapperLength,
          },
          ranges,
        ),
      );
    }

    if (type === "if") {
      locations[0] = loc;

      if (covered[0] === 0 && covered[1] === 0) {
        covered[1] = getCount(
          {
            startOffset: node.start + wrapperLength,
            endOffset: node.end + wrapperLength,
          },
          ranges,
        );
      }
    }

    addBranch({
      coverageMap,
      loc,
      locations,
      type,
      covered,
      filename: getFilename(loc),
    });
  }

  function getPosition(needle: Needle) {
    const { line, column, source } = originalPositionFor(map, needle);

    if (line == null || column == null) {
      throw new Error(
        `Position is InvalidOriginalMapping ${JSON.stringify(
          { position: { line, column }, needle },
          null,
          2,
        )}`,
      );
    }

    return { line, column, filename: source };
  }

  function getLoc(node: Node) {
    // End-mapping tracing logic from istanbul-lib-source-maps
    const endNeedle = offsetToNeedle(node.end, options.code);
    endNeedle.column -= 1;

    const loc = {
      start: getPosition(offsetToNeedle(node.start, options.code)),
      end: getPosition(endNeedle),
    };

    const afterEndMappings = allGeneratedPositionsFor(map, {
      source: loc.end.filename!,
      line: loc.end.line,
      column: loc.end.column + 1,
      bias: LEAST_UPPER_BOUND,
    });

    if (afterEndMappings.length === 0) {
      loc.end.column = Infinity;
    } else {
      for (const mapping of afterEndMappings) {
        if (mapping.line === null) continue;

        const original = originalPositionFor(map, mapping);
        if (original.line === loc.end.line) {
          loc.end = { ...original, filename: original.source };
          break;
        }
      }
    }

    return loc;
  }

  function getFilename(position: {
    start: { filename: string | null };
    end: { filename: string | null };
  }) {
    const filename = position.start.filename || position.end.filename;

    if (!filename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(position, null, 2)}`,
      );
    }

    return fileURLToPath(new URL(filename, options.coverage.url));
  }
}
