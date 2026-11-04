// Timeline of the Babylon short: shots timed to the voice words (voice/words.json), the camera grammar of the bridge
// template (smootherstep glides 18-40 f, creeping push-ins on every hold, cuts on big reframes, 7-frame flip kicks).
// Layout (metres): the Euphrates runs along x (z -15..15), ground G = 3 m. Babylon lies at x > 0 behind the outer wall
// (x 0..6, top 18), a moat (x 8..14) and the inner wall (x 16..22, top 22). The blue gate sits at z = 70. The Persian
// camp is west of the city (x -170..-70, z -140..-40); the diversion channel leaves the river at x = -100 toward a marsh.
export const FPS = 30;
export const TOTAL = 2070;
export const G = 3; // ground level
export const D0 = G; // (template name, used by build.ts)
export const WN = 1.8; // normal river level
export const WLOW = 0.62; // "thigh height" level after the diversion (bed at 0)
export const GATE_Z = 70;
export const OUT_TOP = 18, IN_TOP = 22;
export const CYRUS_CAMP: V3 = [-112, G, -64];
export const PLAZA: V3 = [74, G, 112];
export const SIPPAR: V3 = [-420, G, 260];
export const OPIS: V3 = [-430, G, -330];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number; sunAz?: number; sunEl?: number };
const T0 = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 248, light: "day", tau: T0, sunAz: 120 },   // hook aerial -> push to the gate
  { id: 2, a: 248, b: 312, light: "day", tau: T0 },              // gatekeeper on the wall
  { id: 3, a: 312, b: 370, light: "day", tau: T0, sunAz: 110 },  // two walls + moat
  { id: 4, a: 370, b: 490, light: "day", tau: T0, sunAz: 140 },  // the blue gate, dragons + bulls
  { id: 5, a: 490, b: 622, light: "day", tau: T0 },              // scout looks up, chariot on the wall top
  { id: 6, a: 622, b: 694, light: "day", tau: T0 },              // Cyrus in camp
  { id: 7, a: 694, b: 736, light: "day", tau: T0 },              // the army on the march
  { id: 8, a: 736, b: 876, light: "day", tau: T0, sunAz: 100 },  // Opis, map-like high view
  { id: 9, a: 876, b: 918, light: "day", tau: T0 },              // Sippar
  { id: 10, a: 918, b: 1006, light: "day", tau: T0, sunAz: 130 },// entering Babylon, gatekeeper nervous
  { id: 11, a: 1006, b: 1088, light: "day", tau: T0, sunAz: 130 },// Cyrus arrives 17 days later
  { id: 12, a: 1088, b: 1214, light: "golden", tau: T0 },        // Herodotus: Cyrus + scout study the river
  { id: 13, a: 1214, b: 1314, light: "golden", tau: T0, sunAz: 40, sunEl: 12 }, // digging, water into the channel
  { id: 14, a: 1314, b: 1386, light: "golden", tau: T0, sunAz: 30, sunEl: 10 }, // the river sinks at the water gate
  { id: 15, a: 1386, b: 1500, light: "golden", tau: T0, sunAz: 20, sunEl: 9 },  // wading in under the walls
  { id: 16, a: 1500, b: 1634, light: "golden", tau: T0, sunAz: -40, sunEl: 12 }, // the festival
  { id: 17, a: 1634, b: 1709, light: "golden", tau: T0, sunAz: 30, sunEl: 10 }, // scout nods along (Xenophon)
  { id: 18, a: 1709, b: 1760, light: "day", tau: T0 },           // "here's the twist": scout confused
  { id: 19, a: 1760, b: 1852, light: "day", tau: T0, sunAz: 120 },// the full river, no trick in the record
  { id: 20, a: 1852, b: 1916, light: "day", tau: T0, sunAz: 150 },// Cyrus under the gate, low angle
  { id: 21, a: 1916, b: TOTAL, light: "golden", tau: T0, sunAz: 60, sunEl: 9 }, // final aerial
];
/** crossfades at place/time changes; a white 4-frame flash after the hook and on the twist */
export const XFADE: Record<number, number> = { 12: 10, 21: 10 };
export const FLASH_AT = 248;
export const FLASH2_AT = 1709;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** river level downstream of the diversion: full by day, sinks on "sank to thigh height" (shot 14), low in 15/17 */
export const riverLevel = (id: number, f: number) => {
  if (id === 14) return WN + (WLOW - WN) * smooth((f - 1322) / 45);
  if (id === 15 || id === 17) return WLOW;
  return WN;
};
/** water in the diversion channel: 0 dry .. 1 full; fills during shot 13 after the last spadeful ("into a marsh") */
export const channelFill = (id: number, f: number) => (id === 13 ? smooth((f - 1262) / 40) : id >= 14 && id <= 17 ? 1 : 0);
/** gates open from shot 10 on (the record says the city was entered without battle: no mechanism shown) */
export const gateOpen = (id: number) => id >= 10 && id !== 12 && id !== 13 && id !== 14 && id !== 15 && id !== 16;

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
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---- character marks (shared with cast.ts) ----
export const KEEPER_WALL: V3 = [1.6, OUT_TOP, GATE_Z - 16];   // gatekeeper on the outer wall walk, beside the gate towers
export const SCOUT_BASE: V3 = [-7, G, GATE_Z - 12];          // scout at the foot of the wall
export const RIVER_BANK: V3 = [-60, G, -17.5];               // Cyrus + scout on the south bank, upstream of the city
export const DIG: V3 = [-100, G, 30];                        // channel works (north bank)
export const WADE: V3 = [-14, 0, 0];                         // wading column, just outside the water gate

