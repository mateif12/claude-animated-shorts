// "Rivers in the Sky": timeline of the aqueduct short. Shots, cameras and story state are pure functions of the frame,
// timed to voice/words.json (every visual beat lands 0-3 frames before its word). Camera grammar from the skill:
// hard cuts on big reframes, smootherstep glides of 18-40 f, every hold creeps (push-in), 7-frame flip kicks on impacts.
export const FPS = 30;
export const TOTAL = 1755; // 58.5 s (voice ends 57.40 s)
export const D0 = 0; // build.ts compatibility (ground datum)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

// ---------------- world layout (metres) ----------------
// The valley runs along z (river at x = 0); the aqueduct crosses it along x at z = 0, from the spring (west, x -330)
// to the city (east, x 160-300). Channel water surface at CHY; arcade tiers like the Pont du Gard (3 tiers).
export const CHY = 47.9;
export const BAY = 50 / 3; // lower / middle tier bay width (m)
export const valleyG = (x: number) => 47 * smooth((Math.abs(x) - 48) / 95); // ground height along the aqueduct line
export const TUN: V3 = [-235, 47, 0]; // tunnel hill centre (shafts on its crest)
export const tunnelBump = (x: number, z: number) => 16 * Math.exp(-((x - TUN[0]) ** 2 + z * z) / 28 ** 2);
export const SHAFTS = [-252, -238, -224, -211];
export const SPRING: V3 = [-333, 48.9, 0];
export const SURVEY: V3 = [-150, 47, 45];
export const PLAZA: V3 = [215, 47, -30]; // fountain in the city square
export const CASTELLUM: V3 = [240, 47, 0];
export const SITE = { x0: 50 / 3 * 2, x1: 50, block: [28.2, 0, 13] as V3, wheel: [36.5, 0, 12] as V3 }; // construction bay 33.3-50

