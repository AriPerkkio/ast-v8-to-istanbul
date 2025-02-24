import type {
  FunctionDeclaration,
  Program,
  Node,
  ArrowFunctionExpression,
  ReturnStatement,
  ExpressionStatement,
  BreakStatement,
  ContinueStatement,
  DebuggerStatement,
  ThrowStatement,
  TryStatement,
  IfStatement,
  ForStatement,
  ForInStatement,
  ForOfStatement,
  WhileStatement,
  DoWhileStatement,
  SwitchStatement,
  WithStatement,
  LabeledStatement,
  VariableDeclarator,
} from "estree";
import { asyncWalk } from "estree-walker";

declare module "estree" {
  interface BaseNode {
    start: number;
    end: number;
  }
}

interface Visitors {
  // Functions
  onFunctionDeclaration: (node: FunctionDeclaration) => void;
  onArrowFunctionExpression: (node: ArrowFunctionExpression) => void;

  // Statements
  onExpressionStatement: (node: ExpressionStatement) => void;
  onBreakStatement: (node: BreakStatement) => void;
  onContinueStatement: (node: ContinueStatement) => void;
  onDebuggerStatement: (node: DebuggerStatement) => void;
  onReturnStatement: (node: ReturnStatement) => void;
  onThrowStatement: (node: ThrowStatement) => void;
  onTryStatement: (node: TryStatement) => void;
  onIfStatement: (node: IfStatement) => void;
  onForStatement: (node: ForStatement) => void;
  onForInStatement: (node: ForInStatement) => void;
  onForOfStatement: (node: ForOfStatement) => void;
  onWhileStatement: (node: WhileStatement) => void;
  onDoWhileStatement: (node: DoWhileStatement) => void;
  onSwitchStatement: (node: SwitchStatement) => void;
  onWithStatement: (node: WithStatement) => void;
  onLabeledStatement: (node: LabeledStatement) => void;
  onVariableDeclarator: (node: VariableDeclarator) => void;
}
export type FunctionNodes = Parameters<
  Visitors["onArrowFunctionExpression" | "onFunctionDeclaration"]
>[0];

export async function walk(ast: Program, visitors: Visitors) {
  return await asyncWalk(ast, {
    async leave(node) {
      switch (node.type) {
        // Functions
        case "FunctionDeclaration": {
          return visitors.onFunctionDeclaration(node);
        }
        case "ArrowFunctionExpression": {
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
        case "IfStatement": {
          return visitors.onIfStatement(node);
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
        case "SwitchStatement": {
          return visitors.onSwitchStatement(node);
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
      }
    },
  });
}

export function getFunctionName(node: Node) {
  if (node.type === "Identifier") {
    return node.name;
  }

  if ("id" in node && node.id) {
    return getFunctionName(node.id);
  }
}
