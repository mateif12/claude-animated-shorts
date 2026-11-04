// usage: node scripts/render.mjs <out.mp4> <from> <to> [scale]
// Final render on this machine (no GPU): Vulkan via Mesa lavapipe, "lite" post set (see final/QA_REPORT.md):
// WebGL buffer 540x960 (post.dpr 0.5), ink + tone map + grade on, lens blur / bloom / MSAA off, 1024 shadow map.
import fs from "node:fs";
import path from "node:path";
const tmp = path.resolve("remotion-tmp"); fs.mkdirSync(tmp, { recursive: true }); process.env.TMPDIR = process.env.TEMP = process.env.TMP = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [out, from, to, scale = "1.3333"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "vulkan" };
const inputProps = JSON.parse(process.env.PROPS || '{"post":{"dpr":0.5,"lens":false,"bloom":false,"msaa":0,"shadow":1024}}');
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "BabylonShort", browserExecutable, chromiumOptions, inputProps });
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), frameRange: [Number(from), Number(to)],
  browserExecutable, chromiumOptions, inputProps, concurrency: Number(process.env.CONC || 1), timeoutInMilliseconds: 600000, imageFormat: "jpeg", jpegQuality: 95,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 30) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(1) + "s");