// ---------------- shots ----------------
export type Light = "day" | "golden";
/** build: "done" = finished aqueduct, "site" = construction state (upper tiers not yet built, one lower bay in work) */
export type ShotDef = { id: number; a: number; b: number; light: Light; build: "done" | "site" | "none" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 150, light: "golden", build: "done" },     // hook: along the channel, aerial of the arcade
  { id: 2, a: 150, b: 298, light: "day", build: "done" },      // thirsty city, distant springs
  { id: 3, a: 298, b: 404, light: "day", build: "done" },      // the spring: gravity
  { id: 4, a: 404, b: 586, light: "day", build: "none" },      // surveyors: groma, chorobates
  { id: 5, a: 586, b: 769, light: "day", build: "done" },      // gentle slope
  { id: 6, a: 769, b: 908, light: "day", build: "done" },      // shafts and tunnels
  { id: 7, a: 908, b: 1004, light: "day", build: "done" },     // arches over the valley
  { id: 8, a: 1004, b: 1254, light: "day", build: "site" },    // construction
  { id: 9, a: 1254, b: 1368, light: "day", build: "done" },    // sealing the channel
  { id: 10, a: 1368, b: 1543, light: "day", build: "done" },   // water arrives
  { id: 11, a: 1543, b: TOTAL, light: "golden", build: "done" }, // ending
];
export const XFADE: Record<number, number> = {};
export const FLASH_AT = 150;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** x reached by the water front in the channel (water exists for x < front); -1e9 = dry */
export const waterFront = (id: number, f: number) => {
  if (id === 1 || id === 5 || id === 11) return 1e9;
  if (id === 3) return 1e9; // the explanation shots show the water running
  if (id === 10) return f < 1385 ? -326 : -326 + (f - 1385) * 6.2; // gate opens on "opened"; cartoon-fast travel (narration: "about a day")
  return -1e9;
};
export const fountainOn = (id: number, f: number) => (id === 10 && f >= 1484 ? smooth((f - 1484) / 8) : id === 11 ? 1 : 0);
/** construction: block on the crane rope, 0 = on the ground .. 1 = set on the arch ring */
export const liftU = (f: number) => smooth((f - 1082) / 120);
export const keystoneU = (f: number) => smooth((f - 1170) / 50);
export const STRIKES = [1004, 1022, 1043, 1061];

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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const S = SITE, SV = SURVEY, PZ = PLAZA, SP = SPRING;
const shaftY = (x: number) => 47 + tunnelBump(x, 0);
export const CAMS: Record<number, Key[]> = {
  1: [
    // golden hook: low over the flowing channel, travelling along the arcade toward the city
    { f: 0, s: (f) => ({ pos: [-70 + 0.16 * f, 50.4, 0.8], look: [-38 + 0.16 * f, 47.6, 0.0], fov: 50, roll: -0.03 }) },
    // "without a single pump?": aerial of the whole crossing, creeping in
    { f: 78, cut: true, s: (f) => dolly([-120, 78, 128], [15, 28, 0], pushK(f, 78, 0.0022), { fov: 44, roll: 0.0 }) },
  ],
  2: [
    // the thirsty city: people with empty jars around a dry fountain
    { f: 150, s: (f) => dolly([318, 92, -128], [222, 47, -28], pushK(f, 150, 0.0022), { fov: 42 }) },
    { f: 176, dur: 30, s: (f) => dolly([300, 80, -112], [220, 47, -30], pushK(f, 176, 0.002, 0.005, 30), { fov: 40, roll: 0.03 }) },
    // "the clean springs were dozens of kilometres away": look west over the roofs to the far hills
    { f: 222, cut: true, s: (f) => zoom([214, 74, -32], [-300, 64, 0], 34, pushK(f, 222, 0.004)) },
  ],
  3: [
    // the spring: water spills from the rock pool into the channel; glide down with it on "gravity"
    { f: 298, s: (f) => dolly(add(SP, [17, 4.6, 12]), add(SP, [3, 0.4, 0]), pushK(f, 298, 0.0025), { fov: 44 }) },
    { f: 350, dur: 36, s: (f) => dolly(add(SP, [3.5, 2.8, 4.8]), add(SP, [15, 0.0, 0]), pushK(f, 350, 0.002, 0.006, 30), { fov: 46, roll: -0.04 }) },
  ],
  4: [
    // surveyors: the engineer sights along the groma
    { f: 404, s: (f) => dolly(add(SV, [-6.5, 1.8, 0.9]), add(SV, [8, 1.25, -0.2]), pushK(f, 404, 0.0018), { fov: 44 }) },
    // the chorobates, a 6 m levelling table
    { f: 462, cut: true, s: (f) => dolly(add(SV, [3.0, 2.6, -10.5]), add(SV, [6.5, 0.9, 2]), pushK(f, 462, 0.002), { fov: 46, roll: 0.03 }) },
    // "water-level": close on the water groove along the table top
    { f: 506, dur: 30, s: (f) => dolly(add(SV, [4.2, 1.6, 0.6]), add(SV, [7.6, 1.13, 2]), pushK(f, 506, 0.0025), { fov: 36, roll: 0.0 }) },
  ],
  5: [
    // the channel runs gently downhill across the plateau, water flowing (side view, low)
    { f: 586, s: (f) => ({ pos: [-186 + 0.05 * (f - 586), 50.8, 7.5], look: [-150 + 0.05 * (f - 586), 47.4, 0.0], fov: 44, roll: 0 }) },
    // "thirty-four centimetres per kilometre": lens rides just over the water, looking down the channel
    { f: 690, cut: true, s: (f) => ({ pos: [-178 + 0.11 * (f - 690), 49.0, 0.0], look: [-158 + 0.11 * (f - 690), 47.75, 0.0], fov: 46, roll: 0.035 }) },
  ],
  6: [
    // the tunnel hill: shafts down to the channel line, windlasses on top
    { f: 769, s: (f) => dolly([-166, 50.6, 6.5], [-200, 51.5, 0], pushK(f, 769, 0.002), { fov: 52 }) },
    // "shafts": close on a shaft head, workers hauling spoil up
    { f: 852, cut: true, s: (f) => dolly([-220.5, shaftY(-224) + 2.4, 8.5], [-224, shaftY(-224) + 0.6, 0], pushK(f, 852, 0.0028), { fov: 42, roll: -0.03 }) },
  ],
  7: [
    // the valley: low on the floor, the three tiers towering; punch on "arches"
    { f: 908, s: (f) => dolly([-34, 1.7, 46], [6, 27, 0], pushK(f, 908, 0.0015, 0.005, 40), { fov: 56, roll: 0.0 }) },
    { f: 960, dur: 34, s: (f) => dolly([-22, 2.4, 36], [8, 30, 0], pushK(f, 960, 0.0015), { fov: 58, roll: -0.045 }) },
  ],
  8: [
    // construction: a mason dresses a block (kicks on the mallet strikes)
    { f: 1004, s: (f) => dolly(add(S.block, [-1.2, 1.3, 3.6]), add(S.block, [-0.7, 0.85, 0]), pushK(f, 1004, 0.0025), { fov: 40 }) },
    // "treadwheel cranes": the wheel turns, the block climbs
    { f: 1074, cut: true, s: (f) => dolly([62, 4.5, 33], [39.5, 7.0, 7.5], pushK(f, 1074, 0.0018), { fov: 56 }) },
    // "wooden frames": the centering under the half-built arch, the keystone goes in
    { f: 1160, cut: true, s: (f) => dolly([41.7, 2.4, 19.5], [41.7, 11.0, 0], pushK(f, 1160, 0.0022), { fov: 56, roll: 0.0 }) },
    { f: 1212, dur: 26, s: (f) => dolly([41.7, 2.2, 17.0], [41.7, 12.0, 0], pushK(f, 1212, 0.002, 0.005, 28), { fov: 54, roll: 0.04 }) },
  ],
  9: [
    // sealing: inside the channel on the top tier, a worker trowels the pink waterproof lining
    { f: 1254, s: (f) => dolly([-64.0, 49.2, 0.0], [-69.5, 47.3, 0.0], pushK(f, 1254, 0.0025), { fov: 46, roll: 0.0 }) },
    { f: 1300, dur: 30, s: (f) => dolly([-66.6, 48.7, 0.25], [-69.6, 47.35, 0.0], pushK(f, 1300, 0.002, 0.005, 30), { fov: 42, roll: -0.03 }) },
  ],
  10: [
    // the gate at the spring opens: water rushes into the channel
    { f: 1368, s: (f) => dolly(add(SP, [14, 2.1, 6.2]), add(SP, [6, 0.3, 0]), pushK(f, 1368, 0.0025), { fov: 42 }) },
    // racing the water front along the top of the arcade
    { f: 1414, cut: true, s: (f) => { const x = waterFront(10, f); return { pos: [x - 8, 51.0, 1.6], look: [x + 5, 47.5, 0], fov: 50, roll: -0.03 }; } },
    // the city: the fountain bursts on "fountains", the baths steam behind
    { f: 1456, cut: true, s: (f) => dolly(add(PZ, [2.2, 1.9, -5.2]), add(PZ, [0, 0.95, 0.3]), pushK(f, 1456, 0.002, 0.006, 30), { fov: 44 }) },
  ],
  11: [
    // golden ending: from above the city back across the whole aqueduct; slow crane up and out
    { f: 1538, s: (f) => { const u = glide((f - 1538) / 217); return { pos: [300 + 30 * u, 92 + 26 * u, 105 + 35 * u], look: [60 - 25 * u, 32, 0], fov: 42, roll: 0 }; } },
  ],
};

const KICKS: [number, number][] = [[379 / FPS, 0.6], [1222 / FPS, 0.9], [1487 / FPS, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
