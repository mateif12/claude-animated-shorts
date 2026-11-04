// usage: node scripts/stills.mjs <compId> <outPrefix> <frame,frame,...> [scale]   (bundles once, software GL in this container)
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const tmp = process.env.REMOTION_TMP || "/home/user/remotion-tmp"; fs.mkdirSync(tmp, { recursive: true }); process.env.TMPDIR = process.env.TEMP = process.env.TMP = tmp;
const [id, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.CHROME || undefined;
const serveUrl = process.env.SERVE_URL || await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable, inputProps: JSON.parse(process.env.PROPS || "{}") });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
fs.mkdirSync(path.dirname(prefix), { recursive: true });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    chromiumOptions, browserExecutable, timeoutInMilliseconds: 300000, onBrowserLog, inputProps: JSON.parse(process.env.PROPS || "{}") });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
