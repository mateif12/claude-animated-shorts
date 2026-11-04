// EPISODE TIMELINE (starter). Replace the example shots with your own; keep the helpers and the camera grammar.
// Everything is a pure function of (shot id, frame): world.ts and cast.ts read it, the audio script mirrors its times.
// Rules that made Syracuse work (see PRODUCTION_WORKFLOW.md):
//  - shots are timed to voice/words.json: a reaction lands 0-3 frames BEFORE its word
//  - big reframes are hard cuts; everything else is a smootherstep glide of 18-40 f; every hold creeps (pushK)
//  - impacts are 7-frame flip kicks (KICKS); DOF is off in the production profile but keep the table for GPU masters
//  - CAMERA CLEARANCE: no camera path may pass through a moving prop (ships, sails, ladders...). The Syracuse hook
//    flew low through the fleet, entered a sail and rendered a blank frame. Establishing/hook shots go HIGH and WIDE,
//    above and outside every moving object, then cut to the joke. qa.py flags any near-uniform frame.
export const FPS = 30;
export const TOTAL = 300; // frames = ceil(voice length + tag) * 30; must match the audio script DUR
export const D0 = 0; // ground datum for build.ts house()
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const easeIn = (u: number) => clamp01(u) ** 2;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0..1 ramp between times a and b (smoothstep) */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
/** expression / state switch list: [[t, value], ...] -> value active at t (lands LEAD before t) */
export const LEAD = 2 / FPS;
export const at = <T,>(t: number, steps: [number, T][]): T => { let v = steps[0][1]; for (const [t0, x] of steps) if (t >= t0 - LEAD) v = x; return v; };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "day", tau: (t) => t },
  { id: 2, a: 150, b: TOTAL, light: "golden", tau: (t) => t, sunAz: 150, sunEl: 14 }, // golden: front-light (az 120-160) or the set goes purple
];
/** crossfades (frames) at place/time changes */
export const XFADE: Record<number, number> = { 2: 8 };
/** white 4-frame flash after the hook (set to -10 to disable) */
export const FLASH_AT = -10;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
export const T = (f: number) => f / FPS;
/** push-in factor since f0 (~rate per frame), raised to `punch` for the first n frames (punch words) */
export const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// example characters' spots (cast.ts reads these)
export const HERO: V3 = [0, 0, 0];
export const SIDEKICK: V3 = [1.6, 0, -0.4];

const CAMS: Record<number, Key[]> = {
  1: [
    // hook: high and wide (clear of every prop), glide down to the hero
    { f: 0, s: (f) => dolly([10, 12, -30], [0, 2, 0], pushK(f, 0, 0.003), { fov: 48, roll: -0.03 }) },
    { f: 60, dur: 36, s: (f) => dolly([1.6, 1.8, -4.2], add(HERO, [0, 1.5, 0]), pushK(f, 60, 0.0025, 0.006, 30), { fov: 38, roll: 0.03 }) },
  ],
  2: [{ f: 146, s: (f) => dolly([-3, 2.2, -6], add(SIDEKICK, [0, 1.4, 0]), pushK(f, 146, 0.002), { fov: 42 }) }],
};

// impact kicks [time s, strength]: image offset flips sign every frame, decays over 7 f
const KICKS: [number, number][] = [];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens (used only when post.lens is on, e.g. a GPU master) ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [{ f: 0, cInf: 0 }, { f: 60, dur: 36, cInf: 12, focus: () => add(HERO, [0, 1.6, 0]) }, { f: 150, cInf: 0 }];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
