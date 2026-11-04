// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxNote, fxBurst, fxSplash, fxStars, fxRing, fxShadow, fxContact, fxPuff, fxFish, fxArrow, fxSweat, fxBang,
  Outfit, Expr, FrontOpts, SideOpts, LUCIUS, MARCELLUS, ARCHIMEDES, legionary,
} from "./toon";
import {
  FPS, SHOTS, V3, smooth, clamp01, ARCH, WALL_H, flagSpot, victim, SHIP_L, BOW_Z, BOULDERS, ARROWS, LOOPS, SAMB_X, ladderAt, ladderTop, HIT_T,
  stickOut, STICK_X, PARAPET, LADDERS, FLAG, DECK,
} from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; face?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const LEG = [0, 1, 2, 3].map((v) => legionary(v));
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 6 ? [720, 1200, 1.2] : d < 14 ? [420, 700, 0.7] : [240, 400, 0.4]; // sized for the 540x960 CPU render

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the Syracuse cast by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const LUC: Who = { i: 7, o: LUCIUS, okey: "luc" };
const ARC: Who = { i: 3, o: ARCHIMEDES, okey: "arc" };
const legW = (i: number): Who => ({ i: i + 20, o: LEG[i % 4], okey: `leg${i % 4}` });

/** Marcellus' plume = his dignity: springs between targets (overshoot on the way up, droop on the way down) */
const PLUME: [number, number][] = [[0, 1], [25.05, 0.72], [27.3, 0.5], [30.02, 0.3], [31.6, 0.45], [34.85, 0.22], [37.9, 1.0], [39.7, 0.0], [62.9, 1.0], [64.95, 0.15]];
export const plumeAt = (t: number) => {
  let v = PLUME[0][1];
  for (let i = 1; i < PLUME.length; i++) {
    const [t0, tgt] = PLUME[i];
    if (t < t0) break;
    const u = t - t0, prev = v;
    v = tgt + (prev - tgt) * Math.exp(-5 * u) * Math.cos(13 * u);
  }
  return clamp01(v + (t > 22.9 && t < 23.7 ? 0.04 * Math.sin(t * 60) : 0)); // shiver while the ship stands on its tail
};
const marcO = (t: number, helmet = true): Outfit => helmet ? { ...MARCELLUS, plume: q(plumeAt(t), 40) } : { ...MARCELLUS, hat: "hair", hair: "#3a2a20" } as Outfit;
const MW = (t: number, helmet = true): Who => ({ i: 5, o: marcO(t, helmet), okey: `mar${helmet ? q(plumeAt(t), 40) : "bare"}` });

const fig = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, t: number, opts: { scale?: number; noBlob?: boolean; mirror?: boolean } = {}) => {
  const blink = fo.blink ?? lidAt(t, who.i);
  out.places.push({ ...person(cam, who, x, y, z, { side: false, mirror: false }, { ...fo, blink }, {}, opts.scale ?? 1), ...(opts.mirror ? { mirror: true } : {}) });
  if (!opts.noBlob && fo.mode !== "fall") blob(out, x, y, z, opts.scale ?? 1);
};
const sideFig = (out: Stage, cam: CamInfo, who: Who, x: number, y: number, z: number, so: SideOpts, t: number, mirror: boolean) => {
  out.places.push(person(cam, who, x, y, z, { side: true, mirror }, {}, { ...so, blink: so.blink ?? lidAt(t, who.i) }));
  blob(out, x, y, z);
};
const splash = (out: Stage, t: number, t0: number, x: number, z: number, s: number, dur = 1.1) => {
  const u = (t - t0) / dur;
  if (u < 0 || u >= 1) return;
  out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x, y: 2.6 * s, z, w: 7 * s, h: 7 * s });
};
const burst = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s = 1) => {
  const u = (t - t0) / 0.2;
  if (u < 0 || u >= 1) return;
  out.fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30)), x, y, z, w: s, h: s });
};
const sweat = (out: Stage, cam: CamInfo, t: number, x: number, y: number, z: number, k = 1) => {
  const u = (t * 1.3) % 1;
  out.fx.push({ key: "sweat", cw: 200, ch: 200, draw: fxSweat, x: x + cam.right.x * 0.42, y: y + 2.05 - 0.25 * u, z: z + cam.right.z * 0.42, w: 0.16 * k, h: 0.16 * k });
};
const ex = (t: number, steps: [number, Expr][]): Expr => { let e = steps[0][1]; for (const [t0, v] of steps) if (t >= t0 - LEAD) e = v; return e; };

