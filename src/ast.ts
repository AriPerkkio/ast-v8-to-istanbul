import {
  type ObjectMethod,
  type ClassMethod,
  type ClassBody as BabelClassBody,
  type Node as BabelNode,
} from "@babel/types";
import type {
  ArrowFunctionExpression,
  BreakStatement,
  ContinueStatement,
  DebuggerStatement,
  DoWhileStatement,
  Expression,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  LabeledStatement,
  MethodDefinition,
  Node,
  Property,
  ReturnStatement,
  SwitchStatement,
  ThrowStatement,
  TryStatement,
  VariableDeclarator,
  WhileStatement,
  WithStatement,
  ConditionalExpression,
  LogicalExpression,
  AssignmentPattern,
  FunctionExpression,
  ClassBody,
  BlockStatement,
} from "estree";
import { asyncWalk } from "estree-walker";
import { type IgnoreHint } from "./ignore-hints";

declare module "estree" {
  interface BaseNode {
    start: number;
    end: number;
  }
}

type ParenthesizedExpression = {
  type: "ParenthesizedExpression";
  expression: Expression;
};

interface Visitors {
  // Functions
  onFunctionDeclaration: (node: FunctionDeclaration) => void;
  onFunctionExpression: (node: FunctionExpression) => void;
  onArrowFunctionExpression: (node: ArrowFunctionExpression) => void;
  onMethodDefinition: (node: MethodDefinition) => void;
  onProperty: (node: Property) => void;
  onClassMethod: (node: ClassMethod) => void;
  onObjectMethod: (node: ObjectMethod) => void;

  // Statements
  onExpressionStatement: (node: ExpressionStatement) => void;
  onBreakStatement: (node: BreakStatement) => void;
  onContinueStatement: (node: ContinueStatement) => void;
  onDebuggerStatement: (node: DebuggerStatement) => void;
  onReturnStatement: (node: ReturnStatement) => void;
  onThrowStatement: (node: ThrowStatement) => void;
  onTryStatement: (node: TryStatement) => void;
  onForStatement: (node: ForStatement) => void;
  onForInStatement: (node: ForInStatement) => void;
  onForOfStatement: (node: ForOfStatement) => void;
  onWhileStatement: (node: WhileStatement) => void;
  onDoWhileStatement: (node: DoWhileStatement) => void;
  onWithStatement: (node: WithStatement) => void;
  onLabeledStatement: (node: LabeledStatement) => void;
  onVariableDeclarator: (node: VariableDeclarator) => void;
  onClassBody: (node: ClassBody | BabelClassBody) => void;

  // Branches
  onIfStatement: (
    node: IfStatement,
    branches: (Node | null | undefined)[],
  ) => void;
  onSwitchStatement: (node: SwitchStatement) => void;
  onConditionalExpression: (node: ConditionalExpression) => void;
  onLogicalExpression: (
    node: LogicalExpression,
    branches: (Node | null | undefined)[],
  ) => void;
  onAssignmentPattern: (node: AssignmentPattern) => void;
}
export type FunctionNodes = Parameters<
  Visitors[
    | "onArrowFunctionExpression"
    | "onFunctionDeclaration"
    | "onFunctionExpression"
    | "onMethodDefinition"
    | "onProperty"]
>[0];

