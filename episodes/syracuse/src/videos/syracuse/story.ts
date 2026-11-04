// Timeline of "The One Guy Who Made Rome Look Stupid" (Archimedes vs. the Roman fleet, Syracuse, 214 BC).
// Shots are timed to the voice words (voice/words.json); story physics (fleet, claw, catapults, ladder tower,
// ladders, the poking stick) are pure functions of the shot id + time. Camera grammar is the bridge short's:
// smootherstep glides 18-40 f, cuts on big reframes, every hold creeps, 7-frame flip kicks on impacts.
// World layout: the sea wall of Syracuse runs along x at z = 0 (its sea face at z = 0, sea at z < 0, city at z > 0),
// wall walk at y = 12, merlons to 14.3. Sea level y = 0. The beach (shots 11-14) is the stretch x 80..140.
export const FPS = 30;
export const TOTAL = 1990;
export const D0 = 0; // ground datum for the shared builders (build.ts house())
export type V3 = [number, number, number];

export const WALL_H = 12, WALL_T = 4, MERLON = 14.3, PARAPET = 13.3;
export const BEACH_X0 = 78;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const easeIn = (u: number) => clamp01(u) ** 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0..1 ramp between times a and b (smoothstep) */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number; place: "sea" | "wall" | "beach"; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 81, light: "day", place: "sea", tau: (t) => t },
  { id: 2, a: 81, b: 153, light: "day", place: "sea", tau: (t) => 23.6 + (t - 2.7) * 0.15 }, // flash-forward: the ship already hangs
  { id: 3, a: 153, b: 316, light: "day", place: "sea", tau: (t) => t },
  { id: 4, a: 316, b: 522, light: "day", place: "wall", tau: (t) => t },
  { id: 5, a: 522, b: 722, light: "day", place: "sea", tau: (t) => t },
  { id: 6, a: 722, b: 768, light: "day", place: "sea", tau: (t) => t },
  { id: 7, a: 768, b: 915, light: "day", place: "sea", tau: (t) => t },
  { id: 8, a: 915, b: 1069, light: "day", place: "sea", tau: (t) => t },
  { id: 9, a: 1069, b: 1272, light: "day", place: "sea", tau: (t) => t },
  { id: 10, a: 1272, b: 1417, light: "day", place: "sea", tau: (t) => t },
  { id: 11, a: 1417, b: 1600, light: "day", place: "beach", tau: (t) => t },
  { id: 12, a: 1600, b: 1700, light: "golden", place: "beach", tau: (t) => t, sunAz: 150, sunEl: 14 },
  { id: 13, a: 1700, b: 1874, light: "golden", place: "beach", tau: (t) => t, sunAz: -140, sunEl: 10 },
  { id: 14, a: 1874, b: TOTAL, light: "golden", place: "beach", tau: (t) => t, sunAz: -140, sunEl: 12 },
];
export const XFADE: Record<number, number> = { 4: 8, 11: 8, 12: 8, 13: 8 };
export const FLASH_AT = 153;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story physics ----------------
// The claw: a beam pivoting on the wall walk at x = 0, chain from its tip to an iron claw.
export const CLAW_PIVOT: V3 = [0, 13, 2];
export const BEAM_L = 16;
export const SHIP_L = 18;
export const BOW_Z = -11.6; // under the swung-out beam tip
export type Claw = { beam: number; clawY: number; open: number; lift: number; dropped: number };
/** beam angle from vertical (+ = out over the sea), claw height, lift angle of the victim ship (rad), after-drop 0..1 */
export const clawAt = (tau: number): Claw => {
  const beam = lerp(-0.26, 1.01, smooth((tau - 19.55) / 1.1));
  const tipY = CLAW_PIVOT[1] + BEAM_L * Math.cos(beam);
  const lowered = smooth((tau - 20.55) / 0.42);
  let lift = 0, dropped = 0;
  if (tau >= 21.85) lift = 1.15 * smooth((tau - 21.85) / 1.45);
  if (tau >= 24.5) { const u = clamp01((tau - 24.5) / 0.45); lift = 1.15 * (1 - u * u); dropped = clamp01((tau - 24.5) / 0.47); }
  const bowY = 0.9 + SHIP_L * Math.sin(lift);
  const clawY = tau >= 24.5 ? lerp(bowY, tipY - 5, smooth((tau - 24.5) / 0.6)) : tau >= 21.0 ? bowY + 0.4 : lerp(tipY - 3, 1.3, lowered);
  return { beam, clawY, open: tau >= 24.5 ? 1 : tau >= 20.9 ? 0 : 1, lift, dropped };
};