/** the deck crew of the flagship: Marcellus at the bow, Lucius beside him */
const flagCrew = (out: Stage, cam: CamInfo, id: number, t: number, mE: Expr, lE: Expr, mo: Partial<FrontOpts> = {}, lo: Partial<FrontOpts> = {}) => {
  const m = flagSpot(id, t, "marcellus"), l = flagSpot(id, t, "lucius");
  fig(out, cam, MW(t), m[0], m[1], m[2], { mode: "stand", expr: mE, facing: 0, ...mo }, t);
  fig(out, cam, LUC, l[0], l[1], l[2], { mode: "stand", expr: lE, prop: ["scutum", 0], ...lo }, t);
};
/** where on the victim the bow is (world), for Lucius clinging to it */
const bowAt = (tau: number): V3 => {
  const v = victim(tau), lift = -v.pitch, r = SHIP_L / 2 - 0.6;
  return [v.x, v.y + Math.sin(lift) * r + Math.cos(lift) * 1.2, v.z + Math.cos(lift) * r - Math.sin(lift) * 1.2];
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], tau = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: case 3: {
      const m5 = t > 8.8 - LEAD && t < 10.2;
      flagCrew(out, cam, id, t, t < 7.6 ? "smile" : "grin", t > 9.6 ? "nervous" : "neutral", m5 ? { prop: ["hand", 5] } : {}, t > 9.6 ? { look: 0, headTilt: -6 } : {});
      if (id === 3 && t > 9.6) { const l = flagSpot(id, t, "lucius"); sweat(out, cam, t, l[0], l[1], l[2]); }
      break;
    }
    case 2: { // flash-forward: Lucius dangling from the lifted bow, Archimedes drawing on the wall
      const b = bowAt(tau);
      fig(out, cam, LUC, b[0] + 1.3, b[1] - 2.05, b[2], { mode: "fall", expr: "shock", tilt: 4 * Math.sin(t * 3) }, t, { noBlob: true });
      fig(out, cam, ARC, ARCH[0], ARCH[1], ARCH[2], { mode: "sit", expr: "smile_closed", prop: "compass", headTilt: 4 * Math.sin(t * 1.5) }, t);
      break;
    }
    case 4: {
      fig(out, cam, ARC, ARCH[0], ARCH[1], ARCH[2], { mode: "sit", expr: t > 15.9 ? "smile_closed" : t > 13.7 ? "smile" : "smile_closed", prop: "compass", headTilt: 5 * Math.sin(t * 1.4), tilt: 2 * Math.sin(t * 1.4 + 1) }, t);
      // the circle being drawn in the sand, finished on "circles"
      const u = clamp01((t - 14.0) / 2.4);
      if (u > 0) out.fx.push({ key: `arc${q(u, 24)}`, cw: 256, ch: 256, draw: (p) => p.arc(128, 128, 100, 100, -90, -90 + 360 * q(u, 24), 10, "#6e5030"), x: ARCH[0] + 0.25, y: WALL_H + 0.18, z: ARCH[2] - 1.05, w: 0.5, h: 0.5, flat: true });
      break;
    }
    case 5: case 6: {
      // flagship crew watching; the victim's crew on its deck until the lift, then sliding off
      const shock = t > 20.0 - LEAD;
      const m = flagSpot(5, t, "marcellus");
      fig(out, cam, MW(t), m[0], m[1], m[2], { mode: "stand", expr: ex(t, [[0, "smile"], [20.05, "nervous"], [23.72, "shock"], [24.8, "dazed"]]) }, t);
      const vt = victim(tau);
      if (tau < 21.9) for (let i = 0; i < 4; i++) fig(out, cam, i === 0 ? LUC : legW(i), vt.x + (i % 2 ? 0.8 : -0.8), vt.y + DECK, vt.z + 5.5 - i * 2.4, { mode: "stand", expr: shock ? "shock" : "neutral", prop: ["scutum", 0] }, t);
      else {
        const b = bowAt(tau);
        if (tau < 24.55) fig(out, cam, LUC, b[0] + 1.3, b[1] - 2.05, b[2], { mode: "fall", expr: "shock", tilt: 5 * Math.sin(t * 4) }, t, { noBlob: true });
        else if (tau < 25.0) { const u = (tau - 24.55) / 0.45; fig(out, cam, LUC, b[0] + 1.3, b[1] - 2.05 - 4 * u * u, b[2], { mode: "fall", expr: "shock", tilt: 30 * u }, t, { noBlob: true }); }
        for (let i = 1; i < 4; i++) { // crew sliding down the deck, then dropping into the sea
          const u = clamp01((tau - 21.95 - i * 0.12) / 1.0), lift = -vt.pitch, along = 5.5 - i * 2.4 - 9 * u * u;
          const y = vt.y + Math.sin(lift) * along + DECK * Math.cos(lift), z = vt.z + Math.cos(lift) * along;
          if (y > 0.2) fig(out, cam, legW(i), vt.x + (i % 2 ? 1.6 : -1.6), Math.max(0.2, y - 1.0 * u), z, { mode: "fall", expr: "shock", tilt: (i % 2 ? 1 : -1) * 30 * u }, t, { noBlob: true });
          splash(out, t, 22.0 + i * 0.12 + 1.0, vt.x + (i % 2 ? 1.6 : -1.6), z, 0.5, 0.8);
        }
      }
      fig(out, cam, ARC, ARCH[0], ARCH[1], ARCH[2], { mode: "sit", expr: "smile_closed", prop: "compass" }, t);
      // the drop: one giant splash at the bow, the rain over the general
      splash(out, t, 24.97, 0, BOW_Z - 2, 2.4, 1.3);
      splash(out, t, 25.02, -3, -20, 1.6, 1.2);
      burst(out, t, 21.0, 0, 1.6, BOW_Z + 0.4, 1.6);
      break;
    }
    case 7: {
      const wet = t > 30.05;
      flagCrew(out, cam, 7, t, ex(t, [[0, "nervous"], [27.25, "shock"], [27.9, "nervous"], [29.2, "shock"], [30.05, "dazed"]]), ex(t, [[0, "nervous"], [29.2, "shock"], [30.05, "dazed"]]), { look: t > 29.2 && t < 30 ? -1 : 0 }, {});
      const m = flagSpot(7, t, "marcellus"), l = flagSpot(7, t, "lucius");
      if (!wet) sweat(out, cam, t, l[0], l[1], l[2]);
      // the huge boulder's shadow spreads over the deck before it lands
      const sh = clamp01((t - 29.1) / 0.9);
      if (sh > 0 && t < 30.0) out.fx.push({ key: "blob|contact|#4a4a68", cw: 128, ch: 128, draw: (p) => fxContact(p, "#4a4a68"), x: m[0] - 0.4, y: m[1] + 0.03, z: m[2] + 1.2, w: 1.0 + 6 * sh, h: 0.8 + 5 * sh, flat: true });
      for (const bo of BOULDERS) splash(out, t, bo.t1, bo.to[0], bo.to[2] + (bo.r > 2 ? 3 : 0), bo.r > 2 ? 1.5 : 1.0, bo.r > 2 ? 1.4 : 1.0);
      if (wet) out.fx.push({ key: `stars${q((t * 0.9) % 1, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q((t * 0.9) % 1, 30)), x: l[0], y: l[1] + 2.2, z: l[2], w: 0.75, h: 0.375 });
      break;
    }
    case 8: {
      const nA = ARROWS.filter((a) => t >= a + 0.1).length;
      const l = flagSpot(8, t, "lucius"), m = flagSpot(8, t, "marcellus");
      fig(out, cam, MW(t), m[0], m[1], m[2], { mode: "stand", expr: ex(t, [[0, "smile"], [33.4, "nervous"], [34.8, "shock"]]) }, t);
      fig(out, cam, LUC, l[0], l[1], l[2], { mode: "stand", expr: ex(t, [[0, "smile"], [33.42, "nervous"], [34.75, "shock"], [35.6, "dazed"]]), prop: ["scutum", nA], look: t > 33.42 && t < 34.75 ? 1 : 0, headTilt: t < 33.4 ? -7 : 0 }, t);
      // arrows zip from the loopholes into the shield
      ARROWS.forEach((a, i) => {
        const u = (t - a) / 0.12;
        if (u < 0 || u > 1) return;
        const from = LOOPS[i % LOOPS.length], to: V3 = [l[0] - 0.15, l[1] + 1.0, l[2] - 0.3];
        const p: V3 = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u];
        const dx = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z, dy = to[1] - from[1];
        out.fx.push({ key: "arrow", cw: 600, ch: 80, draw: fxArrow, x: p[0], y: p[1], z: p[2], w: 0.9, h: 0.12, rot: Math.atan2(dy, dx) });
        burst(out, t, a + 0.12, to[0], to[1], to[2] - 0.1, 0.6);
      });
      break;
    }
    case 9: {
      const la = ladderAt(tau), m = flagSpot(9, t, "marcellus");
      fig(out, cam, MW(t), m[0], m[1], m[2], { mode: "stand", expr: ex(t, [[0, "smile"], [37.9, "laugh"], [39.62, "shock"]]), ...(t > 37.9 && t < 39.6 ? { prop: ["hand", 1] as ["hand", number] } : {}) }, t);
      // sambuca crew cheering on the two decks, then falling
      for (let i = 0; i < 4; i++) {
        const x = SAMB_X + (i < 2 ? -1.6 : 1.6) + (i % 2 ? 0.6 : -0.6), z = -14 - (i % 2) * 3;
        if (la.broken < 0.3) fig(out, cam, legW(i + 4), x, DECK - la.broken, z, { mode: "stand", expr: tau > HIT_T ? "shock" : "grin", wave: tau < HIT_T ? q(Math.sin(t * 8 + i), 20) : undefined }, t);
        else { const u = clamp01((la.broken - 0.3) / 0.7); fig(out, cam, legW(i + 4), x + (i % 2 ? 1 : -1) * 2 * u, DECK + 1.5 * u - 3.5 * u * u, z, { mode: "fall", expr: "shock", tilt: 40 * u }, t, { noBlob: true }); }
      }
      const top = ladderTop(1.95);
      burst(out, t, HIT_T, top[0], top[1] + 0.6, top[2] - 0.4, 3);
      splash(out, t, HIT_T + 1.15, SAMB_X, -16, 2.6, 1.3);
      splash(out, t, 41.25, SAMB_X, -20, 1.8, 1.2);
      break;
    }
    case 10: {
      const m = flagSpot(10, t, "marcellus"), pour = clamp01((t - 44.25) / 0.6) * (1 - clamp01((t - 46.9) / 0.4)), off = t > 43.9;
      fig(out, cam, MW(t, !off), m[0], m[1], m[2], { mode: "stand", expr: ex(t, [[0, "neutral"], [45.4, "stern"]]), ...(off ? { prop: ["helmetcup", q(pour, 20)] as ["helmetcup", number] } : {}) }, t);
      // a fish flops out of the helmet on "cups"
      const u = (t - 45.38) / 0.9;
      if (u > 0 && u < 1) out.fx.push({ key: `fish${q(u * 6, 1) % 2}`, cw: 300, ch: 160, draw: (p) => fxFish(p, q(u * 6, 1) % 2), x: m[0] - 0.55 - 0.5 * u, y: m[1] + 1.55 + 0.6 * u - 2.4 * u * u, z: m[2] - 0.2, w: 0.38, h: 0.2, rot: 1.5 * u });
      break;
    }
    case 11: {
      for (let i = 0; i < 8; i++) {
        const who = i === 3 ? LUC : legW(i), x0 = 98.8 + i * 1.5, z0 = -5.2 + (i % 2) * 0.3;
        if (t < 51.95 - LEAD || cam.pos.y > 8) {
          const flinch = t > 49.0 - LEAD && t < 49.6;
          fig(out, cam, who, x0, 0.35 + (flinch ? 0.12 : 0), z0, { mode: "stand", expr: flinch ? "shock" : "nervous", prop: ["scutum", 0], look: flinch ? 0 : (i % 3) - 1 }, t);
          if (i % 2 === 0) sweat(out, cam, t + i * 0.3, x0, 0.35, z0, 0.9);
        } else { // turn and run: away from the wall, toward the camp, Lucius first and fastest
          const u = t - 51.95 + (i === 3 ? 0.35 : 0), sp = i === 3 ? 7.5 : 5.5, x = x0 - sp * 0.55 * u, z = z0 - sp * u;
          sideFig(out, cam, who, x, 0.35, z, { mode: "march", phase: q((u * 3.2 + i * 0.3) % 1, 24), expr: "shock", stomp: 1.4, stride: 0.8 }, t, true);
          for (let k = 0; k < 2; k++) { const pu = ((u * 2.2 + k * 0.5 + i * 0.13) % 1); out.fx.push({ key: `puff${q(pu, 20)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(pu, 20)), x: x + 0.6 + 0.8 * pu, y: 0.6 + 0.5 * pu, z: z + 1.2 + pu, w: 0.9 + pu, h: 0.9 + pu, soft: true }); }
        }
      }
      break;
    }
    case 12: {
      const spots: [number, number][] = [[97.5, -19.2], [100.5, -21], [104, -19.6], [109, -20.6], [111.5, -18.8]];
      spots.forEach(([x, z], i) => fig(out, cam, legW(i), x, 0.35, z, { mode: "sit", expr: (["neutral", "dazed", "neutral", "stern", "neutral"] as Expr[])[i] }, t));
      fig(out, cam, MW(t), 101, 0.85, -16.8, { mode: "sit", expr: "stern" }, t);
      if (t < 55.85 - LEAD) sideFig(out, cam, LUC, 106.5, 0.35, -16.2, { mode: "stand", expr: "nervous" }, t, false);
      else fig(out, cam, LUC, 106.5, 0.35, -16.2, { mode: "sit", expr: "neutral" }, t);
      break;
    }
    case 13: {
      for (let n = 0; n < 7; n++) { // festival music drifting over the wall
        const age = ((t * 0.5 + n * 0.37) % 1);
        out.fx.push({ key: `note${n % 2}`, cw: 220, ch: 260, draw: (p) => fxNote(p, n % 2, "#fff3d6"), x: 90 + n * 5.2 + 1.5 * Math.sin(age * 6 + n), y: 15.5 + 3.5 * age, z: 1.5, w: 0.8, h: 0.95, rot: 0.3 * Math.sin(age * 6 + n) });
      }
      if (t < 59.4 || t > 61.0) for (let i = 0; i < 4; i++) fig(out, cam, legW(i), 99 + i * 3.1, 0.35, -7 - (i % 2), { mode: "stand", expr: t > 61.1 ? "grin" : "neutral", prop: ["scutum", 0] }, t);
      const counting = t > 59.4 - LEAD && t < 61.0;
      fig(out, cam, LUC, 102.9, 0.35, -1.6, counting ? { mode: "stand", expr: "lick", prop: ["hand", 1], headTilt: -8 + 6 * Math.sin(t * 5) } : { mode: "stand", expr: t > 61.1 ? "grin" : "neutral" }, t);
      break;
    }
    case 14: {
      const pop = smooth((t - 62.35) / 0.3), L0 = LADDERS[0];
      const shock = t > 64.92 - LEAD;
      fig(out, cam, LUC, L0.x, 10.3 + 1.75 * pop, -1.35, { mode: "stand", expr: shock ? "shock" : t > 63.7 ? "grin" : "laugh", ...(shock ? {} : { wave: q(Math.sin(t * 9), 20) }) }, t, { noBlob: true });
      if (shock) { const u = clamp01((t - 64.95) / 0.12); out.fx.push({ key: "bang", cw: 160, ch: 320, draw: fxBang, x: L0.x - 0.55, y: 12.1 + 1.75 + 2.25, z: -1.2, w: 0.22 * u, h: 0.44 * u }); }
      fig(out, cam, MW(t), 104.6, 0.35, -5.2, { mode: "stand", expr: t > 62.9 ? "laugh" : "grin" }, t);
      for (let i = 0; i < 3; i++) fig(out, cam, legW(i), 99 + i * 3.6, 0.35, -6.6 - (i % 2), { mode: "stand", expr: "laugh", wave: q(Math.sin(t * 8 + i), 20) }, t);
      void stickOut; void STICK_X; void PARAPET;
      break;
    }
  }
  void FLAG; void fxRing; void fxShadow; void bodyFront; void bodySide; void smooth; void ARC;
  return out;
};
