import type {
  FunctionDeclaration,
  Identifier,
  Program,
  Node,
  BlockStatement,
  ArrowFunctionExpression,
} from "estree";
import { asyncWalk } from "estree-walker";

import type { Positioned } from "./location";

type WrapPosition<T> = Positioned<T> & {
  id: Positioned<Identifier>;
  body: Positioned<BlockStatement>;
};

interface Visitors {
  onFunctionDeclaration: (node: WrapPosition<FunctionDeclaration>) => void;
  onArrowFunctionExpression: (
    node: WrapPosition<ArrowFunctionExpression>,
  ) => void;
}
export type FunctionNodes = Parameters<
  Visitors["onArrowFunctionExpression" | "onFunctionDeclaration"]
>[0];

export async function walk(ast: Program, visitors: Visitors) {
  return await asyncWalk(ast, {
    async leave(node) {
      switch (node.type) {
        case "FunctionDeclaration": {
          return visitors.onFunctionDeclaration(node as any);
        }
        case "ArrowFunctionExpression": {
          return visitors.onArrowFunctionExpression(node as any);
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
