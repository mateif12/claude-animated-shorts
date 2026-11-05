// "Snake Mail" cast: our own flat cartoon characters (toon.ts) as lit, camera-facing cards in the 3D world, plus
// flat effect cards (pots, snakes, letter, arrow, splashes). Pool / Actor / Fx / blinks / contact blobs are the
// bridge short's (unchanged); stage() is new and places everyone per shot from the story times in story.ts.
import * as THREE from "three";
import {
  Pen, bodyFront, Outfit, Expr, FrontOpts, Prop, SKIN, fxBurst, fxSplash, fxContact, fxShadow, fxSnake, fxPot, fxLetter, fxArrow, fxElephant, fxGull, fxSpeed, fxDrop, fxStars,
} from "./toon";
import { FPS, SHOTS, TT, V3, LOC, onDeck, smooth, clamp01, SKIFF } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool (bridge) ----------------
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
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
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
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}
export type Place = { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number] };
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

// ---------------- helpers ----------------
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
import { getInputProps } from "remotion";
const TK = ((getInputProps() as { post?: { tierK?: number } }).post?.tierK) ?? 1;
const tier = (d: number): [number, number, number] => {
  const b: [number, number, number] = d < 3.2 ? [1200, 2000, 2.0] : d < 6.5 ? [840, 1400, 1.4] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
  return [Math.round(b[0] * TK), Math.round(b[1] * TK), b[2] * TK];
};
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tmp = new THREE.Vector3();
let SUN = new THREE.Vector3(0.5, 0.75, -0.4);
let GOLD = false;
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
/** one front-view character card */
const who = (cam: CamInfo, out: Stage, i: number, o: Outfit, okey: string, at: V3, fo: FrontOpts, t: number, opt: { scale?: number; mirror?: boolean; roll?: number; noBlob?: boolean; blink?: number } = {}) => {
  const sc = opt.scale ?? 1, d = cam.pos.distanceTo(tmp.set(at[0], at[1] + 1.2 * sc, at[2])) / sc;
  const [w, h, k] = tier(d), light = light2D(cam, !!opt.mirror);
  const f2: FrontOpts = { blink: opt.blink ?? lidAt(t, i), ...fo, light, seed: (i % 7) + 1 };
  out.places.push({ key: `F|${okey}|${fkey(f2)}`, x: at[0], y: at[1], z: at[2], scale: sc, mirror: opt.mirror, roll: opt.roll, size: [w, h, k], draw: (p) => bodyFront(p, o, f2) });
  if (!opt.noBlob) blob(out, at[0], at[1], at[2], sc);
};
const CONTACT: [number, number, number] = [0.2, 0.21, 0.33];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (!GOLD) {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h, tc = hexOf([0.42, 0.44, 0.62], 1);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT, 1);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.022, z, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
const fx = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, rot = 0, soft = false) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, rot, soft });
const at01 = (t: number, a: number, d: number) => clamp01((t - a) / d);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const arc3 = (a: V3, b: V3, u: number, hgt: number): V3 => { const p = lerp3(a, b, u); p[1] += hgt * 4 * u * (1 - u); return p; };
const LEAD = 2 / FPS;
const after = (t: number, ts: number) => t >= ts - LEAD;

