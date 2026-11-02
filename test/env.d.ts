declare module "*?transform-result" {
  import type { Rollup } from "vite";
  const map: Rollup.SourceMap;

  const code: string;
  export { map, code };
}
