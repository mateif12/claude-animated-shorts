// Look-check stills with the production profile (same size and post as the final). Use sparingly: the workflow allows
// stills of NEW or CHANGED framings only (see PRODUCTION_WORKFLOW.md); no preview videos.
// usage: node scripts/stills.mjs out/stills/x_ 120,640,1500   (frame numbers on the VIDEO timeline)
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const P = JSON.parse(fs.readFileSync("production.config.json", "utf8"));
const [prefix, frames] = process.argv.slice(2);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const inputProps = { post: P.post }, chromiumOptions = { gl: P.gl };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: P.composition, chromiumOptions, inputProps });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 90, scale: P.scale,
    chromiumOptions, inputProps, timeoutInMilliseconds: 240000 });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