// ---------------- outfits (our own designs) ----------------
export const HANNIBAL: Outfit = { jacket: "#6b2d6e", pants: "#4a3a3a", boots: "#7a4b2a", hat: "hair", hair: "#cfc9c0", beard: "#8f8a84", oneEye: true, cape: "#9e2f3a", build: "stout", skin: "#e9c39a" };
export const KING: Outfit = { jacket: "#f1e8d2", pants: "#5a4a5a", boots: "#c9923a", hat: "diadem", cape: "#5b2d8a", build: "stout", buttons: "#c9923a" };
const KING_WET: Outfit = { ...KING, hat: "seaweed" };
export const MESSENGER: Outfit = { jacket: "#e9d9a6", pants: "#6a5a48", boots: "#7a4b2a", hat: "hair", hair: "#3a2a1e", rifle: true, staff: true, build: "kid" };
const BITH: Outfit[] = [
  { jacket: "#c8463a", pants: "#4a3a3a", boots: "#7a4b2a", hat: "cap", cap: "#8a5a3a" },
  { jacket: "#d9a441", pants: "#4a3a3a", boots: "#7a4b2a", hat: "hair", hair: "#2a1e18", skin: "#c99067" },
  { jacket: "#b5643a", pants: "#3d4440", boots: "#7a4b2a", hat: "hair", hair: "#5a3b2a", moustache: "#3a2a1e", skin: "#f5c9a0" },
  { jacket: "#e07a4a", pants: "#4a3a3a", boots: "#7a4b2a", hat: "cap", cap: "#c8463a", skin: "#ecd0b6" },
];
const PERG: Outfit[] = [
  { jacket: "#2f5fa8", pants: "#3b3f52", boots: "#5a3b2a", hat: "helmet" },
  { jacket: "#3f7fb5", pants: "#3b3f52", boots: "#5a3b2a", hat: "helmet", crest: "#d23b3b", skin: "#f5c9a0" },
  { jacket: "#2f8a8a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#4a3020", skin: "#ecd0b6", moustache: "#4a3020" },
  { jacket: "#4a6fc0", pants: "#3b3f52", boots: "#5a3b2a", hat: "helmet", skin: "#c99067" },
];
const ROMAN: Outfit = { jacket: "#b03030", pants: "#4a3a3a", boots: "#7a4b2a", hat: "roman", crest: "#d23b3b", cape: "#8a1f1f" };
const GUARD: Outfit = { ...PERG[1], cape: "#2f5fa8" };

// ---------------- effect shorthands ----------------
const potFx = (out: Stage, k: string, at: V3, size = 0.6, crack = 0, peek = 0, rot = 0) =>
  fx(out, `pot|${q(crack, 4)}|${q(peek, 10)}`, 300, 300, (p) => fxPot(p, q(crack, 4), q(peek, 10)), at, size, size, rot);
const snakeFx = (out: Stage, t: number, at: V3, size = 1, kind = 0, rot = 0, seed = 0) => {
  const ph = q(((t * 1.6 + hh(seed, 3)) % 1), 12);
  fx(out, `snake|${ph}|${kind}`, 600, 400, (p) => fxSnake(p, ph, kind), at, size, size * 0.667, rot);
};
const splash = (out: Stage, t: number, t0: number, at: V3, s = 1) => {
  const u = (t - t0) / 1.0;
  if (u < 0 || u >= 1) return;
  fx(out, `splash${q(u, 30)}`, 800, 800, (p) => fxSplash(p, q(u, 30)), [at[0], 0.35 + 2.5 * s, at[2]], 6 * s, 6 * s);
};
const burst = (out: Stage, t: number, t0: number, at: V3, s = 1, col = "#fff3b0") => {
  const u = (t - t0) / 0.4;
  if (u < 0 || u >= 1) return;
  fx(out, `burst${q(u, 30)}${col}`, 500, 500, (p) => fxBurst(p, q(u, 30), col), at, 1.6 * s, 1.6 * s);
};