export type ShipKind = "galley" | "flag" | "victim" | "samA" | "samB";
export type ShipPose = { kind: ShipKind; x: number; y: number; z: number; yaw: number; pitch: number; roll: number; row: number; sail: boolean };
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** fleet formation approaching the wall (+z) */
const fleet = (t: number, z0: number, speed: number, n = 9): ShipPose[] => {
  const out: ShipPose[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 13 + (hh(i) - 0.5) * 4, z = z0 + speed * t - (i % 2) * 14 - hh(i, 2) * 8 - Math.abs(i - (n - 1) / 2) * 3;
    out.push({ kind: "galley", x, y: 0.05 * Math.sin(t * 1.3 + i), z, yaw: 0, pitch: 0.012 * Math.sin(t * 1.1 + i), roll: 0.02 * Math.sin(t * 0.9 + i * 2), row: t * 0.9 + hh(i, 3), sail: true });
  }
  return out;
};
/** Marcellus' flagship position by shot (it is moved between cuts) */
export const FLAG = (id: number, t: number): ShipPose => {
  const bob = (k = 1) => ({ y: 0.05 * k * Math.sin(t * 1.4), pitch: 0.012 * Math.sin(t * 1.1), roll: 0.02 * k * Math.sin(t * 0.9) });
  switch (id) {
    case 1: case 3: return { kind: "flag", x: -14, z: -66 + 1.6 * (t - 5), yaw: 0, row: t * 0.9, sail: true, ...bob() };
    case 5: case 6: case 2: return { kind: "flag", x: -15, z: -36 + 0.6 * clamp01((t - 17.4) / 2), yaw: 0, row: t * 0.9, sail: false, ...bob() };
    case 7: { const z = -34 - 14 * smooth((t - 25.2) / 2.4) - 18 * smooth((t - 27.7) / 2.4); return { kind: "flag", x: -15, z, yaw: 0, row: -t * 1.1, sail: false, ...bob(t > 30 ? 2.5 : 1) }; }
    case 8: return { kind: "flag", x: -40, z: -3.6, yaw: Math.PI / 2, row: 0, sail: false, ...bob(0.6) };
    default: return { kind: "flag", x: -45, z: -24, yaw: 0.25, row: 0, sail: false, ...bob() };
  }
};
/** the claw's victim: lifted by the bow, stern sliding toward the wall, then dropped and capsized */
export const victim = (tau: number): ShipPose => {
  const c = clawAt(tau), lift = c.lift;
  const zs = BOW_Z - SHIP_L * Math.cos(lift); // stern
  let roll = 0.02 * Math.sin(tau), y = 0, sink = 0;
  if (c.dropped > 0) { const u = clamp01((tau - 24.9) / 0.45); roll = 2.3 * smooth(u); sink = 1.6 * smooth((tau - 24.9) / 1.6) - 0.6 * Math.exp(-6 * Math.max(0, tau - 24.97)) * Math.sin(12 * Math.max(0, tau - 24.97)); y = -sink; }
  const z0 = tau < 17.4 ? -14 - 10 * (1 - smooth((tau - 15) / 2.4)) : 0; // rows in before the claw
  void zs;
  return { kind: "victim", x: 0, y: y + (SHIP_L / 2) * Math.sin(lift), z: BOW_Z - (SHIP_L / 2) * Math.cos(lift) + z0, yaw: 0, pitch: -lift, roll, row: tau < 21 ? tau * 0.9 : 0, sail: false };
};
/** sambuca: two lashed ships with a ladder tower hinged at the bows (x = -28) */
export const SAMB_X = -28, SAMB_HINGE: V3 = [-28, 2.6, -9];
export const LADDER_L = 15, HIT_T = 39.62;
/** ladder elevation from the deck (rad): lies back over the ships, swings up past vertical to lean toward the wall,
 *  then the rock flattens it back down over the ships */
