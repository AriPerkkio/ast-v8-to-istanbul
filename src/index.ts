import { type Node } from "estree";
import type { CoverageMapData } from "istanbul-lib-coverage";

import { getWalker } from "./ast";
import { CoverageMapper } from "./coverage-mapper";
import { getIgnoreHints } from "./ignore-hints";
import { type Options } from "./types";

export { convert, Options };

/**
 * Maps V8 `ScriptCoverage` to Istanbul's `CoverageMap`.
 * Results are identical with `istanbul-lib-instrument`.
 */
export default async function convert<
  T = Node,
  Program = T & { type: "Program" },
>(options: Options<T, Program>): Promise<CoverageMapData> {
  const ignoreHints = getIgnoreHints(options.code);

  // File ignore contains always only 1 entry
  if (ignoreHints.length === 1 && ignoreHints[0].type === "file") {
    return {};
  }

  const walker = getWalker();
  const mapper = await CoverageMapper.create<T, Program>(
    options,
    walker.onIgnore,
  );
  const ast = await options.ast;

  await walker.walk(ast, ignoreHints, options.ignoreClassMethods, {
    // Functions
    onFunctionDeclaration(node) {
      mapper.onFunction(node, {
        loc: node.body,
        decl: node.id || { ...node, end: node.start + 1 },
      });
    },
    onFunctionExpression(node) {
      if (isCovered(node)) {
        return;
      }

      mapper.onFunction(node, {
        loc: node.body,
        decl: node.id || { ...node, end: node.start + 1 },
      });
    },
    onArrowFunctionExpression(node) {
      mapper.onFunction(node, {
        loc: node.body,
        decl: { ...node, end: node.start + 1 },
      });

      // Implicit return-statement of bodyless arrow function
      if (node.body.type !== "BlockStatement") {
        mapper.onStatement(node.body, node);
      }
    },
    onMethodDefinition(node) {
      if (node.value.type === "FunctionExpression") {
        setCovered(node.value);
      }

      mapper.onFunction(node, {
        loc: node.value.body,
        decl: node.key,
      });
    },
    onProperty(node) {
      if (node.value.type === "FunctionExpression") {
        setCovered(node.value);

        mapper.onFunction(node, {
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

      mapper.onFunction(node, {
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

      mapper.onFunction(node, {
        loc: node.body,
        decl: {
          start: babelNode.key.start!,
          end: babelNode.key.end!,
        },
      });
    },

    // Statements
    onBreakStatement: (node) => mapper.onStatement(node),
    onContinueStatement: (node) => mapper.onStatement(node),
    onDebuggerStatement: (node) => mapper.onStatement(node),
    onReturnStatement: (node) => mapper.onStatement(node),
    onThrowStatement: (node) => mapper.onStatement(node),
    onTryStatement: (node) => mapper.onStatement(node),
    onForStatement: (node) => mapper.onStatement(node),
    onForInStatement: (node) => mapper.onStatement(node),
    onForOfStatement: (node) => mapper.onStatement(node),
    onWhileStatement: (node) => mapper.onStatement(node),
    onDoWhileStatement: (node) => mapper.onStatement(node),
    onWithStatement: (node) => mapper.onStatement(node),
    onLabeledStatement: (node) => mapper.onStatement(node),
    onExpressionStatement(node) {
      if (
        node.expression.type === "Literal" &&
        node.expression.value === "use strict"
      ) {
        return;
      }

      mapper.onStatement(node);
    },
    onVariableDeclarator(node) {
      if (node.init) {
        mapper.onStatement(node.init, node);
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
          mapper.onStatement(child.value as Node);
        }
      }
    },

    // Branches
    onIfStatement(node, branches) {
      mapper.onBranch("if", node, branches);
      mapper.onStatement(node);
    },
    onConditionalExpression(node, branches) {
      mapper.onBranch("cond-expr", node, branches);
    },
    onLogicalExpression(node, branches) {
      mapper.onBranch("binary-expr", node, branches);
    },
    onSwitchStatement(node, cases) {
      mapper.onBranch("switch", node, cases);
      mapper.onStatement(node);
    },
    onAssignmentPattern(node) {
      mapper.onBranch("default-arg", node, [node.right]);
    },
  });

  return mapper.generate();
}

const coveredNodes = new WeakSet<Node>();

function setCovered(node: Node) {
  coveredNodes.add(node);
}

function isCovered(node: Node) {
  return coveredNodes.has(node);
}
