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
  createCoverageMap,
} from "./coverage-map";
import { offsetToNeedle } from "./location";

export default async function convert(options: {
  code: string;
  wrapperLength?: number;
  sourceMap: SourceMapInput;
  coverage: Profiler.ScriptCoverage;
  getAst: (
    code: string,
  ) => Parameters<typeof walk>[0] | Promise<Parameters<typeof walk>[0]>;
  debug?: boolean;
}) {
  const wrapperLength = options.wrapperLength || 0;

  const map = new TraceMap(options.sourceMap);

  const coverageMap = createCoverageMap(options.coverage.url, map);
  const ast = await options.getAst(options.code);

  if (options.debug) {
    await debugMappings(map);
  }

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
    onSwitchStatement: onStatement,
    onWithStatement: onStatement,
    onLabeledStatement: onStatement,
    onVariableDeclarator(node) {
      onStatement(node.init || node);
    },

    // Branches
    onIfStatement(node) {
      onBranch(node, [node, node.alternate]);
      onStatement(node);
    },
    onSwitchCase() {},
    onConditionalExpression() {},
    onLogicalExpression() {},
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

    let covered = 0;
    const start = node.start + wrapperLength;
    const end = node.end + wrapperLength;

    for (const { ranges } of options.coverage.functions) {
      for (const range of ranges) {
        if (
          range.count &&
          range.startOffset === start &&
          range.endOffset === end
        ) {
          covered += range.count;
          // TODO: Can we break the loop here?
        }
      }
    }

    const originalFilename = loc.start.filename || loc.end.filename;

    if (!originalFilename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(loc, null, 2)}`,
      );
    }

    addFunction({
      coverageMap,
      covered,
      loc,
      decl,
      filename: fileURLToPath(new URL(originalFilename, options.coverage.url)),
      name: getFunctionName(node),
    });
  }

  function onStatement(node: Node) {
    const loc = {
      start: getPosition(offsetToNeedle(node.start, options.code)),
      end: getPosition(offsetToNeedle(node.end, options.code)),
    };

    const originalFilename = loc.start.filename || loc.end.filename;

    if (!originalFilename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(loc, null, 2)}`,
      );
    }

    const start = node.start + wrapperLength;
    const end = node.end + wrapperLength;

    let closest: Profiler.CoverageRange = {
      count: 0,
      startOffset: -1,
      endOffset: Infinity,
    };

    for (const { ranges } of options.coverage.functions) {
      for (const range of ranges) {
        if (
          // Node is between the range
          range.startOffset <= start &&
          end <= range.endOffset &&
          // Range is inside the previous one
          range.startOffset > closest.startOffset &&
          range.endOffset < closest.endOffset
        ) {
          closest = range;
        }
      }
    }

    addStatement({
      coverageMap,
      loc,
      covered: closest.count,
      filename: fileURLToPath(new URL(originalFilename, options.coverage.url)),
    });
  }

  function onBranch(node: Node, branches: (Node | null | undefined)[]) {
    const loc = {
      start: getPosition(offsetToNeedle(node.start, options.code)),
      end: getPosition(offsetToNeedle(node.end, options.code)),
    };

    const locations = branches.map((location) => {
      if (!location) {
        return {
          start: { line: undefined, column: undefined },
          end: { line: undefined, coolumn: undefined },
        };
      }

      return {
        start: getPosition(offsetToNeedle(location.start, options.code)),
        end: getPosition(offsetToNeedle(location.end, options.code)),
      };
    });

    const originalFilename = loc.start.filename || loc.end.filename;

    if (!originalFilename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(loc, null, 2)}`,
      );
    }

    const start = node.start + wrapperLength;
    const end = node.end + wrapperLength;
    const offsets = branches.map((branch) =>
      branch
        ? {
            start: branch?.start + wrapperLength,
            end: branch?.end + wrapperLength,
          }
        : null,
    );

    const closest: Profiler.CoverageRange[] = locations.map(() => ({
      startOffset: -1,
      endOffset: Infinity,
      count: 0,
    }));

    for (const { ranges } of options.coverage.functions) {
      for (const range of ranges) {
        // Node must be between the overall range
        if (range.startOffset > start || end > range.endOffset) {
          continue;
        }

        for (const [index, branch] of offsets.entries()) {
          if (!branch) {
            continue;
          }

          // Node must be between the branch
          if (
            range.startOffset > branch.start &&
            branch.end > range.endOffset
          ) {
            continue;
          }

          // Range is inside the previous one
          if (
            range.startOffset > closest[index].startOffset &&
            range.endOffset < closest[index].endOffset
          ) {
            closest[index] = range;
          }
        }
      }
    }

    addBranch({
      coverageMap,
      loc,
      locations,
      type: "if",
      covered: closest.map((range) => range.count),
      filename: fileURLToPath(new URL(originalFilename, options.coverage.url)),
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
}

async function debugMappings(map: TraceMap) {
  const { eachMapping } = await import("@jridgewell/trace-mapping");

  console.log("Mappings:");
  eachMapping(map, (mapping) => {
    console.log({
      from: { line: mapping.originalLine, col: mapping.originalColumn },
      to: { line: mapping.generatedLine, col: mapping.generatedColumn },
    });
  });
}