export const ladderAt = (tau: number) => {
  if (tau < HIT_T) return { ang: lerp(0.12, 1.95, smooth((tau - 36.2) / 2.8)), broken: 0 };
  const u = clamp01((tau - HIT_T) / 1.15);
  return { ang: lerp(1.95, -0.22, easeIn(u)), broken: u };
};
export const ladderTop = (ang: number): V3 => [SAMB_X, SAMB_HINGE[1] + LADDER_L * Math.sin(ang), SAMB_HINGE[2] - LADDER_L * Math.cos(ang)];
/** the rock: dropped from a wall crane, hits the ladder top at HIT_T, rides it down, then falls into the sea */
export const rockAt = (tau: number): V3 | null => {
  const top0 = ladderTop(1.95), t0 = HIT_T - Math.sqrt((2 * (24 - top0[1])) / 30);
  if (tau < t0 || tau > 42) return null;
  if (tau < HIT_T) { const u = tau - t0; return [SAMB_X, 24 - 15 * u * u, top0[2]]; }
  const L = ladderAt(Math.min(tau, HIT_T + 0.55)), p = ladderTop(L.ang);
  if (tau < HIT_T + 0.55) return [p[0], p[1] + 1.4, p[2]];
  const u = tau - HIT_T - 0.55;
  return [p[0], Math.max(0.3, p[1] + 1.4 - 15 * u * u), p[2] - 1.5 * u];
};
// catapults on the wall walk; boulders: [fire time, land time, from, to, radius]
export const CATAPULTS: V3[] = [[-10, WALL_H, 2.4], [14, WALL_H, 2.4]];
export type Boulder = { t0: number; t1: number; from: V3; to: V3; r: number; h: number };
export const BOULDERS: Boulder[] = [
  { t0: 26.55, t1: 27.27, from: [-10, 16, 1], to: [-20.5, 0, -40], r: 0.75, h: 9 },
  { t0: 28.9, t1: 30.0, from: [-10, 17, 1], to: [-14, 0, -55.5], r: 2.6, h: 24 },
];
export const boulderAt = (b: Boulder, tau: number): V3 | null => {
  if (tau < b.t0 || tau > b.t1 + 0.1) return null;
  const u = clamp01((tau - b.t0) / (b.t1 - b.t0));
  return [lerp(b.from[0], b.to[0], u), lerp(b.from[1], b.to[1], u) + 4 * b.h * u * (1 - u), lerp(b.from[2], b.to[2], u)];
};
/** catapult arm angle (0 = cocked back, 1 = thrown) */
export const cataArm = (i: number, tau: number) => (i === 0 ? Math.max(smooth((tau - 26.45) / 0.18), 0) * (1 - smooth((tau - 27.6) / 1.2)) + smooth((tau - 28.8) / 0.18) * (1 - smooth((tau - 29.9) / 1.2)) : 0);
/** loopholes (sea wall, shot 8): open 0..1; arrows fired at the shield */
export const LOOPS: V3[] = [[-34.5, 3.4, 0], [-36.3, 2.8, 0], [-34.9, 2.0, 0], [-36.7, 3.9, 0]];
export const loopOpen = (tau: number, i: number) => smooth((tau - 33.38 - i * 0.12) / 0.25);
export const ARROWS = [34.75, 34.98, 35.25];
// beach: the ladders (shot 13) and the poking stick
export const LADDERS: { x: number; t: number }[] = [{ x: 101.6, t: 61.13 }, { x: 107.4, t: 61.6 }];
export const ladderLean = (tau: number, t0: number) => 1 - easeIn((tau - (t0 - 0.35)) / 0.35); // 1 = in the air, 0 = against the wall
export const stickOut = (id: number, tau: number) =>
  id === 11 ? smooth((tau - 50.15) / 0.5) * (1 - smooth((tau - 52.6) / 0.5)) : id === 14 ? smooth((tau - 64.85) / 0.4) : 0;
