import { btoa } from "node:buffer";

/**
 * Generates link for `https://ast.sxzz.dev`.
 *
 * See https://github.com/sxzz/ast-explorer?tab=readme-ov-file#url-encode-algorithm
 */
export function toAstExplorer(opts: {
  code: string;
  parser?: string;
  options?: Record<string, unknown>;
}) {
  const serialized = JSON.stringify({
    c: opts.code,
    p: opts.parser || "acorn",
    o: JSON.stringify(
      opts.options || { ecmaVersion: "latest", sourceType: "module" },
    ),
  });

  return `https://ast.sxzz.dev/#${btoa(serialized)}`;
}
