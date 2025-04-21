declare module "*?transform-result" {
  import type { SourceMap } from "rollup";
  const map: SourceMap;

  const code: string;
  export { map, code };
}
