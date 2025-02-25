import { btoa } from "node:buffer";
import { strFromU8, strToU8, zlibSync } from "fflate";

export function toAstExplorer(options: { code: string }) {
  const serialized = JSON.stringify({
    c: options.code,
    p: "acorn",
    o: '{\n  "ecmaVersion": "latest",\n  "sourceType": "module"\n}',
  });

  return `https://ast.sxzz.dev/#${utoa(serialized)}`;
}

function utoa(data) {
  const buffer = strToU8(data);
  const zipped = zlibSync(buffer, { level: 9 });
  const binary = strFromU8(zipped, true);

  return btoa(binary);
}