export const STICK_X = (id: number) => (id === 14 ? 102.55 : 104.6);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
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
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// character spots (used by cast.ts and the cameras). Deck height 1.75 above the ship origin.
export const DECK = 1.31; // deck top above the ship origin (world.ts DECK_Y - 0.25 + 0.01)
export const ARCH: V3 = [6, WALL_H, 2.9];
export const flagSpot = (id: number, t: number, who: "marcellus" | "lucius"): V3 => {
  const s = FLAG(id, t), fwd = who === "marcellus" ? (id === 8 ? 2.4 : 5.2) : 4.6, side = who === "marcellus" ? (id === 8 ? 0.3 : 0.45) : -0.95;
  const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
  return [s.x + sy * fwd + cy * side, s.y + DECK, s.z + cy * fwd - sy * side];
};
const M = (id: number, f: number) => flagSpot(id, T(f), "marcellus");
const Lu = (id: number, f: number) => flagSpot(id, T(f), "lucius");
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const CAMS: Record<number, Key[]> = {
  1: [
    // high over the fleet (the old low path flew through a sail): the whole armada heading for the walls
    { f: 0, s: (f) => dolly([14, 24, -165], [-2, 4, -40], pushK(f, 0, 0.003), { fov: 50, roll: -0.03 }) },
    { f: 34, dur: 40, s: (f) => dolly([8, 19, -150], [-3, 6, -20], pushK(f, 34, 0.003), { fov: 48, roll: 0.02 }) },
  ],
  2: [
    { f: 81, s: (f) => dolly([10.5, 1.4, -27], [0, 10.5, -16], pushK(f, 81, 0.002), { fov: 50, roll: 0.05 }) },
    { f: 106, dur: 36, s: (f) => dolly([3.2, 17.2, -6.5], [ARCH[0] - 0.4, ARCH[1] + 0.7, ARCH[2]], pushK(f, 106, 0.003, 0.006, 30), { fov: 40, roll: 0 }) },
  ],
  3: [
    { f: 153, s: (f) => zoom([-34, 10, -112], [-4, 10, -6], 44, pushK(f, 153, 0.002)) },
    { f: 228, cut: true, s: (f) => { const m = M(3, f); return dolly(add(m, [3.4, 1.6, -3.6]), add(m, [-0.5, 1.45, 0]), pushK(f, 228, 0.002, 0.006, 30), { fov: 38, roll: -0.03 }); } },
    { f: 290, cut: true, s: (f) => { const l = Lu(3, f); return { pos: add(l, [1.4, 0.6, -3.4]), look: add(l, [0, 1.4, 0]), fov: 40, roll: 0.03 }; } },
    { f: 294, dur: 22, s: (f) => { const l = Lu(3, f); return { pos: add(l, [1.4, 0.4, -3.6]), look: [l[0] + 3, 26, 0], fov: 52, roll: 0.06 }; } },
  ],
  4: [
    { f: 312, s: (f) => ({ pos: [-16 + 0.05 * (f - 312), 14.4, 2.0], look: [-4, 13, 2.7], fov: 46 }) },
    { f: 352, dur: 40, s: (f) => dolly([1.5, 14.0, 1.4], [ARCH[0], ARCH[1] + 0.9, ARCH[2]], pushK(f, 352, 0.002), { fov: 42, roll: 0.02 }) },
    { f: 412, cut: true, s: (f) => dolly([4.6, 13.75, -0.35], [ARCH[0], ARCH[1] + 0.45, ARCH[2] - 0.4], pushK(f, 412, 0.0022, 0.006, 30), { fov: 40, roll: -0.03 }) },
  ],
  5: [
    { f: 522, s: (f) => dolly([-34, 6.5, -48], [-2, 10, -10], pushK(f, 522, 0.0018), { fov: 48 }) },
    { f: 600, dur: 30, s: (f) => dolly([-27, 5.5, -40], [-1, 11, -12], pushK(f, 600, 0.0018), { fov: 48, roll: -0.02 }) },
    { f: 660, cut: true, s: (f) => { const by = 0.9 + SHIP_L * Math.sin(clawAt(T(f)).lift); return dolly([7.5, 4.0, -25], [0.4, Math.max(3.5, by - 3), -12.5], pushK(f, 660, 0.002), { fov: 48, roll: 0.05 }); } },
    // insert: Archimedes keeps drawing while the warship hangs behind him (the core visual joke)
    { f: 692, cut: true, s: (f) => dolly([7.6, 15.2, 6.5], [2.4, 12.5, -8], pushK(f, 692, 0.003), { fov: 62, roll: -0.03 }) },
    { f: 710, cut: true, s: (f) => { const m = M(5, f); return dolly(add(m, [2.0, 1.55, -3.4]), add(m, [0, 1.45, 0]), pushK(f, 710, 0.003, 0.007, 12), { fov: 36 }); } },
  ],
  6: [{ f: 722, s: (f) => dolly([17, 4.5, -44], [-4, 6.5, -16], pushK(f, 722, 0.002), { fov: 50, roll: -0.03 }) }],
  7: [
    { f: 768, s: (f) => { const m = M(7, f); return { pos: [-36, 4.2, m[2] - 4], look: [-15, 3.5, m[2] + 1], fov: 46 }; } },
    { f: 830, cut: true, s: (f) => { const m = M(7, f); return dolly(add(m, [-4.2, 1.6, -5.2]), add(m, [0.3, 1.5, 0.6]), pushK(f, 830, 0.002), { fov: 42, roll: 0.03 }); } },
    { f: 872, dur: 20, s: (f) => { const m = M(7, f); return { ...dolly(add(m, [-5.5, 1.2, -7.5]), add(m, [0.3, 3.2, 3]), pushK(f, 872, 0.002), { fov: 50, roll: -0.04 }) }; } },
  ],
  8: [
    { f: 915, s: (f) => dolly([-33, 4.8, -17], [-39.5, 3.2, -2.2], pushK(f, 915, 0.0022, 0.006, 30), { fov: 44 }) },
    { f: 995, cut: true, s: (f) => { const l = Lu(8, f); return dolly(add(l, [2.2, 1.5, -4.2]), add(l, [0.4, 1.5, 0.6]), pushK(f, 995, 0.0025), { fov: 38, roll: 0.03 }); } },
    { f: 1040, dur: 18, s: (f) => { const l = Lu(8, f); return dolly(add(l, [1.6, 1.4, -3.2]), add(l, [0.2, 1.3, 0.4]), pushK(f, 1040, 0.002), { fov: 36, roll: -0.04 }); } },
  ],
  9: [
    { f: 1069, s: (f) => dolly([-58, 7.5, -42], [-27, 8.5, -8], pushK(f, 1069, 0.0022), { fov: 46 }) },
    { f: 1140, cut: true, s: (f) => { const m = M(9, f); return dolly(add(m, [2.4, 1.5, -3.2]), add(m, [0, 1.6, 0]), pushK(f, 1140, 0.003, 0.007, 25), { fov: 36, roll: 0.04 }); } },
    { f: 1176, cut: true, s: (f) => dolly([-54, 6, -36], [-28, 10, -7], pushK(f, 1176, 0.002), { fov: 48, roll: -0.02 }) },
  ],
  10: [
    { f: 1272, s: (f) => { const m = M(10, f); return dolly(add(m, [1.5, 1.35, -3.6]), add(m, [0.1, 1.35, 0]), pushK(f, 1272, 0.0018, 0.004, 40), { fov: 36 }); } },
    { f: 1355, dur: 24, s: (f) => { const m = M(10, f); return dolly(add(m, [1.2, 1.2, -3.0]), add(m, [0.15, 1.25, 0]), pushK(f, 1355, 0.0018), { fov: 36, roll: 0.04 }); } },
  ],
  11: [
    { f: 1413, s: (f) => dolly([104, 2.5, -16], [104, 2.0, -5], pushK(f, 1413, 0.0025, 0.006, 25), { fov: 44 }) },
    { f: 1490, cut: true, s: (f) => zoom([104.4, 1.6, -8.5], [104.6, 13.6, 0], 42, pushK(f, 1490, 0.003, 0.007, 30)) },
    { f: 1540, cut: true, s: (f) => dolly([90, 3.6, -25], [104, 2.6, -7], pushK(f, 1540, 0.002), { fov: 50, roll: 0.04 }) },
  ],
  12: [{ f: 1596, s: (f) => dolly([92, 3.0, -34], [103, 3.6, -10], pushK(f, 1596, 0.002), { fov: 46 }) }],
  13: [
    { f: 1696, s: (f) => dolly([95, 2.6, -26], [104, 11, 0], pushK(f, 1696, 0.0022), { fov: 48 }) },
    { f: 1782, cut: true, s: (f) => ({ pos: [100.6, 1.9, -6.6], look: [102.9, 2.3, -1.4], fov: 42 }) },
    { f: 1790, dur: 40, s: (f) => zoom([100.6, 1.9, -6.6], [102.9, 3.6, -1.0], 46, pushK(f, 1790, 0.002), { roll: 0.03 }) },
    { f: 1834, cut: true, s: (f) => dolly([94, 3.2, -18], [104, 7, 0], pushK(f, 1834, 0.002), { fov: 46, roll: -0.03 }) },
  ],
  14: [
    { f: 1874, s: (f) => dolly([98.8, 1.4, -11], [102.6, 10.5, -1], pushK(f, 1874, 0.0025, 0.006, 30), { fov: 50, roll: 0.03 }) },
    { f: 1924, cut: true, s: (f) => dolly([103.9, 14.1, -4.6], [101.2, 13.5, -0.9], pushK(f, 1924, 0.0022, 0.006, 25), { fov: 42 }) },
  ],
};

