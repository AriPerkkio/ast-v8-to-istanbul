import { parse as BabelParser } from "@babel/parser";
import { type Node as BabelNode } from "@babel/types";
import { type Node as AcornNode, parse as AcornParser } from "acorn";
import { type Node as EstreeNode } from "estree";
import { type Node as OxcNode, parseSync as OxcParser } from "oxc-parser";
import { parseAst as ViteParser } from "vite";
import { expectTypeOf, test } from "vitest";

import { convert } from "../src";

const args = {
  code: "",
  coverage: { functions: [], url: "" },
};

test("estree, default", async () => {
  await convert({
    ...args,
    ast: ViteParser(""),
    ignoreNode(node) {
      expectTypeOf(node).toEqualTypeOf<EstreeNode>();
      expectTypeOf(node.type).toEqualTypeOf<EstreeNode["type"]>();
    },
  });
});

test("acorn", async () => {
  await convert<AcornNode>({
    ...args,
    ast: AcornParser("", { ecmaVersion: "latest" }),
    ignoreNode(node) {
      expectTypeOf(node).toEqualTypeOf<AcornNode>();
      expectTypeOf(node.type).toEqualTypeOf<AcornNode["type"]>();
    },
  });
});

test("babel", async () => {
  await convert<BabelNode>({
    ...args,
    ast: BabelParser("", {}).program,
    ignoreNode(node) {
      expectTypeOf(node).toEqualTypeOf<BabelNode>();
      expectTypeOf(node.type).toEqualTypeOf<BabelNode["type"]>();
    },
  });
});

test("oxc-parser", async () => {
  await convert<OxcNode>({
    ...args,
    ast: OxcParser("", "", {}).program,
    ignoreNode(node) {
      expectTypeOf(node).toEqualTypeOf<OxcNode>();
      expectTypeOf(node.type).toEqualTypeOf<OxcNode["type"]>();
    },
  });
});
