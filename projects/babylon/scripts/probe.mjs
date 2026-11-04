import fs from "node:fs"; import path from "node:path";
const tmp = path.resolve("remotion-tmp"); fs.mkdirSync(tmp, { recursive: true }); process.env.TMPDIR = process.env.TEMP = process.env.TMP = tmp;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const configs = JSON.parse(process.argv[2]);
const [f0, f1] = (process.argv[3] || "300,303").split(",").map(Number);
for (const [name, props, gl] of configs) {
  const chromiumOptions = { gl };
  const composition = await selectComposition({ serveUrl, id: "BabylonShort", browserExecutable, chromiumOptions, inputProps: props });
  const t0 = Date.now(); let last = t0;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: `${process.cwd()}/p_${name}.mp4`, frameRange: [f0, f1], inputProps: props,
    browserExecutable, chromiumOptions, concurrency: 1, timeoutInMilliseconds: 600000,
    onProgress: ({ renderedFrames }) => { const n = Date.now(); if (renderedFrames) console.log(name, "frame", renderedFrames, ((n - last) / 1000).toFixed(1) + "s"); last = n; } });
}
