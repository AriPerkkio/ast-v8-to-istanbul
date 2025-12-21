import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TraceMap } from "@jridgewell/trace-mapping";
import { type Node } from "estree";

import { type FunctionNodes, getFunctionName, type getWalker } from "./ast";
import {
  addBranch,
  addFunction,
  addStatement,
  type Branch,
  type CoverageMapData,
  createCoverageMapData,
} from "./coverage-map";
import { createEmptySourceMap, getInlineSourceMap, Locator } from "./location";
import { getCount, normalize } from "./script-coverage";
import type { Options } from "./types";

type Normalized = ReturnType<typeof normalize>;

export class CoverageMapper<T = Node> {
  private constructor(
    private locator: Locator,
    private coverageMapData: CoverageMapData,
    private ranges: Normalized,
    private wrapperLength: number,
    private directory: string,
    private onIgnoreNode: ReturnType<typeof getWalker>["onIgnore"],
    private ignoreNode?: Options<T>["ignoreNode"],
    private ignoreSourceCode?: Options<T>["ignoreSourceCode"],
  ) {}

  static async create<T = Node, Program = T & { type: "Program" }>(
    options: Options<T, Program>,
    onIgnoreNode: ReturnType<typeof getWalker>["onIgnore"],
  ): Promise<CoverageMapper<T>> {
    const filename = fileURLToPath(options.coverage.url);
    const directory = dirname(filename);

    const map = new TraceMap(
      (options.sourceMap as typeof options.sourceMap & { version: 3 }) ||
        (await getInlineSourceMap(filename, options.code)) ||
        createEmptySourceMap(filename, options.code),
    );

    return new CoverageMapper<T>(
      new Locator(options.code, map, directory),
      createCoverageMapData(filename, map),
      normalize(options.coverage),
      options.wrapperLength || 0,
      directory,
      onIgnoreNode,
      options.ignoreNode,
      options.ignoreSourceCode,
    );
  }

  onFunction(
    node: FunctionNodes,
    positions: {
      loc: Pick<Node, "start" | "end">;
      decl: Pick<Node, "start" | "end">;
    },
  ) {
    if (this.#onIgnore(node, "function")) {
      return;
    }

    const loc = this.locator.getLoc(positions.loc);
    if (loc === null) return;

    const decl = this.locator.getLoc(positions.decl);
    if (decl === null) return;

    const covered = getCount(
      {
        startOffset: node.start + this.wrapperLength,
        endOffset: node.end + this.wrapperLength,
      },
      this.ranges,
    );

    if (this.ignoreSourceCode) {
      const current = this.locator.getLoc(node) || loc;
      const sources = this.locator.getSourceLines(
        current,
        this.#getSourceFilename(current),
      );

      if (
        sources != null &&
        this.ignoreSourceCode(sources, "function", {
          start: { line: current.start.line, column: current.start.column },
          end: { line: current.end.line, column: current.end.column },
        })
      ) {
        return;
      }
    }

    addFunction({
      coverageMapData: this.coverageMapData,
      covered,
      loc,
      decl,
      filename: this.#getSourceFilename(loc),
      name: getFunctionName(node),
    });
  }

  onStatement(node: Node, parent?: Node) {
    if (this.#onIgnore(parent || node, "statement")) {
      return;
    }

    const loc = this.locator.getLoc(node);
    if (loc === null) return;

    const covered = getCount(
      {
        startOffset: (parent || node).start + this.wrapperLength,
        endOffset: (parent || node).end + this.wrapperLength,
      },
      this.ranges,
    );

    if (this.ignoreSourceCode) {
      const current = (parent && this.locator.getLoc(parent)) || loc;
      const sources = this.locator.getSourceLines(
        current,
        this.#getSourceFilename(current),
      );

      if (
        sources != null &&
        this.ignoreSourceCode(sources, "statement", {
          start: { line: current.start.line, column: current.start.column },
          end: { line: current.end.line, column: current.end.column },
        })
      ) {
        return;
      }
    }

    addStatement({
      coverageMapData: this.coverageMapData,
      loc,
      covered,
      filename: this.#getSourceFilename(loc),
    });
  }

  onBranch(type: Branch, node: Node, branches: (Node | null | undefined)[]) {
    if (this.#onIgnore(node, "branch")) {
      return;
    }

    const loc = this.locator.getLoc(node);
    if (loc === null) return;

    const locations = [];
    const covered: number[] = [];

    for (const branch of branches) {
      if (!branch) {
        locations.push({
          start: { line: undefined, column: undefined },
          end: { line: undefined, column: undefined },
        });

        const count = getCount(
          {
            startOffset: node.start + this.wrapperLength,
            endOffset: node.end + this.wrapperLength,
          },
          this.ranges,
        );
        const previous = covered.at(-1) || 0;
        covered.push(count - previous);

        continue;
      }

      const location = this.locator.getLoc(branch);
      if (location !== null) {
        locations.push(location);
      }

      const bias = branch.type === "BlockStatement" ? 1 : 0;

      covered.push(
        getCount(
          {
            startOffset: branch.start + bias + this.wrapperLength,
            endOffset: branch.end - bias + this.wrapperLength,
          },
          this.ranges,
        ),
      );
    }

    if (type === "if") {
      if (locations.length > 0) {
        locations[0] = loc;
      }
    }

    if (locations.length === 0) {
      return;
    }

    if (this.ignoreSourceCode) {
      const sources = this.locator.getSourceLines(
        loc,
        this.#getSourceFilename(loc),
      );

      if (
        sources != null &&
        this.ignoreSourceCode(sources, "branch", {
          start: { line: loc.start.line, column: loc.start.column },
          end: { line: loc.end.line, column: loc.end.column },
        })
      ) {
        return;
      }
    }

    addBranch({
      coverageMapData: this.coverageMapData,
      loc,
      locations,
      type,
      covered,
      filename: this.#getSourceFilename(loc),
    });
  }

  generate(): CoverageMapData {
    this.locator.reset();
    return this.coverageMapData;
  }

  #getSourceFilename(position: {
    start: { filename: string | null };
    end: { filename: string | null };
  }) {
    const sourceFilename = position.start.filename || position.end.filename;

    if (!sourceFilename) {
      throw new Error(
        `Missing original filename for ${JSON.stringify(position, null, 2)}`,
      );
    }

    if (sourceFilename.startsWith("file://")) {
      return fileURLToPath(sourceFilename);
    }

    return resolve(this.directory, sourceFilename);
  }

  #onIgnore(node: Node, type: "function" | "statement" | "branch") {
    if (!this.ignoreNode) {
      return false;
    }

    const scope = this.ignoreNode(node as T, type);

    if (scope === "ignore-this-and-nested-nodes") {
      this.onIgnoreNode(node);
    }

    return scope;
  }
}
