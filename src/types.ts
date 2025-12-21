import type { Profiler } from "node:inspector";
import { type EncodedSourceMap } from "@jridgewell/trace-mapping";
import { type Node } from "estree";

export interface Options<T = Node, Program = T & { type: "Program" }> {
  /** Code of the executed runtime file, not the original source file */
  code: string;

  /** Length of the execution wrapper, e.g. wrapper used in node:vm */
  wrapperLength?: number;

  /** Source map for the current file */
  sourceMap?: Omit<EncodedSourceMap, "version"> & { version: number };

  /** ScriptCoverage for the current file */
  coverage: Pick<Profiler.ScriptCoverage, "functions" | "url">;

  /** AST for the transpiled file that matches the coverage results */
  ast: Program | Promise<Program>;

  /** Class method names to ignore for coverage, identical to https://github.com/istanbuljs/nyc?tab=readme-ov-file#ignoring-methods */
  ignoreClassMethods?: string[];

  /** Filter to ignore code based on AST nodes */
  ignoreNode?: (
    node: T,
    type: "function" | "statement" | "branch",
  ) => boolean | "ignore-this-and-nested-nodes" | void;

  /**
   * Filter to ignore code based on source code
   * - Note that this is slower than `ignoreNode` as exclusion happens after remapping
   */
  ignoreSourceCode?: (
    code: string,
    type: "function" | "statement" | "branch",
    location: Record<"start" | "end", { line: number; column: number }>,
  ) => boolean | void;
}
