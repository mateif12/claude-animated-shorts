// Render-cost benchmark: one bundle, several post/resolution configs over the same frames; reports s/frame
// measured between the first and last rendered frame (excludes bundling, browser and world start-up).
// usage: node scripts/bench.mjs <outDir> <from> <to>
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
const [out, from, to] = process.argv.slice(2);
const CONFIGS = [
  { name: "A_native1440_fullpost", scale: 1.3333333, post: { msaa: 4 } },
  { name: "B_native1440_lite", scale: 1.3333333, post: { msaa: 0, bloom: false } },
  { name: "C_native1080_lite", scale: 1, post: { msaa: 0, bloom: false } },
  { name: "D_720_lite", scale: 0.6666667, post: { dpr: 0.6666667, msaa: 0, bloom: false } },
].filter((c) => !process.env.ONLY || process.env.ONLY.split(",").includes(c.name[0]));
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
for (const c of CONFIGS) {
  const inputProps = { post: c.post };
  const composition = await selectComposition({ serveUrl, id: "SyracuseShort", chromiumOptions, inputProps });
  const dir = path.join(out, c.name); fs.mkdirSync(dir, { recursive: true });
  const times = [];
  await renderFrames({ composition, serveUrl, inputProps, chromiumOptions, outputDir: dir, imageFormat: "jpeg", jpegQuality: 94, scale: c.scale,
    frameRange: [Number(from), Number(to)], concurrency: 4, timeoutInMilliseconds: 300000,
    onStart: () => {}, onFrameUpdate: () => times.push(Date.now()) });
  const n = times.length, per = n > 1 ? (times[n - 1] - times[0]) / 1000 / (n - 1) : NaN;
  console.log(`${c.name}: ${n} frames, ${per.toFixed(2)} s/frame (steady state)`);
}
