/*
 * Most parsers don't emit comments in AST like Acorn does,
 * so parse comments manually instead.
 */

import jsTokens from "js-tokens";

export interface IgnoreHint {
  type: "if" | "else" | "next" | "file";
  loc: { start: number; end: number };
}

const IGNORE_PATTERN =
  /^\s*(?:istanbul|[cv]8|node:coverage)\s+ignore\s+(if|else|next|file)(?=\W|$)/;

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