// ---------------- per shot ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  SUN = cam.sun; GOLD = s.light === "golden";
  const D = (ship: string, lx: number, lz: number) => onDeck(ship, id, t, lx, lz);
  switch (s.name) {
    case "hook": {
      // a Bithynian sailor winds up and throws a pot straight at the lens; a snake peeks out of it mid-air
      const wind = at01(t, TT.hook0, 0.9), thr = TT.hook0 + 0.9;
      const p0 = D("han", 1.2, 5.5), pk: Prop = ["pot", after(t, thr) ? 1 : 0.15 + 0.6 * wind];
      who(cam, out, 1, BITH[0], "b0", p0, { mode: "stand", expr: after(t, thr) ? "grin" : "stern", prop: after(t, thr) ? null : pk, facing: 0, tilt: after(t, thr) ? 6 : -8 * wind }, t);
      who(cam, out, 2, BITH[1], "b1", D("han", -1.2, 3.6), { mode: "stand", expr: "grin", facing: 1 }, t);
      who(cam, out, 3, BITH[2], "b2", D("han", 1.4, 2.4), { mode: "stand", expr: "laugh", facing: -1 }, t);
      if (after(t, thr)) {
        const u = at01(t, thr, TT.hookEnd - thr), a: V3 = [p0[0] + 0.5, p0[1] + 2.3, p0[2]];
        const c = cam.pos, b: V3 = [c.x * 0.85 + a[0] * 0.15, c.y * 0.85 + a[1] * 0.15 - 0.2, c.z * 0.85 + a[2] * 0.15];
        potFx(out, "fly", arc3(a, b, u ** 1.4, 1.2), 0.62, 0, clamp01((u - 0.45) * 3), Math.sin(u * 12) * 0.5);
      }
      break;
    }
    case "elephant": {
      const pop = after(t, TT.elephant), u = at01(t, TT.elephant - LEAD, 0.25);
      who(cam, out, 10, HANNIBAL, "han", D("han", -0.3, 6.2), { mode: "stand", expr: pop ? "neutral" : "smile", facing: 0 }, t);
      who(cam, out, 2, BITH[1], "b1", D("han", -1.3, 3.8), { mode: "stand", expr: pop ? "shock" : "neutral", facing: 1 }, t);
      if (pop) {
        const e = D("han", 1.3, 3.0), k = 2.1 * (u < 1 ? 0.6 + 0.4 * Math.sin(u * Math.PI * 0.5) + 0.25 * Math.sin(u * Math.PI) : 1);
        out.places.push({ key: `eleph|${q(Math.sin(t * 6), 4)}`, x: e[0], y: e[1], z: e[2], scale: k, size: [840, 1400, 1.4],
          draw: (p) => { p.g.save(); p.g.translate(0, 975 - 680 * (600 / 900)); p.g.scale(600 / 900, 600 / 900); fxElephant(p, q(Math.sin(t * 6), 4)); p.g.restore(); } });
        blob(out, e[0], e[1], e[2], 3.0);
      }
      break;
    }
    case "harbour": {
      // Hannibal walks the quay past a small fleet; a seagull lands on his head, he ignores it
      const [hx, Q, hz] = [LOC.harbour[0], 1.6, LOC.harbour[2]];
      const x = hx - 6 + 1.1 * (t - s.a / FPS), at: V3 = [x, Q, hz - 3.2];
      who(cam, out, 10, HANNIBAL, "han", at, { mode: "stroll", phase: (t * 0.9) % 1, expr: after(t, TT.gull + 0.4) ? "stern" : "neutral", facing: 1 }, t, { mirror: false });
      for (let i = 0; i < 3; i++) who(cam, out, 20 + i, BITH[(i + 1) % 4], "hb" + i, [hx - 12 + i * 9.5, Q, hz - 6 - (i % 2)], { mode: "stand", expr: i === 1 ? "nervous" : "neutral", facing: 0 }, t);
      const g0 = TT.gull, gu = at01(t, g0 - 1.0, 1.0);
      const top: V3 = [at[0] + 0.05, at[1] + 2.42, at[2] + 0.05], from: V3 = [at[0] - 6, at[1] + 7, at[2] + 3];
      if (t > g0 - 1.0) fx(out, "gull", 300, 200, (p) => fxGull(p), gu < 1 ? arc3(from, top, smooth(gu), -1.5) : top, 0.7, 0.47);
      break;
    }
    case "pergFleet": {
      // Eumenes lounges on his flagship with grapes; a Roman pops up beside him with a thumbs up on "Rome"
      const k0 = D("king", 0, -3.5);
      who(cam, out, 30, KING, "king", k0, { mode: "stand", expr: after(t, TT.wave) ? "smile" : "smile_closed", prop: "grapes", facing: 0, tilt: -4 }, t);
      if (after(t, TT.rome)) {
        const u = at01(t, TT.rome - LEAD, 0.2);
        who(cam, out, 31, ROMAN, "roman", D("king", 1.6, -4.2), { mode: "stand", expr: "grin", prop: "thumb", facing: -1 }, t, { scale: 0.6 + 0.4 * smooth(u) });
      }
      for (let i = 0; i < 4; i++) who(cam, out, 40 + i, PERG[i], "p" + i, D("king", -1.3 + (i % 2) * 2.6, -9 + i * 1.2), { mode: "stand", expr: i % 2 ? "grin" : "smile", facing: 0 }, t);
      break;
    }
    case "meadow": {
      // the "shopping trip": sailors tiptoe through the meadow with empty pots, one with a basket
      const [mx, , mz] = LOC.meadow, G = 0.6;
      for (let i = 0; i < 4; i++) {
        const x = mx - 7 + i * 2.6 + 0.6 * (t - s.a / FPS), z = mz + 1 - (i % 2) * 1.6;
        who(cam, out, 50 + i, BITH[i], "m" + i, [x, G, z], { mode: "stroll", phase: (t * 0.8 + i * 0.3) % 1, expr: i === 2 ? "nervous" : "whistle", facing: 1, prop: i === 1 ? null : ["pot", 0.1], tilt: 6 }, t);
      }
      break;
    }
    case "snakes": {
      // a sailor pulls a snake out of a bush (it stretches), stuffs it into a pot; rows of lidded pots jiggle
      const [mx, , mz] = LOC.meadow, G = 0.6;
      const pull = at01(t, TT.snakes0, 0.7), stuff = at01(t, TT.stuffed - 0.2, 0.5);
      who(cam, out, 52, BITH[2], "m2", [mx - 3.6, G, mz - 1.4], { mode: "stand", expr: stuff > 0 ? "stern" : pull > 0.3 ? "grin" : "nervous", facing: 1, tilt: -6 + 10 * stuff }, t);
      if (t > TT.snakes0 && stuff < 1) {
        const a: V3 = [mx - 4.6, G + 0.9, mz - 1.2], b: V3 = [mx - 2.6, G + 1.5 + 0.3 * Math.sin(pull * 3), mz - 1.0];
        const p = stuff > 0 ? lerp3(b, [mx - 2.0, G + 0.6, mz - 0.6], stuff) : lerp3(a, b, smooth(pull));
        snakeFx(out, t, p, 1.0 + 0.8 * pull * (1 - stuff), 0, -0.3);
      }
      // pot rows: lids pop on "lots", one slams on "pots"
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const i = r * 6 + c, jig = after(t, TT.lots) ? 0.05 * Math.sin(t * 22 + i * 1.7) : 0;
        const pop = c === 3 && r === 0 && after(t, TT.stuffed + 0.3) && t < TT.stuffed + 0.8 ? 1 : 0;
        potFx(out, "row", [mx - 1.0 + c * 0.75, G + 0.3 + jig + 0.15 * pop, mz - 1.0 - r * 0.85], 0.62, 0, pop, jig * 3);
      }
      break;
    }
    case "messenger": {
      // the messenger rows a tiny boat between the fleets, herald's staff high, sweating
      const b = SKIFF(t);
      who(cam, out, 60, MESSENGER, "msg", [b[0], 0.45, b[2]], { mode: "sit", expr: "nervous", facing: 0, tilt: 3 * Math.sin(t * 4) }, t, { noBlob: true });
      fx(out, "drop", 120, 160, (p) => fxDrop(p), [b[0] + 0.55, 2.35 + 0.1 * Math.sin(t * 5), b[2]], 0.18, 0.24);
      break;
    }
    case "escort": {
      // Pergamene sailors smile and lead him past everyone toward the king (walks toward camera along the deck)
      const u = at01(t, s.a / FPS, (s.b - s.a) / FPS);
      who(cam, out, 60, MESSENGER, "msg", D("king", 0, 3.5 - 7 * u), { mode: "stroll", phase: (t * 1.1) % 1, expr: "nervous", facing: 0 }, t);
      who(cam, out, 41, PERG[1], "p1", D("king", 1.2, 3.0 - 7 * u), { mode: "stroll", phase: (t * 1.1 + 0.5) % 1, expr: "grin", facing: -1, wave: 0.6 }, t);
      who(cam, out, 42, PERG[2], "p2", D("king", -1.6, -1), { mode: "stand", expr: "smile", facing: 1, prop: "grapes" }, t);
      who(cam, out, 40, PERG[0], "p0", D("king", 1.7, -3.5), { mode: "stand", expr: "grin", facing: -1 }, t);
      who(cam, out, 30, KING, "king", D("king", 0, -6.5), { mode: "stand", expr: "smile", facing: 0, prop: "grapes" }, t);
      break;
    }
    case "opens": {
      // close-up: Eumenes unrolls the letter (doodle of himself with donkey ears); face goes blank, grape falls
      const ins = after(t, TT.insults);
      const k0 = D("king", 0, -6.5);
      who(cam, out, 30, KING, "king", k0, { mode: "stand", expr: ins ? "dazed" : after(t, TT.opens + 0.6) ? "neutral" : "smile", facing: 0, prop: "scroll" }, t);
      who(cam, out, 60, MESSENGER, "msg", D("king", 1.4, -5.6), { mode: "stand", expr: ins ? "whistle" : "nervous", facing: -1 }, t);
      if (after(t, TT.opens + 0.5)) {
        const u = at01(t, TT.opens + 0.5, 0.3);
        fx(out, "letter", 600, 700, (p) => fxLetter(p), [k0[0] + 0.05, k0[1] + 2.5 + 0.12 * smooth(u), k0[2] + 0.4], 0.5 * smooth(u) + 0.01, 0.58 * smooth(u) + 0.01);
      }
      if (ins) { const g = at01(t, TT.insults, 0.6); fx(out, "grape", 120, 160, (p) => { p.ell(60, 80, 34, 34, "#7a3f8f", 7); }, [k0[0] + 0.15, k0[1] + 1.55 - 1.5 * g * g, k0[2] + 0.5], 0.09, 0.09); }
      break;
    }
    case "knows": {
      // Hannibal's deck: everyone stares across the water; a giant arrow pops on above the king's ship
      who(cam, out, 10, HANNIBAL, "han", D("han", 0.3, 7.5), { mode: "stand", expr: after(t, TT.which) ? "smile" : "stern", facing: 0, look: 0.5 }, t);
      for (let i = 0; i < 3; i++) who(cam, out, 70 + i, BITH[i], "k" + i, D("han", -1.4 + i * 1.4, 5.0 - i * 0.8), { mode: "stand", expr: "stern", facing: -1, look: 1 }, t);
      arrowOver(out, t, TT.which, id);
      break;
    }
    case "attack": {
      for (let i = 0; i < 2; i++) who(cam, out, 70 + i, BITH[i], "k" + i, D("han", -1 + i * 2, 6), { mode: "stand", expr: "stern", facing: 0, tilt: -8 }, t);
      arrowOver(out, t, -1, id);
      const k = D("king", 0, 2); fx(out, "speed", 400, 200, (p) => fxSpeed(p), [k[0] + 8, 5, k[2] + 22], 4, 2, 0.4);
      break;
    }
    case "lob": {
      // sailors hurl pots over the side at the other Pergamene ships (one polite underarm double)
      for (let i = 0; i < 3; i++) {
        const tt = TT.lob + i * 0.45 + (i === 2 ? 0.3 : 0), ph = clamp01((t - tt + 0.5) / 0.5), thrown = t >= tt;
        const p0 = D("han", -1.4 + i * 1.4, 5.4 - i * 0.6);
        who(cam, out, 80 + i, BITH[i], "l" + i, p0, { mode: "stand", expr: thrown ? "grin" : "stern", facing: 1, prop: thrown && t < tt + 0.8 ? null : ["pot", i === 2 ? 0.1 : ph], tilt: thrown ? 8 : -6 * ph }, t);
        for (let r = 0; r < 3; r++) {
          const t1 = tt + r * 1.3, u = (t - t1) / 1.2;
          if (u > 0 && u < 1) { const a: V3 = [p0[0] + 0.6, p0[1] + 2, p0[2]], b = D("perg2", 0, 0); potFx(out, "throw", arc3(a, [b[0], b[1] + 1.5, b[2]], u, 6), 0.55, 0, 0, u * 8); }
        }
      }
      break;
    }
    case "laughs": {
      // the enemy laughs; one taps a pot like a drum, one wears a pot as a helmet
      const P = (i: number, lx: number, lz: number, expr: Expr, extra: Partial<FrontOpts> = {}) => who(cam, out, 90 + i, PERG[i], "pl" + i, D("perg2", lx, lz), { mode: "stand", expr, facing: 0, ...extra }, t);
      const frozen = after(t, TT.break);
      P(0, -1.6, 1, frozen ? "shock" : "laugh", { tilt: frozen ? 0 : 5 * Math.sin(t * 9) });
      P(1, 0.1, 0, frozen ? "shock" : "laugh", { prop: frozen ? null : ["pot", 0.5], tilt: frozen ? 0 : -4 * Math.sin(t * 9 + 1) });
      P(2, 1.7, 1.2, frozen ? "shock" : "laugh", { tilt: frozen ? 0 : 6 * Math.sin(t * 8 + 2) });
      const h = D("perg2", 1.7, 1.2); potFx(out, "hat", [h[0], h[1] + 2.12, h[2] + 0.06], 0.52);
      if (!frozen) for (let i = 0; i < 3; i++) { const p = D("perg2", -2.5 + i * 1.8, -0.8); potFx(out, "deck", [p[0], p[1] + 0.3, p[2]], 0.6); }
      break;
    }
    case "break": {
      // a pot on the deck cracks, then snakes burst out in every direction
      const p = D("perg2", 0, 0.5), crack = after(t, TT.break) ? 1 : 0;
      const u = at01(t, TT.break + 0.25, 0.8);
      if (u < 0.15) potFx(out, "crack", [p[0], p[1] + 0.32, p[2]], 0.65, crack * (t > TT.break + 0.12 ? 1 : 0.5), 0, 0.05 * Math.sin(t * 40) * crack);
      burst(out, t, TT.break + 0.2, [p[0], p[1] + 0.5, p[2]], 1.4);
      if (u > 0) for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3, r = 0.3 + 1.6 * smooth(u);
        snakeFx(out, t, [p[0] + r * Math.cos(a), p[1] + 0.35 + 0.6 * Math.sin(Math.PI * u), p[2] + 0.6 * r * Math.sin(a)], 0.9, 0, a, i);
      }
      for (let i = 0; i < 2; i++) who(cam, out, 90 + i, PERG[i], "pl" + i, D("perg2", -1.4 + i * 2.8, -1.5), { mode: "stand", expr: "shock", facing: i ? -1 : 1 }, t);
      break;
    }
    case "venom": {
      // one snake on the deck: hissing on "venomous", then innocent with a bow tie on "harmless"
      const p = D("perg2", 0, 0.8), inn = after(t, TT.harmless);
      snakeFx(out, t * (inn ? 0.4 : 1), [p[0], p[1] + 0.35, p[2]], 1.3, inn ? 1 : 0, 0, 2);
      if (!inn) for (let i = 0; i < 2; i++) snakeFx(out, t, [p[0] - 1.5 + 3 * i, p[1] + 0.3, p[2] - 1.2], 1.0, 0, 0, i + 5);
      break;
    }
    case "check": {
      // sailors leap overboard in every direction, one climbs the mast, one hides in a pot (with a snake)
      const t0 = TT.check;
      for (let i = 0; i < 4; i++) {
        const tj = t0 + i * 0.35, u = clamp01((t - tj) / 0.9), sgn = i % 2 ? 1 : -1;
        const a = D("perg2", sgn * 1.2, -2 + i * 1.3), b: V3 = [a[0] + sgn * 5.5, 0.2, a[2] + 1];
        if (u < 1) who(cam, out, 90 + i, PERG[i], "j" + i, u > 0 ? arc3(a, b, u, 2.5) : a, { mode: u > 0 ? "fall" : "stand", expr: "shock", facing: 0, tilt: u * 70 * sgn }, t, { noBlob: u > 0 });
        splash(out, t, tj + 0.9, b, 0.6);
      }
      const m = D("perg2", 0, 1.0);
      who(cam, out, 95, PERG[1], "mast", [m[0], m[1] + 3.5 + 0.8 * at01(t, t0, 2), m[2]], { mode: "fall", expr: "shock", facing: 0 }, t, { noBlob: true });
      const pp = D("perg2", 1.5, 3.5);
      potFx(out, "hide", [pp[0], pp[1] + 0.45, pp[2]], 0.95, 0, 0);
      if (t > t0 + 0.6) {
        fx(out, "peek", 200, 120, (p) => { p.ell(70, 60, 22, 26, "#ffffff", 5); p.ell(130, 60, 22, 26, "#ffffff", 5); p.dot(76, 64, 8); p.dot(136, 64, 8); }, [pp[0] - 0.05, pp[1] + 0.92, pp[2] + 0.1], 0.32, 0.19);
        if (t > t0 + 1.4) snakeFx(out, t, [pp[0] + 0.3, pp[1] + 1.0, pp[2] + 0.1], 0.45, 0, 0, 9);
      }
      break;
    }
    case "flee": {
      // golden: the enemy fleet rows away (no faces needed at this distance)
      break;
    }
    case "shore": {
      const [bx, , bz] = LOC.beach, u = at01(t, s.a / FPS, 2.2);
      const k = lerp3([bx - 1, 0.3, bz + 6], [bx, 1.05, bz - 3], smooth(u));
      who(cam, out, 30, KING_WET, "kingwet", k, { mode: u < 1 ? "stroll" : "stand", phase: (t * 1.4) % 1, expr: u < 1 ? "pained" : "dazed", facing: 0, prop: "scroll", tilt: u < 1 ? 10 : 0 }, t);
      for (let i = 0; i < 2; i++) who(cam, out, 110 + i, GUARD, "g" + i, [bx - 2.5 + i * 5, 1.3, bz - 6], { mode: "stand", expr: "nervous", facing: i ? -1 : 1, look: i ? -1 : 1 }, t);
      fx(out, "drips", 120, 160, (p) => fxDrop(p), [k[0] - 0.5, k[1] + 2.2 - ((t * 1.5) % 1) * 0.5, k[2]], 0.14, 0.18);
      break;
    }
    case "nametag": {
      // the empty royal ship still under the arrow; Hannibal's one-eyed wink fails (both eyes shut) on "tag"
      arrowOver(out, t, -1, id);
      const w = after(t, TT.tag);
      who(cam, out, 10, HANNIBAL, "han", D("han", 0.2, 6), { mode: "stand", expr: w ? "smile_closed" : "smile", facing: 0, headTilt: w ? 6 : 0 }, t, { blink: w ? 1 : 0 });
      if (w) { const h = D("han", 0.2, 6); fx(out, "stars", 420, 210, (p) => fxStars(p, q((t * 1.2) % 1, 12)), [h[0], h[1] + 3.0, h[2]], 0.9, 0.45); }
      break;
    }
  }
  return out;
};

const arrowOver = (out: Stage, t: number, t0: number, id: number) => {
  const k = onDeck("king", id, t, 0, -3);
  const u = t0 < 0 ? 1 : at01(t, t0 - LEAD, 0.3);
  if (u <= 0) return;
  const bounce = 0.6 * Math.sin(t * 5), s = 7 * (u < 1 ? 1.3 * Math.sin(u * Math.PI * 0.5) : 1);
  out.fx.push({ key: "arrow", cw: 300, ch: 500, draw: (p) => fxArrow(p), x: k[0], y: k[1] + 19.5 + bounce, z: k[2], w: s * 0.6, h: s });
};
void SKIN;
