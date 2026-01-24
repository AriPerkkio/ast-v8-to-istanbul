/*
 * Slightly modified version of https://github.com/AriPerkkio/vite-plugin-source-map-visualizer/blob/main/src/generate-link.ts
 */

/*
 * Slightly modified version of `serializeForSourcemapsVisualizer` from `vite-plugin-inspect`
 *
 * Original code: https://github.com/antfu-collective/vite-plugin-inspect/blob/6c5b6b2c8bdb20883ae3d5d8d94a189300d3daa6/src/client/logic/utils.ts#L59
 *
 * Original license:
 *
 * MIT License
 *
 * Copyright (c) 2021-PRESENT Anthony Fu <https://github.com/antfu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import type { TransformResult } from "vite";

export function toVisualizer(transformResult: Pick<TransformResult, "code" | "map">) {
  const code = transformResult.code;
  const map = JSON.stringify(transformResult.map);
  const encoder = new TextEncoder();

  // Convert the strings to Uint8Array
  const codeArray = encoder.encode(code);
  const mapArray = encoder.encode(map);

  // Create Uint8Array for the lengths
  const codeLengthArray = encoder.encode(codeArray.length.toString());
  const mapLengthArray = encoder.encode(mapArray.length.toString());

  // Combine the lengths and the data
  const combinedArray = new Uint8Array(
    codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length + 1 + mapArray.length,
  );

  combinedArray.set(codeLengthArray);
  combinedArray.set([0], codeLengthArray.length);
  combinedArray.set(codeArray, codeLengthArray.length + 1);
  combinedArray.set(mapLengthArray, codeLengthArray.length + 1 + codeArray.length);
  combinedArray.set([0], codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length);
  combinedArray.set(
    mapArray,
    codeLengthArray.length + 1 + codeArray.length + mapLengthArray.length + 1,
  );

  // Convert the Uint8Array to a binary string
  let binary = "";
  const len = combinedArray.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(combinedArray[i]);

  // Convert the binary string to a base64 string and return it
  return `https://evanw.github.io/source-map-visualization#${btoa(binary)}`;
}
