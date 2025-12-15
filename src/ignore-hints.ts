import jsTokens from "js-tokens";

export interface IgnoreHint {
  type: "if" | "else" | "next" | "file";
  loc: { start: number; end: number };
}

const IGNORE_PATTERN =
  /^\s*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(if|else|next|file)(?=\W|$)/;

const IGNORE_LINES_PATTERN =
  /\s*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(start|stop)(?=\W|$)/;

const EOL_PATTERN = /\r?\n/g;

/**
 * Parse ignore hints from **Javascript** code based on AST
 * - Most AST parsers don't emit comments in AST like Acorn does, so parse comments manually instead.
 */
export function getIgnoreHints(code: string): IgnoreHint[] {
  const ignoreHints: IgnoreHint[] = [];
  const tokens = jsTokens(code);

  let current = 0;
  let previousTokenWasIgnoreHint = false;

  for (const token of tokens) {
    if (
      previousTokenWasIgnoreHint &&
      token.type !== "WhiteSpace" &&
      token.type !== "LineTerminatorSequence"
    ) {
      // Make the comment end reach all the way to the next node so that
      // it's easier to check for ignore hints when inspecting node, kind of like
      // leadingComments AST attribute.
      const previous = ignoreHints.at(-1);
      if (previous) {
        previous.loc.end = current;
      }
      previousTokenWasIgnoreHint = false;
    }

    if (
      token.type === "SingleLineComment" ||
      token.type === "MultiLineComment"
    ) {
      const loc = { start: current, end: current + token.value.length };
      const comment = token.value
        // Start of multiline comment
        .replace(/^\/\*\*/, "")
        .replace(/^\/\*/, "")
        // End of multiline comment
        .replace(/\*\*\/$/, "")
        .replace(/\*\/$/, "")
        // Inline comment
        .replace(/^\/\//, "");

      const groups = comment.match(IGNORE_PATTERN);
      const type = groups?.[1];

      if (type === "file") {
        return [{ type: "file", loc: { start: 0, end: 0 } }];
      }

      if (type === "if" || type === "else" || type === "next") {
        ignoreHints.push({ type, loc });
        previousTokenWasIgnoreHint = true;
      }
    }

    current += token.value.length;
  }

  return ignoreHints;
}

/**
 * Parse ignore start/stop hints from **text file** based on regular expressions
 * - Does not understand what a comment is in Javascript (or JSX, Vue, Svelte)
 * - Parses source code (JS, TS, Vue, Svelte, anything) based on text search by
 *   matching for `/* <name> ignore start *\/` pattern - not by looking for real comments
 *
 * ```js
 * /* v8 ignore start *\/
 * <!-- /* v8 ignore start *\/ -->
 * <SomeFrameworkComment content="/* v8 ignore start *\/">
 * ```
 */
export function getIgnoredLines(text?: string): Set<number> {
  if (!text) {
    return new Set();
  }

  const ranges: { start: number; stop: number }[] = [];
  let lineNumber = 0;

  for (const line of text.split(EOL_PATTERN)) {
    lineNumber++;

    const match = line.match(IGNORE_LINES_PATTERN);
    if (match) {
      const type = match[1];

      if (type === "stop") {
        const previous = ranges.at(-1);

        // Ignore whole "ignore stop" if no previous start was found
        if (previous && previous.stop === Infinity) {
          previous.stop = lineNumber;
        }

        continue;
      }

      ranges.push({ start: lineNumber, stop: Infinity });
    }
  }

  const ignoredLines = new Set<number>();

  for (const range of ranges) {
    for (let line = range.start; line <= range.stop; line++) {
      ignoredLines.add(line);

      if (line >= lineNumber) {
        break;
      }
    }
  }

  return ignoredLines;
}