// shot 1: aerial over the plain, the army approaching, push hard toward the gate
const S1a = (f: number) => dolly([-230, 150, -190], [20, 8, 50], pushK(f, 0, 0.0025), { fov: 42 });
const S1b = (f: number) => dolly([-95, 48, 10], [4, 12, GATE_Z], pushK(f, 92, 0.003), { fov: 42 });
const S1c = (f: number) => dolly([-34, 9, 52], [0, 11, GATE_Z], pushK(f, 170, 0.004, 0.008, 30), { fov: 40, roll: 0.035 });
// shot 2: low on the plain looking up at the gatekeeper on the wall; MS on "untouchable"
const S2a = (f: number) => zoom([-16, G + 1.2, KEEPER_WALL[2] - 9], add(KEEPER_WALL, [0, 1.5, 0]), 34, pushK(f, 244, 0.0025));
const S2b = (f: number) => dolly([-4.4, OUT_TOP + 1.9, KEEPER_WALL[2] - 3.4], add(KEEPER_WALL, [0, 1.55, 0]), pushK(f, 278, 0.0025, 0.006, 30), { fov: 36, roll: -0.035 });
// shot 3: high oblique across both walls and the moat
const S3a = (f: number) => dolly([-46, 44, -6], [14, 12, 36], pushK(f, 312, 0.003), { fov: 40 });
// shot 4: the gate, push in on the glazed animals; punch on "dragons"
const S4a = (f: number) => zoom([-22, G + 1.6, GATE_Z - 7], [0, 9, GATE_Z], 40, pushK(f, 370, 0.0022));
const S4b = (f: number) => zoom([-12, G + 2.2, GATE_Z - 3.5], [0, 10.5, GATE_Z - 4.2], 36, pushK(f, 438, 0.002, 0.006, 30), { roll: 0.035 });
// shot 5: behind-and-below the scout, the wall towers; the chariot passes on the top
const S5a = (f: number) => dolly([-30, G + 1.0, SCOUT_BASE[2] - 8], [-2, G + 8, SCOUT_BASE[2] + 2], pushK(f, 490, 0.0018), { fov: 40 });
const S5b = (f: number) => dolly([SCOUT_BASE[0] - 3.4, G + 1.45, SCOUT_BASE[2] + 2.2], add(SCOUT_BASE, [0, 1.5, 0]), pushK(f, 578, 0.002, 0.006, 30), { fov: 34, roll: 0.04 });
// shot 6: Cyrus MS in camp, tents and banners behind
const S6a = (f: number) => dolly(add(CYRUS_CAMP, [3.2, 1.6, -5.4]), add(CYRUS_CAMP, [0, 1.65, 0]), pushK(f, 622, 0.0025), { fov: 36 });
const S6b = (f: number) => dolly(add(CYRUS_CAMP, [1.6, 1.75, -3.6]), add(CYRUS_CAMP, [0, 1.75, 0]), pushK(f, 652, 0.002, 0.005, 30), { fov: 34, roll: -0.035 });
// shot 7: tracking the column (marching +x along z = -40), Babylon on the horizon
export const COL_Z = -40;
export const colFront = (t: number) => -95 + 1.6 * (t - 23.1);
const S7a = (f: number) => { const x = colFront(T(f)); return { pos: [x - 9, G + 2.2, COL_Z - 11] as V3, look: [x + 4, G + 1.8, COL_Z + 2] as V3, fov: 42 }; };
// shot 8: Opis, map-like: high and steep over the plain, the two armies, the Babylonians break
const S8a = (f: number) => dolly(add(OPIS, [-36, 30, -26]), add(OPIS, [2, 0, 4]), pushK(f, 736, 0.0018), { fov: 42 });
const S8b = (f: number) => dolly(add(OPIS, [-26, 22, -22]), add(OPIS, [6, 1, 6]), pushK(f, 806, 0.0025, 0.006, 30), { fov: 40, roll: 0.035 });
// shot 9: Sippar, small walled town with Persian banners going up
const S9a = (f: number) => dolly(add(SIPPAR, [-78, 9, -16]), add(SIPPAR, [-30, 6, 0]), pushK(f, 876, 0.004), { fov: 42 });
// shot 10: outside the gate: Persian soldiers walk in; gatekeeper on the wall looks down nervous (MS on "inside the city")
const S10a = (f: number) => dolly([-38, G + 2.6, GATE_Z - 4.5], [0, G + 5.5, GATE_Z], pushK(f, 918, 0.0022), { fov: 42 });
const S10b = (f: number) => dolly([-4.2, OUT_TOP + 1.8, KEEPER_WALL[2] - 3.0], add(KEEPER_WALL, [0, 1.5, 0]), pushK(f, 962, 0.003), { fov: 36, roll: 0.035 });
// shot 11: Cyrus on the causeway, walking to the gate between saluting soldiers
export const cyrusWalkX = (t: number) => -24 + 1.15 * (t - 33.3);
const S11a = (f: number) => { const x = cyrusWalkX(T(f)); return dolly([x - 0.5, G + 1.6, GATE_Z - 6.6], [x + 0.2, G + 1.6, GATE_Z], pushK(f, 1006, 0.002), { fov: 38 }); };
// shot 12: golden riverside, Cyrus points at the water, the scout beside him
const S12a = (f: number) => dolly(add(RIVER_BANK, [-5.5, 1.4, -6.5]), add(RIVER_BANK, [1.2, 1.5, 1.2]), pushK(f, 1084, 0.0018), { fov: 40 });
const S12b = (f: number) => dolly(add(RIVER_BANK, [-2.5, 1.5, -4.2]), add(RIVER_BANK, [0.5, 1.6, 0.4]), pushK(f, 1150, 0.002), { fov: 36, roll: -0.035 });
// shot 13: digging the channel; high view so the river and the new channel read as a diagram in the landscape
const S13a = (f: number) => dolly([DIG[0] + 0.6, G + 2.2, 25.5], [DIG[0], G + 1.0, 17.2], pushK(f, 1214, 0.0025), { fov: 42 });
const S13b = (f: number) => dolly([-150, 60, 105], [-98, 0, 18], pushK(f, 1258, 0.0018), { fov: 42 });
// shot 14: at the water gate from the bank: the level drops along the wall
const S14a = (f: number) => zoom([-42, G + 3.5, -28], [-4, 1.4, 0], 36, pushK(f, 1314, 0.0025, 0.005, 30));
// shot 15: low in the riverbed, soldiers wading toward the arch, walls overhead
const S15a = (f: number) => dolly([WADE[0] - 15, 1.35, -4.2], [WADE[0], 3.2, 0.5], pushK(f, 1386, 0.0022), { fov: 44, roll: 0.03 });
const S15b = (f: number) => dolly([WADE[0] - 13, 0.95, 3.2], [WADE[0] + 2, 6.5, -0.5], pushK(f, 1446, 0.002, 0.005, 30), { fov: 50, roll: -0.04 });
// shot 16: the festival plaza; at "didn't even notice" the Persians slip past behind the dancers
const S16a = (f: number) => dolly(add(PLAZA, [-11, 2.4, -12]), add(PLAZA, [0, 1.5, 0]), pushK(f, 1500, 0.0022), { fov: 40 });
const S16b = (f: number) => dolly(add(PLAZA, [-4.5, 1.8, -6.5]), add(PLAZA, [0.5, 1.6, 0.5]), pushK(f, 1572, 0.002, 0.005, 30), { fov: 38, roll: 0.035 });
// shot 17: scout CU in the riverbed, nodding along
const S17a = (f: number) => dolly([WADE[0] - 2.6, 1.15, -3.6], [WADE[0] + 0.2, 1.3, -1.2], pushK(f, 1634, 0.0025), { fov: 36 });
// shot 18: the twist: scout CU by day on the dry bank, confused
const S18a = (f: number) => dolly(add(RIVER_BANK, [-1.6, 1.25, -2.9]), add(RIVER_BANK, [0.9, 1.15, 0.3]), pushK(f, 1709, 0.003, 0.008, 25), { fov: 34, roll: 0.04 });
// shot 19: the full river and the water gate, nothing happening
const S19a = (f: number) => zoom([-55, 9, -36], [6, 6, 2], 40, pushK(f, 1760, 0.0025));
// shot 20: low angle under the gate, Cyrus walks in
const S20a = (f: number) => zoom([-10.5, G + 0.5, GATE_Z - 1.6], [0, G + 4.8, GATE_Z + 0.2], 56, pushK(f, 1852, 0.0025, 0.005, 25), { roll: -0.04 });
// shot 21: final aerial: crane up and back over Babylon at sunset
const S21a = (f: number): Shot => {
  const u = glide((f - 1910) / 160);
  return { pos: [-40 - 60 * u, 30 + 70 * u, -60 - 70 * u], look: [90 + 10 * u, 18 - 6 * u, 70], fov: 42, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 92, dur: 40, s: S1b }, { f: 170, dur: 34, s: S1c }],
  2: [{ f: 244, s: S2a }, { f: 278, cut: true, s: S2b }],
  3: [{ f: 312, s: S3a }],
  4: [{ f: 370, s: S4a }, { f: 438, dur: 30, s: S4b }],
  5: [{ f: 490, s: S5a }, { f: 578, cut: true, s: S5b }],
  6: [{ f: 622, s: S6a }, { f: 652, dur: 26, s: S6b }],
  7: [{ f: 694, s: S7a }],
  8: [{ f: 736, s: S8a }, { f: 806, cut: true, s: S8b }],
  9: [{ f: 876, s: S9a }],
  10: [{ f: 918, s: S10a }, { f: 962, cut: true, s: S10b }],
  11: [{ f: 1006, s: S11a }],
  12: [{ f: 1084, s: S12a }, { f: 1150, dur: 30, s: S12b }],
  13: [{ f: 1214, s: S13a }, { f: 1258, cut: true, s: S13b }],
  14: [{ f: 1314, s: S14a }],
  15: [{ f: 1386, s: S15a }, { f: 1446, cut: true, s: S15b }],
  16: [{ f: 1500, s: S16a }, { f: 1572, dur: 28, s: S16b }],
  17: [{ f: 1634, s: S17a }],
  18: [{ f: 1709, s: S18a }],
  19: [{ f: 1760, s: S19a }],
  20: [{ f: 1852, s: S20a }],
  21: [{ f: 1910, s: S21a }],
};

