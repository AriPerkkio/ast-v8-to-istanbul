import { asyncWalk } from "estree-walker";
import type { FunctionDeclaration, Identifier, Program, Node } from "estree";

import type { Positioned } from "./location";

export async function walk(
  ast: Program,
  visitors: {
    onFunctionDeclaration: (
      node: Positioned<FunctionDeclaration> & { id: Positioned<Identifier> }
    ) => void;
  }
) {
  return await asyncWalk(ast, {
    async leave(node) {
      switch (node.type) {
        case "FunctionDeclaration": {
          visitors.onFunctionDeclaration(node as any);
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
