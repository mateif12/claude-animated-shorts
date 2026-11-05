// "Snake Mail" timeline: shots locked to the narrator's word onsets (voice/words.json, faster-whisper word times,
// checked by hand), ship choreography, camera keys (smootherstep glides, creeping push-ins on every hold, flip
// kicks on impacts) and the lens-blur table. Camera grammar is the bridge short's (motion.md).
export const FPS = 30;
export const TOTAL = 2131; // 71.033 s: covers the whole voice file (71.0008 s)
export const D0 = 1.6;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

/** word-locked story times (s), from words.json */
export const TT = {
  hook0: 2.2, hookEnd: 4.45, elephant: 6.78, gull: 9.46, wave: 15.78, rome: 18.08, snakes0: 23.34, lots: 24.22, stuffed: 25.62,
  opens: 36.14, insults: 37.86, which: 41.72, every: 43.68, lob: 47.46, laughs: 49.6, break: 53.74, harmless: 58.84,
  check: 60.26, runs: 63.14, shore: 66.38, tag: 70.28,
};

export const LOC: Record<"battle" | "harbour" | "meadow" | "beach", V3> = { battle: [0, 0, 0], harbour: [1500, 0, 0], meadow: [3000, 0, 0], beach: [-1500, 0, 0] };

export type Light = "day" | "golden";
export type ShotDef = { id: number; name: string; a: number; b: number; light: Light; sunAz?: number; sunEl?: number };
const S = (name: string, a: number, b: number, light: Light = "day", extra: Partial<ShotDef> = {}) => ({ name, a: Math.round(a * FPS), b: Math.round(b * FPS), light, ...extra });
const LIST = [
  S("hook", 0, 4.55),
  S("elephant", 4.55, 7.85),
  S("harbour", 7.85, 13.3),
  S("pergFleet", 13.3, 18.8),
  S("meadow", 18.8, 23.15),
  S("snakes", 23.15, 27.45),
  S("messenger", 27.45, 31.6),
  S("escort", 31.6, 35.65),
  S("opens", 35.65, 39.35),
  S("knows", 39.35, 43.35),
  S("attack", 43.35, 45.85),
  S("lob", 45.85, 49.3),
  S("laughs", 49.3, 53.05),
  S("break", 53.05, 54.75),
  S("venom", 54.75, 59.8),
  S("check", 59.8, 62.3),
  S("flee", 62.3, 64.75, "golden"),
  S("shore", 64.75, 67.1, "golden", { sunAz: 140, sunEl: 14 }),
  S("nametag", 67.1, 71.0, "golden"),
];
export const SHOTS: ShotDef[] = LIST.map((s, i) => ({ id: i + 1, ...s, b: i === LIST.length - 1 ? TOTAL : s.b }));
const ID = (name: string) => SHOTS.find((s) => s.name === name)!.id;
export const XFADE: Record<number, number> = { [ID("harbour")]: 8, [ID("pergFleet")]: 8, [ID("meadow")]: 8, [ID("messenger")]: 8, [ID("flee")]: 8, [ID("shore")]: 8, [ID("nametag")]: 8 };
export const FLASH_AT = SHOTS[1].a;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- ships ----------------
export type ShipDef = { id: string; fleet: "bith" | "perg"; big?: boolean; bob: number };
export const SHIPS: ShipDef[] = [
  { id: "han", fleet: "bith", bob: 0 }, { id: "b1", fleet: "bith", bob: 1.1 }, { id: "b2", fleet: "bith", bob: 2.3 }, { id: "b3", fleet: "bith", bob: 3.1 }, { id: "b4", fleet: "bith", bob: 4.2 },
  { id: "king", fleet: "perg", big: true, bob: 0.6 }, { id: "perg2", fleet: "perg", bob: 1.7 },
  ...Array.from({ length: 9 }, (_, i) => ({ id: "p" + i, fleet: "perg" as const, bob: 0.4 + i * 0.77 })),
  { id: "d1", fleet: "bith", bob: 0.3 }, { id: "d2", fleet: "bith", bob: 1.3 }, { id: "d3", fleet: "bith", bob: 2.2 },
];
type Pose = { x: number; z: number; yaw: number; row: number; roll: number };
const BITH_FAR: Record<string, [number, number]> = { han: [0, 40], b1: [-16, 50], b2: [16, 48], b3: [-32, 60], b4: [32, 58] };
const PERG_FAR: Record<string, [number, number]> = { king: [0, -30], perg2: [-22, -40], ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => ["p" + i, [(i % 2 ? 1 : -1) * (14 + (i >> 1) * 13), -36 - (i % 3) * 14 - (i >> 1) * 4] as [number, number]])) };
const PI = Math.PI;
/** pose of ship `sid` in shot `shot` at story time t (null = not in this place) */
export const shipPose = (sid: string, shot: number, t: number): Pose | null => {
  const name = SHOTS[shot - 1].name;
  if (name === "harbour") {
    const i = ["d1", "d2", "d3"].indexOf(sid);
    return i < 0 ? null : { x: LOC.harbour[0] - 30 + i * 27, z: 7.5, yaw: PI / 2, row: 0, roll: 0 };
  }
  if (name === "meadow" || name === "snakes" || name === "shore") return null;
  if (sid.startsWith("d")) return null;
  const close = ["hook", "lob", "laughs", "break", "venom", "check", "nametag"].includes(name);
  if (close) {
    if (sid === "han") return { x: 0, z: 6, yaw: PI, row: 0, roll: 0 };
    if (sid === "perg2") return { x: -15, z: 2, yaw: PI * 0.92, row: 0, roll: 0 };
    if (sid === "king") return name === "nametag" ? { x: 6, z: -40, yaw: PI, row: 0.6, roll: 0 } : { x: 6, z: -26, yaw: 0.15, row: 0, roll: 0 };
    if (BITH_FAR[sid]) { const [x, z] = BITH_FAR[sid]; return { x: x * 1.3, z: z - 22, yaw: PI, row: 0.5, roll: 0 }; }
    const [x, z] = PERG_FAR[sid]; return { x: x * 1.4, z: z - (name === "nametag" ? 40 : 10), yaw: name === "nametag" ? PI : 0.1, row: name === "nametag" ? 0.6 : 0, roll: 0 };
  }
  if (name === "attack") {
    const t0 = SHOTS[shot - 1].a / FPS, u = t - t0;
    if (BITH_FAR[sid]) {
      const [x0, z0] = BITH_FAR[sid], [kx, kz] = PERG_FAR.king, dx = kx - x0, dz = kz - z0, d = Math.hypot(dx, dz);
      let head = Math.atan2(dx, dz); if (head < 0) head += 2 * PI;
      const k = smooth(u / 0.9), go = 4 * u * u + 2 * u;
      return { x: x0 + (dx / d) * go, z: z0 + (dz / d) * go, yaw: PI + (head - PI) * k, row: 1.4, roll: 0.03 * Math.sin(k * PI) };
    }
    const [x, z] = PERG_FAR[sid]; return { x, z, yaw: 0, row: 0, roll: 0 };
  }
  if (name === "flee") {
    if (BITH_FAR[sid]) { const [x, z] = BITH_FAR[sid]; return { x: x * 1.3, z: z - 30, yaw: PI, row: 0.7, roll: 0 }; }
    const [x, z] = PERG_FAR[sid], t0 = SHOTS[shot - 1].a / FPS, u = t - t0, turn = smooth((u - 0.2) / 1.1);
    return { x, z: z - 10 - Math.max(0, u - 0.8) ** 1.5 * 6, yaw: PI * turn, row: 1.4, roll: 0.05 * Math.sin(turn * PI) };
  }
  // far: before the battle (elephant, pergFleet, messenger, escort, opens, knows)
  if (BITH_FAR[sid]) {
    const [x, z] = BITH_FAR[sid];
    const roll = sid === "han" && name === "elephant" && t > TT.elephant ? -0.07 * smooth((t - TT.elephant) / 0.25) + 0.02 * Math.sin((t - TT.elephant) * 9) * Math.exp(-(t - TT.elephant) * 2) : 0;
    return { x, z, yaw: PI, row: 0, roll };
  }
  const [x, z] = PERG_FAR[sid]; return { x, z, yaw: 0, row: 0, roll: 0 };
};
/** world point on the deck of ship sid (local lx across, lz along toward the bow) */
export const onDeck = (sid: string, shot: number, t: number, lx: number, lz0: number): V3 => {
  const lz = sid === "perg2" ? lz0 + 3.5 : lz0; // perg2's action happens forward of the mast (clear sight lines)
  const p = shipPose(sid, shot, t) ?? { x: 0, z: 0, yaw: 0, row: 0, roll: 0 };
  const sd = SHIPS.find((s) => s.id === sid)!, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const y = 0.12 * Math.sin(t * 1.7 + sd.bob) - 0.05 + 1.38 + 0.5 * ((2 * lz) / 22) ** 4 - (p.roll + 0.02 * Math.sin(t * 1.1 + sd.bob * 2)) * lx;
  return [p.x + lx * c + lz * s, y, p.z - lx * s + lz * c];
};
/** the messenger's skiff, rowing from Hannibal's side toward the king's ship */
export const SKIFF = (t: number): V3 => { const u = clamp01((t - 27.45) / 4.2); return [-6 + 3 * u, 0.1, 18 - 14 * u]; };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Partial<Cam> & { pos: V3; look: V3 } };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Partial<Cam> & { pos: V3; look: V3 }): Cam => ({ fov: 40, roll: 0, ...c });
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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** dolly toward the look point: subject grows ~rate per frame since f0 */
const push = (pos: V3, look: V3, f: number, f0: number, rate = 0.0025): V3 => {
  const k = 1 - Math.min(0.6, rate * Math.max(0, f - f0));
  return [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];
};
const W = (s: number) => Math.round(s * FPS);
/** impact kicks: [frame, strength] — flip sign every frame, decay over 7 f */
export const KICKS: [number, number][] = [[W(TT.elephant), 0.6], [W(TT.break), 1], [W(TT.check) + 10, 0.5], [W(TT.tag), 0.35], [W(TT.insults), 0.25]];
const kickAt = (f: number) => {
  let r = 0;
  for (const [k, s] of KICKS) { const d = f - k; if (d >= 0 && d < 7) r += s * (d % 2 ? -1 : 1) * (1 - d / 7); }
  return r;
};