/** impact kicks (s, gain): "defeated", "twist", the end hit */
const KICKS: [number, number][] = [[27.1, 0.8], [56.98, 1], [36.26, 0.4]];
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
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                              // aerial hook
  { f: 248, cInf: 0 },                                            // low wide up the wall
  { f: 278, cInf: 11, focus: () => add(KEEPER_WALL, [0, 1.6, 0]) }, // gatekeeper MS
  { f: 312, cInf: 0 },                                            // walls + moat, gate
  { f: 490, cInf: 7, focus: () => [0, G + 8, GATE_Z - 8] },       // scout OTS: wall in focus
  { f: 578, cInf: 13, focus: () => add(SCOUT_BASE, [0, 1.5, 0]) }, // scout CU
  { f: 622, cInf: 12, focus: () => add(CYRUS_CAMP, [0, 1.7, 0]) }, // Cyrus MS
  { f: 694, cInf: 0 },                                            // tracking, Opis map, Sippar, gate
  { f: 962, cInf: 11, focus: () => add(KEEPER_WALL, [0, 1.6, 0]) }, // gatekeeper nervous
  { f: 1006, cInf: 8 },                                           // Cyrus on the causeway (focus = look)
  { f: 1088, cInf: 10, focus: () => add(RIVER_BANK, [0, 1.6, 0]) }, // riverside
  { f: 1214, cInf: 9 },                                           // diggers (focus = look)
  { f: 1258, cInf: 0 },                                           // channel aerial, water gate
  { f: 1386, cInf: 0 },                                           // wading wide
  { f: 1446, cInf: 8 },                                           // wading low, walls overhead
  { f: 1500, cInf: 9 },                                           // festival (focus = look)
  { f: 1634, cInf: 13, focus: () => [WADE[0] + 0.2, 1.4, -1.2] }, // scout CU
  { f: 1709, cInf: 14, focus: () => add(RIVER_BANK, [0.9, 1.35, 0.3]) }, // twist CU
  { f: 1760, cInf: 0 },                                           // river, gate, aerial
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
