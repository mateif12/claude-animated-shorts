// Final render with the production profile (production.config.json): one bundle, every `drawEvery`-th frame
// (animation on twos), native `scale` size, profile post toggles. Frames go to out/frames/chunk_<startFrame>/;
// an interrupted render resumes from the next missing drawing (run the same command again).
// Prints progress with the projected total time; warns when the projection exceeds the render budget.
// usage: node scripts/render.mjs [--from N] [--to N]   (frame numbers; default = the whole video)
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
const P = JSON.parse(fs.readFileSync("production.config.json", "utf8"));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : undefined; };
if (!fs.existsSync("voice.mp3") || !fs.existsSync("voice/warp.json") || !fs.existsSync("voice/voice.wav")) {
  console.error("\n*** NARRATION MISSING OR NOT ANALYZED: put voice.mp3 in the episode folder and run: python3 scripts/analyze_voice.py\n");
  process.exit(2);
}
const inputProps = { post: P.post };
const chromiumOptions = { gl: P.gl };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: P.composition, chromiumOptions, inputProps });
const N = P.drawEvery, last = Math.min(arg("--to") ?? composition.durationInFrames - 1, composition.durationInFrames - 1);
// resume: frames already on disk (each chunk dir holds drawings start, start+N, ...)
const root = path.resolve("out/frames"); fs.mkdirSync(root, { recursive: true });
let next = arg("--from") ?? 0;
for (const d of fs.readdirSync(root).filter((x) => x.startsWith("chunk_")).sort((a, b) => +a.slice(6) - +b.slice(6))) {
  const s = +d.slice(6), n = fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith(".jpeg")).length;
  if (s <= next) next = Math.max(next, s + n * N);
}
next = Math.ceil(next / N) * N;
const total = Math.floor(last / N) - Math.floor(next / N) + 1;
if (total <= 0) { console.log("all drawings already rendered"); process.exit(0); }
const dir = path.join(root, `chunk_${String(next).padStart(5, "0")}`); fs.mkdirSync(dir, { recursive: true });
console.log(`rendering frames ${next}..${last} every ${N} (${total} drawings) at scale ${P.scale} -> ${dir}`);
let n = 0, tFirst = 0; const t0 = Date.now();
await renderFrames({ composition, serveUrl, inputProps, chromiumOptions, outputDir: dir, imageFormat: "jpeg", jpegQuality: P.jpegQuality,
  scale: P.scale, everyNthFrame: N, frameRange: [next, last], concurrency: P.concurrency, timeoutInMilliseconds: 300000, onStart: () => {},
  onFrameUpdate: () => {
    n++; if (n === 1) tFirst = Date.now();
    if (n % 25 === 0 || n === total) {
      const per = (Date.now() - tFirst) / 1000 / Math.max(1, n - 1), eta = ((total - n) * per) / 60, el = (Date.now() - t0) / 60000;
      const warn = el + eta > P.budgetMinutes.render ? `  !! projected ${(el + eta).toFixed(0)} min > render budget ${P.budgetMinutes.render} min (see PRODUCTION_WORKFLOW.md, 'over budget')` : "";
      console.log(`${n}/${total} drawings, ${per.toFixed(2)} s/drawing, elapsed ${el.toFixed(1)} min, ETA ${eta.toFixed(1)} min, ${new Date().toTimeString().slice(0, 8)}${warn}`);
    }
  } });
fs.writeFileSync("out/render_meta.json", JSON.stringify({ frames: composition.durationInFrames, drawEvery: N, fps: P.output.fps, scale: P.scale }, null, 1));
console.log("DONE", n, "drawings in", ((Date.now() - t0) / 60000).toFixed(1), "min");