/** world point in ship sid's frame: lx across, ly above the deck, lz toward the bow */
const Lc = (sid: string, id: number, t: number, lx: number, ly: number, lz: number): V3 => add(onDeck(sid, id, t, lx, lz), [0, ly, 0]);
const CAMS: Record<string, (f: number, id: number) => Cam> = {
  hook: (f, id) => {
    const t = T(f), look = Lc("han", id, t, 1.2, 1.55, 5.5);
    return run([
      { f: 0, s: (g) => ({ pos: push(Lc("han", id, t, -0.4, 1.9, 10.6), look, g, 0, 0.0018), look, fov: 38, roll: 0.06 }) },
      { f: W(TT.hook0 + 0.9), dur: 30, s: (g) => ({ pos: push(Lc("han", id, t, -0.2, 1.8, 9.8), look, g, W(TT.hook0 + 0.9), 0.003), look: add(look, [0, 0.4, 0]), fov: 36, roll: -0.03 }) },
    ], f);
  },
  elephant: (f, id) => {
    const t = T(f), a = SHOTS[id - 1].a, look = Lc("han", id, t, 0.5, 1.5, 6);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("han", id, t, -0.3, 1.8, 11.4), look, g, a, 0.0022), look, fov: 40 }) },
      { f: W(TT.elephant) - 6, dur: 18, s: (g) => ({ pos: push(Lc("han", id, t, -0.6, 2.6, 13.5), add(look, [0, 0.6, 0]), g, W(TT.elephant), 0.002), look: Lc("han", id, t, 0.9, 2.2, 5), fov: 44, roll: 0.07 }) },
    ], f);
  },
  harbour: (f, id) => {
    const [hx, , hz] = LOC.harbour, a = SHOTS[id - 1].a, t = T(f), x = hx - 6 + 1.1 * (t - a / FPS);
    const look: V3 = [x + 0.6, 2.9, hz - 3.2];
    return run([
      { f: a, s: (g) => ({ pos: [x - 2.5, 3.6, hz + 8.5 - 0.004 * (g - a)], look: add(look, [0, 0.5, 0]), fov: 40, roll: -0.02 }) },
      { f: W(TT.gull) - 12, dur: 24, s: (g) => ({ pos: push([x + 1.0, 3.6, hz + 4.6], add(look, [0, 0.7, 0]), g, W(TT.gull), 0.0025), look: add(look, [0, 0.8, 0]), fov: 38 }) },
      { f: W(10.3), dur: 34, s: (g) => ({ pos: push([x + 3.5, 4.6, hz + 12], add(look, [-4, 0, 6]), g, W(10.3), 0.0015), look: add(look, [-4, 0.4, 6]), fov: 46, roll: 0.03 }) },
    ], f);
  },
  pergFleet: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("king", id, t, 0.5, 1.55, -3.8);
    return run([
      { f: a, s: (g) => ({ pos: [40 - 0.05 * (g - a), 9 + 0.06 * (g - a), 12 - 0.04 * (g - a)], look: [0, 3, -45], fov: 44, roll: -0.04 }) },
      { f: W(16.6), dur: 36, s: (g) => ({ pos: push(Lc("king", id, t, 1.2, 2.2, 3.4), look, g, W(16.6), 0.002), look, fov: 38, roll: 0.03 }) },
    ], f);
  },
  meadow: (f, id) => {
    const [mx, , mz] = LOC.meadow, a = SHOTS[id - 1].a, t = T(f), x = mx - 3 + 0.6 * (t - a / FPS);
    return run([{ f: a, s: (g) => ({ pos: [x - 1.5 + 0.004 * (g - a), 1.5, mz + 8.5], look: [x + 0.5, 1.7, mz], fov: 42, roll: 0.02 }) }], f);
  },
  snakes: (f, id) => {
    const [mx, , mz] = LOC.meadow, a = SHOTS[id - 1].a;
    const l1: V3 = [mx - 3.2, 1.8, mz - 1.2], l2: V3 = [mx + 0.9, 0.9, mz - 1.9];
    return run([
      { f: a, s: (g) => ({ pos: push([mx - 2.6, 2.2, mz + 4.3], l1, g, a, 0.002), look: l1, fov: 40, roll: -0.03 }) },
      { f: W(TT.lots) - 4, dur: 22, s: (g) => ({ pos: push([mx + 1.2, 2.6, mz + 3.2], l2, g, W(TT.lots), 0.0028), look: l2, fov: 40, roll: 0.04 }) },
      { f: W(TT.stuffed) - 2, dur: 20, s: (g) => ({ pos: push([mx - 1.6, 2.3, mz + 3.4], add(l1, [1.2, -0.3, 0.3]), g, W(TT.stuffed), 0.004), look: add(l1, [1.2, -0.3, 0.3]), fov: 38, roll: -0.02 }) },
    ], f);
  },
  messenger: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), b = SKIFF(t), look: V3 = [b[0], 1.4, b[2]];
    return run([
      { f: a, s: (g) => ({ pos: push([b[0] + 10, 6.5, b[2] + 7], look, g, a, 0.0015), look: add(look, [0, 0, -2]), fov: 40, roll: 0.03 }) },
      { f: W(30.3), dur: 30, s: (g) => ({ pos: push([b[0] + 3.6, 2.4, b[2] + 3.2], look, g, W(30.3), 0.003), look: add(look, [0, 0.4, 0]), fov: 36, roll: -0.02 }) },
    ], f);
  },
  escort: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), u = clamp01((t - a / FPS) / ((SHOTS[id - 1].b - a) / FPS)), mz = 3.5 - 7 * u;
    const look = Lc("king", id, t, 0, 1.4, mz - 1.0);
    return run([{ f: a, s: () => ({ pos: Lc("king", id, t, 4.6, 2.2, mz + 2.2), look, fov: 42, roll: 0.02 }) }], f);
  },
  opens: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("king", id, t, 0, 2.15, -6.3);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("king", id, t, 1.0, 2.0, -1.8), look, g, a, 0.0018), look, fov: 38 }) },
      { f: W(TT.insults) - 3, dur: 10, s: (g) => ({ pos: push(Lc("king", id, t, 0.5, 1.95, -3.4), look, g, W(TT.insults), 0.006), look, fov: 36, roll: 0.06 }) },
    ], f);
  },
  knows: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), hl = Lc("han", id, t, 0.3, 1.6, 7.5), kk = onDeck("king", id, t, 0, -3);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("han", id, t, -0.8, 1.9, 11.6), hl, g, a, 0.002), look: hl, fov: 40, roll: -0.02 }) },
      { f: W(TT.which) - 14, dur: 22, s: (g) => ({ pos: Lc("han", id, t, 1.0, 3.0, 4.0 + 0.01 * (g - W(TT.which))), look: add(kk, [0, 9, 0]), fov: 34, roll: 0.05 }) },
    ], f);
  },
  attack: (f, id) => {
    const a = SHOTS[id - 1].a;
    return run([{ f: a, s: (g) => ({ pos: [44 - 0.08 * (g - a), 26 - 0.04 * (g - a), 52 - 0.12 * (g - a)], look: [0, 0, 5], fov: 46, roll: 0.06 }) }], f);
  },
  lob: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("han", id, t, 0, 1.8, 4.6), p2 = onDeck("perg2", id, t, 0, 0);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("han", id, t, 1.4, 2.2, 10.2), look, g, a, 0.0015), look, fov: 42, roll: 0.03 }) },
      { f: W(TT.lob) + 14, dur: 30, s: (g) => ({ pos: Lc("han", id, t, 1.2, 3.4 + 0.004 * (g - a), 9.8), look: add(p2, [0, 2, 0]), fov: 46, roll: -0.03 }) },
    ], f);
  },
  laughs: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("perg2", id, t, 0, 1.6, 0.5);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("perg2", id, t, 0.6, 2.2, 6.0), look, g, a, 0.002), look, fov: 40, roll: -0.02 }) },
      { f: W(50.98) - 6, dur: 20, s: (g) => ({ pos: push(Lc("perg2", id, t, 1.4, 2.1, 4.6), Lc("perg2", id, t, 1.4, 1.8, 1.2), g, W(51), 0.003), look: Lc("perg2", id, t, 1.4, 1.8, 1.2), fov: 36, roll: 0.05 }) },
    ], f);
  },
  break: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("perg2", id, t, 0, 0.5, 0.5);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("perg2", id, t, 0.4, 1.1, 3.0), look, g, a, 0.004), look, fov: 38 }) },
      { f: W(TT.break) + 6, dur: 14, s: () => ({ pos: Lc("perg2", id, t, 0.8, 2.6, 5.4), look: add(look, [0, 0.5, 0]), fov: 46, roll: -0.08 }) },
    ], f);
  },
  venom: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("perg2", id, t, 0, 0.45, 0.8);
    return run([
      { f: a, s: (g) => ({ pos: push(Lc("perg2", id, t, 0.6, 1.0, 3.8), look, g, a, 0.0018), look, fov: 38, roll: 0.03 }) },
      { f: W(TT.harmless) - 8, dur: 14, s: (g) => ({ pos: push(Lc("perg2", id, t, 0.3, 0.8, 2.8), look, g, W(TT.harmless), 0.0025), look, fov: 36, roll: -0.04 }) },
    ], f);
  },
  check: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), look = Lc("perg2", id, t, 0, 2.0, 0.5);
    return run([{ f: a, s: (g) => ({ pos: push(Lc("perg2", id, t, 9, 3.5, 9), look, g, a, 0.0012), look, fov: 50, roll: -0.08 }) }], f);
  },
  flee: (f, id) => {
    const a = SHOTS[id - 1].a;
    return run([{ f: a, s: (g) => ({ pos: [30 - 0.05 * (g - a), 18 + 0.06 * (g - a), 30 + 0.12 * (g - a)], look: [0, 2, -55], fov: 44, roll: 0.04 }) }], f);
  },
  shore: (f, id) => {
    const [bx, , bz] = LOC.beach, a = SHOTS[id - 1].a, look: V3 = [bx - 0.3, 2.2, bz - 0.5];
    return run([{ f: a, s: (g) => ({ pos: push([bx + 1.8, 2.3, bz + 9.5], look, g, a, 0.0022), look, fov: 40, roll: -0.03 }) }], f);
  },
  nametag: (f, id) => {
    const a = SHOTS[id - 1].a, t = T(f), hl = Lc("han", id, t, 0.2, 1.8, 6), k = onDeck("king", id, t, 0, -3);
    return run([
      { f: a, s: (g) => ({ pos: Lc("han", id, t, 1.2, 3.2 + 0.004 * (g - a), 2.0), look: add(k, [0, 9, 0]), fov: 40, roll: 0.02 }) },
      { f: W(69.6), cut: true, s: (g) => ({ pos: push(Lc("han", id, t, 1.5, 1.9, 10.2), hl, g, W(69.6), 0.003), look: hl, fov: 38, roll: 0.03 }) },
    ], f);
  },
};

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1], c = CAMS[s.name](f, id), k = kickAt(f);
  if (k) { c.pos = [c.pos[0], c.pos[1] + 0.06 * k, c.pos[2]]; c.roll += 0.02 * k; }
  return c;
};

// ---------------- lens blur per shot (cInf px at 1080; 0 = sharp) ----------------
const DOF: Record<string, number> = { hook: 12, elephant: 10, harbour: 8, pergFleet: 0, meadow: 10, snakes: 12, messenger: 6, escort: 10, opens: 14, knows: 8,
  attack: 0, lob: 6, laughs: 11, break: 13, venom: 15, check: 4, flee: 0, shore: 9, nametag: 8 };
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => ({ cInf: DOF[shotAt(f).name] ?? 0 });
