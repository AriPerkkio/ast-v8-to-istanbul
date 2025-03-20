import type {
  ArrowFunctionExpression,
  BreakStatement,
  ContinueStatement,
  DebuggerStatement,
  DoWhileStatement,
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
  Program,
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
  onFunctionExpression: (node: FunctionExpression) => void;
  onArrowFunctionExpression: (node: ArrowFunctionExpression) => void;
  onMethodDefinition: (node: MethodDefinition) => void;
  onProperty: (node: Property) => void;

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
  onClassBody: (node: ClassBody) => void;

  // Branches
  onIfStatement: (node: IfStatement) => void;
  onSwitchStatement: (node: SwitchStatement) => void;
  onConditionalExpression: (node: ConditionalExpression) => void;
  onLogicalExpression: (node: LogicalExpression) => void;
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

export async function walk(ast: Program, visitors: Visitors) {
  return await asyncWalk(ast, {
    async enter(node) {
      switch (node.type) {
        // Functions
        case "FunctionDeclaration": {
          return visitors.onFunctionDeclaration(node);
        }
        case "FunctionExpression": {
          return visitors.onFunctionExpression(node);
        }
        case "MethodDefinition": {
          return visitors.onMethodDefinition(node);
        }
        case "Property": {
          return visitors.onProperty(node);
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
          return visitors.onClassBody(node);
        }

        // Branches
        case "IfStatement": {
          return visitors.onIfStatement(node);
        }
        case "SwitchStatement": {
          return visitors.onSwitchStatement(node);
        }
        case "ConditionalExpression": {
          return visitors.onConditionalExpression(node);
        }
        case "LogicalExpression": {
          return visitors.onLogicalExpression(node);
        }
        case "AssignmentPattern": {
          return visitors.onAssignmentPattern(node);
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
