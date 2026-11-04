// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]
import fs from "node:fs";
import path from "node:path";
const tmp = path.resolve("remotion-tmp"); fs.mkdirSync(tmp, { recursive: true }); process.env.TMPDIR = process.env.TEMP = process.env.TMP = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition, openBrowser } = await import("@remotion/renderer");
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "vulkan" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const puppeteerInstance = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const inputProps = JSON.parse(process.env.PROPS || "{}");
const composition = await selectComposition({ serveUrl, id: "BabylonShort", puppeteerInstance, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
fs.mkdirSync(path.dirname(prefix), { recursive: true });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    inputProps, puppeteerInstance, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
await puppeteerInstance.close({ silent: true });
