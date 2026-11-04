// Final CPU render (no GPU in this container): one bundle, every 2nd frame (animation on twos, encoded at 30 fps),
// 540x960 buffer, ink + grade on, lens blur / bloom / MSAA off. Frames land in out/final/element-XXXX.jpeg (even numbers).
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
const out = path.resolve(process.argv[2] || "out/final"); const START = Number(process.argv[3] || 0); fs.mkdirSync(out, { recursive: true });
const inputProps = { post: { dpr: 0.5, msaa: 0, bloom: false, lens: false } };
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "SyracuseShort", chromiumOptions, inputProps });
let n = 0; const t0 = Date.now();
await renderFrames({ composition, serveUrl, inputProps, chromiumOptions, outputDir: out, imageFormat: "jpeg", jpegQuality: 92, scale: 0.5,
  everyNthFrame: 2, frameRange: [START, 1989], concurrency: 4, timeoutInMilliseconds: 300000, onStart: () => {},
  onFrameUpdate: () => { n++; if (n % 25 === 0) console.log(`${n} frames, ${((Date.now() - t0) / 1000 / n).toFixed(2)} s/frame avg, ${new Date().toTimeString().slice(0, 8)}`); } });
console.log("DONE", n, ((Date.now() - t0) / 60000).toFixed(1), "min");