export async function walk(
  ast: unknown,
  ignoreHints: IgnoreHint[],
  ignoreClassMethods: string[] | undefined,
  visitors: Visitors,
) {
  let nextIgnore: Node | false = false;

  return await asyncWalk(ast as Node, {
    async enter(node) {
      if (nextIgnore !== false) {
        return;
      }

      const hint = getIgnoreHint(node);

      if (hint === "next") {
        nextIgnore = node;
        return;
      }

      if (isSkipped(node)) {
        nextIgnore = node;
      }

      switch (node.type) {
        // Functions
        case "FunctionDeclaration": {
          return visitors.onFunctionDeclaration(node);
        }
        case "FunctionExpression": {
          if (ignoreClassMethods && node.id?.name) {
            if (ignoreClassMethods.includes(node.id.name)) {
              nextIgnore = node;
              return;
            }
          }
          return visitors.onFunctionExpression(node);
        }
        case "MethodDefinition": {
          return visitors.onMethodDefinition(node);
        }
        case "Property": {
          return visitors.onProperty(node);
        }
        case "ArrowFunctionExpression": {
          // Get inner body in cases where parenthesis are preserverd, e.g. acorn, oxc: https://oxc.rs/docs/learn/ecmascript/grammar.html#parenthesized-expression
          if (
            (node.body as unknown as ParenthesizedExpression)?.type ===
            "ParenthesizedExpression"
          ) {
            node.body = (
              node.body as unknown as ParenthesizedExpression
            ).expression;
          }

          return visitors.onArrowFunctionExpression(node);
        }

        // Statements
        case "ExpressionStatement": {
          return visitors.onExpressionStatement(node);
        }
        case "BreakStatement": {
          return visitors.onBreakStatement(node);
        }
        case "ContinueStatement": {
          return visitors.onContinueStatement(node);
        }
        case "DebuggerStatement": {
          return visitors.onDebuggerStatement(node);
        }
        case "ReturnStatement": {
          return visitors.onReturnStatement(node);
        }
        case "ThrowStatement": {
          return visitors.onThrowStatement(node);
        }
        case "TryStatement": {
          return visitors.onTryStatement(node);
        }
        case "ForStatement": {
          return visitors.onForStatement(node);
        }
        case "ForInStatement": {
          return visitors.onForInStatement(node);
        }
        case "ForOfStatement": {
          return visitors.onForOfStatement(node);
        }
        case "WhileStatement": {
          return visitors.onWhileStatement(node);
        }
        case "DoWhileStatement": {
          return visitors.onDoWhileStatement(node);
        }
        case "WithStatement": {
          return visitors.onWithStatement(node);
        }
        case "LabeledStatement": {
          return visitors.onLabeledStatement(node);
        }
        case "VariableDeclarator": {
          return visitors.onVariableDeclarator(node);
        }
        case "ClassBody": {
          const classBody = node as ClassBody | BabelClassBody;

          if (ignoreClassMethods) {
            for (const child of classBody.body) {
              if (
                child.type === "MethodDefinition" ||
                child.type === "ClassMethod"
              ) {
                const name = child.key.type === "Identifier" && child.key.name;

                if (name && ignoreClassMethods.includes(name)) {
                  setSkipped(child);
                }
              }
            }

            classBody.body = classBody.body.filter(
              (child) => !isSkipped(child),
            ) as typeof classBody.body;
          }

          return visitors.onClassBody(classBody);
        }

        // Branches
        case "IfStatement": {
          const branches = [];

          if (node.consequent.type !== "BlockStatement") {
            node.consequent = {
              type: "BlockStatement",
              body: [node.consequent],
              start: node.consequent.start,
              end: node.consequent.end,
            } satisfies BlockStatement;
          }

          if (node.alternate && node.alternate.type !== "BlockStatement") {
            node.alternate = {
              type: "BlockStatement",
              body: [node.alternate],
              start: node.alternate.start,
              end: node.alternate.end,
            } satisfies BlockStatement;
          }

          if (hint === "if") {
            setSkipped(node.consequent);
          } else {
            branches.push(node.consequent);
          }

          if (hint === "else" && node.alternate) {
            setSkipped(node.alternate);
          } else if (hint !== "if") {
            branches.push(node.alternate);
          }

          return visitors.onIfStatement(node, branches);
        }
        case "SwitchStatement": {
          return visitors.onSwitchStatement(node);
        }
        case "ConditionalExpression": {
          return visitors.onConditionalExpression(node);
        }
        case "LogicalExpression": {
          if (isSkipped(node)) return;

          const branches: Node[] = [];

          function visit(child: Node) {
            if (child.type === "LogicalExpression") {
              setSkipped(child);

              if (getIgnoreHint(child) !== "next") {
                visit(child.left);
                return visit(child.right);
              }
            }
            branches.push(child);
          }

          visit(node);
          return visitors.onLogicalExpression(node, branches);
        }
        case "AssignmentPattern": {
          return visitors.onAssignmentPattern(node);
        }

        // @ts-expect-error -- Babel AST
        case "ClassMethod": {
          return visitors.onClassMethod(node);
        }

        // @ts-expect-error -- Babel AST
        case "ObjectMethod": {
          return visitors.onObjectMethod(node);
        }
      }
    },
    async leave(node) {
      if (node === nextIgnore) {
        nextIgnore = false;
      }
    },
  });

  function getIgnoreHint(node: Node) {
    for (const hint of ignoreHints) {
      if (hint.loc.end === node.start) {
        return hint.type;
      }
    }

    return null;
  }
}

export function getFunctionName(node: Node | BabelNode) {
  if (node.type === "Identifier") {
    return node.name;
  }

  if ("id" in node && node.id) {
    return getFunctionName(node.id);
  }
}

function setSkipped(node: Node | BabelNode) {
  // @ts-expect-error -- internal
  node.__skipped = true;
}

function isSkipped(node: Node | BabelNode) {
  // @ts-expect-error -- internal
  return node.__skipped === true;
}
