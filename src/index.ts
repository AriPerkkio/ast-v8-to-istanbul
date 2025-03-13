import type { Profiler } from "node:inspector";
import { fileURLToPath } from "node:url";
import {
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
import { isLocationSame, offsetToNeedle } from "./location";
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
      onStatement(node.init || node);
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
      onBranch("default-arg", { ...node, end: node.end + 1 }, [
        { ...node.right, end: node.right.end + 1 },
      ]);
    },
  });

  return coverageMap;

  function onFunction(
    node: FunctionNodes,
    positions: { loc: Node; decl: Node },
  ) {
    const loc = {
      start: getPosition(offsetToNeedle(positions.loc.start, options.code)),
      end: getPosition(offsetToNeedle(positions.loc.end, options.code)),
    };

    const decl = {
      start: getPosition(offsetToNeedle(positions.decl.start, options.code)),
      end: getPosition(offsetToNeedle(positions.decl.end + 1, options.code)),
    };

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
    const loc = {
      start: getPosition(offsetToNeedle(node.start, options.code)),
      end: getPosition(offsetToNeedle(node.end, options.code)),
    };

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
    const loc = {
      start: getPosition(offsetToNeedle(node.start, options.code)),
      end: getPosition(offsetToNeedle(node.end, options.code)),
    };

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

      const location = {
        start: getPosition(offsetToNeedle(branch.start, options.code)),
        end: getPosition(offsetToNeedle(branch.end, options.code)),
      };

      if (isLocationSame(location.start, location.end)) {
        location.end.column = Infinity;
      }

      locations.push(location);

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