// impact kicks: image offset flips sign every frame, decays over 7 f
const KICKS: [number, number][] = [[24.97, 1.6], [27.27, 0.8], [30.0, 1.8], [34.83, 0.5], [35.06, 0.5], [35.33, 0.6], [39.62, 1.4], [41.3, 0.8], [61.2, 0.7], [61.67, 0.7]];
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

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyesM = (id: number) => (f: number): V3 => add(M(id, f), [0, 1.65, 0]);
const eyesL = (id: number) => (f: number): V3 => add(Lu(id, f), [0, 1.6, 0]);
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 81, cInf: 8 }, // hanging ship (focus = look)
  { f: 106, dur: 36, cInf: 12, focus: () => [ARCH[0], ARCH[1] + 0.9, ARCH[2]] },
  { f: 153, cInf: 0 },
  { f: 228, cInf: 13, focus: eyesM(3) },
  { f: 290, cInf: 10, focus: eyesL(3) },
  { f: 294, dur: 22, cInf: 0 },
  { f: 316, cInf: 6 },
  { f: 352, dur: 40, cInf: 11, focus: () => [ARCH[0], ARCH[1] + 0.9, ARCH[2]] },
  { f: 412, cInf: 14, focus: () => [ARCH[0], ARCH[1] + 0.9, ARCH[2]] },
  { f: 522, cInf: 0 },
  { f: 692, cInf: 7, focus: () => [ARCH[0], ARCH[1] + 0.9, ARCH[2]] },
  { f: 710, cInf: 13, focus: eyesM(5) },
  { f: 722, cInf: 0 },
  { f: 830, cInf: 10, focus: eyesM(7) },
  { f: 872, dur: 20, cInf: 6, focus: eyesM(7) },
  { f: 915, cInf: 6, focus: () => [-38.6, 3.4, -2.6] },
  { f: 995, cInf: 12, focus: eyesL(8) },
  { f: 1069, cInf: 0 },
  { f: 1140, cInf: 13, focus: eyesM(9) },
  { f: 1176, cInf: 0 },
  { f: 1272, cInf: 14, focus: eyesM(10) },
  { f: 1417, cInf: 9, focus: () => [104, 1.9, -5] },
  { f: 1490, cInf: 0 },
  { f: 1600, cInf: 6, focus: () => [101, 1.5, -17] },
  { f: 1700, cInf: 0 },
  { f: 1782, cInf: 11, focus: () => [102.9, 2.0, -1.2] },
  { f: 1834, cInf: 0 },
  { f: 1924, cInf: 10, focus: () => [101.6, 13.9, -1.35] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

/** fleet visible in a shot */
export const shipsAt = (id: number, t: number): ShipPose[] => {
  const tau = SHOTS[id - 1].tau(t);
  const out: ShipPose[] = [];
  if (id === 1 || id === 3) out.push(...fleet(t, -84, 1.6).filter((s) => Math.abs(s.x + 14) > 6));
  if (id === 5 || id === 6 || id === 2) out.push(...fleet(Math.min(t, 19), -60, 1.2, 7).filter((s) => Math.abs(s.x) > 7 && Math.abs(s.x + 15) > 6).map((s) => ({ ...s, z: Math.min(s.z, -22), sail: false })));
  if (id === 7 || id === 9 || id === 10) out.push(...fleet(0, -70, 0, 6).map((s) => ({ ...s, x: s.x - 30, z: s.z - 10, sail: false })).filter((s) => Math.abs(s.x + 45) > 7 && Math.abs(s.x + 28) > 6 && Math.abs(s.x + 15) > 6));
  if (id !== 4 && id < 11) out.push(FLAG(id, t));
  if (id === 1 || id === 2 || id === 3 || id === 5 || id === 6) out.push(victim(tau));
  if (id === 9 || id === 10) {
    const L = ladderAt(tau), sink = L.broken * 0.6;
    out.push({ kind: "samA", x: SAMB_X - 1.6, y: -sink, z: -18, yaw: 0, pitch: 0, roll: -0.03 * L.broken, row: 0, sail: false });
    out.push({ kind: "samB", x: SAMB_X + 1.6, y: -sink, z: -18, yaw: 0, pitch: 0, roll: 0.03 * L.broken, row: 0, sail: false });
  }
  return out;
};
