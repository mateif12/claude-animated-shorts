// Babylon, its river, walls, gates, ziggurat, houses, the Persian camp, Sippar and the Opis plain, built from the
// bridge template's pieces (Batch, boxGeo, quad, two-tone lam materials, Canvas2D painted textures with painted seams).
import * as THREE from "three";
import { Batch, boxGeo, quad, V, lam } from "./build";
import { ctex, rng, jit, stoneHD } from "./paint";
import { G, GATE_Z, OUT_TOP, IN_TOP, SIPPAR, CYRUS_CAMP, PLAZA, OPIS, V3 } from "./story";

const INKL = "rgba(40,30,40,0.85)";

// ---------------- painted textures ----------------
/** sun-dried / baked brick courses (ochre), seams painted in as dark tints */
const mudbrick = (key: string, base: string, mortar: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = mortar; g.fillRect(0, 0, 1024, 1024);
  const RH = 64;
  for (let row = 0; row < 1024 / RH; row++) {
    let x = row % 2 ? -64 : 0;
    while (x < 1024) {
      const w = 128;
      g.fillStyle = jit(r, base, 0.07, 3, 0.1);
      g.fillRect(x + 3, row * RH + 3, w - 6, RH - 6);
      if (r() < 0.18) { g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x + 10, row * RH + 8, w * 0.5, 8); }
      x += w;
    }
  }
  g.strokeStyle = "rgba(60,40,30,0.25)"; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 * (r() - 0.5), y + 14); g.stroke(); }
});
/** cartoon glazed-brick animal in yellow/white with ink outline (dragon = mušḫuššu, bull = aurochs) */
const animal = (g: CanvasRenderingContext2D, x: number, y: number, s: number, kind: "dragon" | "bull" | "lion") => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = "#1d1430"; g.lineWidth = 7;
  const body = kind === "bull" ? "#f2e4c4" : kind === "lion" ? "#f0c54a" : "#f4dca0";
  g.fillStyle = body;
  // legs
  for (const lx of [-58, -30, 30, 58]) { g.beginPath(); g.moveTo(lx, 10); g.lineTo(lx + (kind === "dragon" && lx < 0 ? -6 : 4), 92); g.stroke(); }
  // body
  g.beginPath(); g.ellipse(0, 0, 82, kind === "bull" ? 42 : 34, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // neck + head
  g.beginPath();
  if (kind === "dragon") { g.moveTo(60, -12); g.quadraticCurveTo(95, -60, 92, -110); g.lineTo(122, -112); g.quadraticCurveTo(116, -70, 82, 6); g.closePath(); }
  else { g.moveTo(58, -20); g.lineTo(108, -48); g.lineTo(122, -18); g.lineTo(80, 14); g.closePath(); }
  g.fill(); g.stroke();
  if (kind === "dragon") { g.beginPath(); g.moveTo(96, -112); g.lineTo(84, -140); g.lineTo(106, -116); g.stroke(); g.beginPath(); g.moveTo(-80, -6); g.quadraticCurveTo(-130, -40, -116, -80); g.stroke(); }
  if (kind === "bull") { g.beginPath(); g.moveTo(108, -46); g.quadraticCurveTo(112, -86, 136, -84); g.stroke(); g.beginPath(); g.moveTo(-80, 0); g.lineTo(-108, 40); g.stroke(); }
  if (kind === "lion") { g.fillStyle = "#c9782e"; g.beginPath(); g.arc(98, -28, 30, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-80, -4); g.quadraticCurveTo(-120, -20, -118, 30); g.stroke(); }
  g.fillStyle = "#1d1430"; g.beginPath(); g.arc(kind === "dragon" ? 104 : 104, kind === "dragon" ? -100 : -30, 5, 0, 7); g.fill();
  g.restore();
};
/** blue glazed brick with a row of animals and a rosette band; one tile = 4 m x 4 m */
const glazed = (key: string, kind: "dragon" | "bull" | "lion" | "none") => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = "#14306a"; g.fillRect(0, 0, 1024, 1024);
  const RH = 48;
  for (let row = 0; row < 1024 / RH + 1; row++) {
    let x = row % 2 ? -48 : 0;
    while (x < 1024) { g.fillStyle = jit(r, "#2a63b8", 0.1, 4, 0.08); g.fillRect(x + 2, row * RH + 2, 92, RH - 4); x += 96; }
  }
  // rosette bands top and bottom
  for (const by of [40, 984]) {
    g.fillStyle = "#e9dfc4"; g.fillRect(0, by - 22, 1024, 44);
    for (let x = 32; x < 1024; x += 64) {
      g.fillStyle = "#f2efe4"; g.beginPath(); g.arc(x, by, 17, 0, 7); g.fill();
      g.fillStyle = "#e3a93a"; g.beginPath(); g.arc(x, by, 7, 0, 7); g.fill();
      g.strokeStyle = INKL; g.lineWidth = 3; g.beginPath(); g.arc(x, by, 17, 0, 7); g.stroke();
    }
  }
  if (kind !== "none") animal(g, 512, 500, 2.6, kind);
});
const plainTex = (key: string, base: string, spots: string[]) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = spots[i % spots.length];
    const x = r() * 1024, y = r() * 1024;
    g.beginPath(); g.ellipse(x, y, 6 + r() * 26, 3 + r() * 10, r() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(70,60,30,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 160; i++) { const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 14); g.stroke(); }
});
const stripes = (key: string, a: string, b: string) => ctex(key, 256, 256, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 32, 0, 32, 256); }
  g.fillStyle = "rgba(40,30,40,0.5)"; for (let i = 1; i < 8; i++) g.fillRect(i * 32 - 1, 0, 2, 256);
});
const doorTex = (key: string, wall: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = jit(r, wall, 0.06, 3, 0.1); g.fillRect(r() * 512, r() * 512, 30, 14); }
  g.fillStyle = "#5a3a2a"; g.strokeStyle = "#241726"; g.lineWidth = 8;
  g.beginPath(); g.rect(200, 300, 112, 212); g.fill(); g.stroke();
  g.fillStyle = "#2a1c22";
  for (const x of [70, 380]) { g.beginPath(); g.rect(x, 140, 60, 44); g.fill(); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, 512, 24);
});

// ---------------- materials ----------------
let M: Record<string, THREE.Material> | null = null;
export const mats = () => {
  if (M) return M;
  const R = (t: THREE.Texture, x = 1, y = 1) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
  M = {
    plain: lam("plainB", () => ({ map: plainTex("plainB", "#b9b26a", ["#a6a95c", "#c9b97a", "#9fae5e", "#d0c086"]) })),
    sand: lam("sandB", () => ({ map: plainTex("sandB", "#d8c08a", ["#cdb47c", "#e2cc98", "#c8ae76"]) })),
    bank: lam("bankB", () => ({ map: stoneHD("bankB", ["#9c7d58", "#8f7150", "#a88760", "#957552"], "#6e563c") })),
    bed: lam("bedB", () => ({ map: plainTex("bedB", "#7a6448", ["#6a563e", "#86704f", "#5e4c36"]) })),
    wall: lam("wallB", () => ({ map: mudbrick("wallB", "#d2a868", "#9a7446") })),
    wallDark: lam("wallB2", () => ({ map: mudbrick("wallB2", "#c4975a", "#8a643c") })),
    house: lam("houseB", () => ({ map: doorTex("houseB", "#dcc08c") })),
    house2: lam("houseB2", () => ({ map: doorTex("houseB2", "#e6d2a6") })),
    house3: lam("houseB3", () => ({ map: doorTex("houseB3", "#cfa874") })),
    roof: lam("roofB", () => ({ color: "#c9a874" })),
    pave: lam("paveB", () => ({ map: stoneHD("paveB", ["#e2d6bc", "#d6c8ab", "#ebe0c8", "#cfc0a2"], "#a8987a") })),
    gDragon: lam("gDragon", () => ({ map: glazed("gDragon", "dragon") })),
    gBull: lam("gBull", () => ({ map: glazed("gBull", "bull") })),
    gLion: lam("gLion", () => ({ map: glazed("gLion", "lion") })),
    gPlain: lam("gPlain", () => ({ map: glazed("gPlain", "none") })),
    zig: lam("zigB", () => ({ map: mudbrick("zigB", "#c99a62", "#8f6a42") })),
    temple: lam("templeB", () => ({ map: glazed("templeB", "none") })),
    cedar: lam("cedarB", () => ({ color: "#7a4a2c" })),
    bronze: lam("bronzeB", () => ({ color: "#c08a3e" })),
    trunk: lam("trunkB", () => ({ color: "#8a6a44" })),
    leaf: lam("leafB", () => ({ color: "#4f9a46", side: THREE.DoubleSide })),
    leaf2: lam("leafB2", () => ({ color: "#5fae4c", side: THREE.DoubleSide })),
    reed: lam("reedB", () => ({ color: "#8fb054" })),
    tentR: lam("tentR", () => ({ map: R(stripes("tentR", "#c2453a", "#efe2c4")) })),
    tentB: lam("tentBl", () => ({ map: R(stripes("tentBl", "#3f6fb5", "#efe2c4")) })),
    tentY: lam("tentY", () => ({ map: R(stripes("tentY", "#d9a441", "#f3ead2")) })),
    tentP: lam("tentP", () => ({ map: R(stripes("tentP", "#6a3d9a", "#e8c45a")) })),
    pole: lam("poleB", () => ({ color: "#7a5434" })),
    flagR: lam("flagRB", () => ({ color: "#c2453a", side: THREE.DoubleSide })),
    flagG: lam("flagGB", () => ({ color: "#e0b030", side: THREE.DoubleSide })),
    flagP: lam("flagPB", () => ({ color: "#6a3d9a", side: THREE.DoubleSide })),
    cart: lam("cartB", () => ({ color: "#a8724a" })),
    dirt: lam("dirtB", () => ({ color: "#8a6a48" })),
    awning: lam("awnB", () => ({ map: R(stripes("awnB", "#c25a7a", "#f3ead2")) })),
  };
  return M;
};

/** horizontal quad facing up at height y over x0..x1, z0..z1 (texture tile in metres) */
export const flat = (x0: number, x1: number, z0: number, z1: number, y: number, tile = 20) =>
  quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), (x1 - x0) / tile, (z1 - z0) / tile);
/** vertical quad along x at z (facing +z if dir > 0) */
const wallX = (x0: number, x1: number, z: number, y0: number, y1: number, dir: number, tile = 4) =>
  dir > 0 ? quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z), (x1 - x0) / tile, (y1 - y0) / tile)
    : quad(V(x1, y0, z), V(x0, y0, z), V(x0, y1, z), V(x1, y1, z), (x1 - x0) / tile, (y1 - y0) / tile);
/** vertical quad along z at x (facing +x if dir > 0) */
const wallZ = (z0: number, z1: number, x: number, y0: number, y1: number, dir: number, tile = 4) =>
  dir > 0 ? quad(V(x, y0, z1), V(x, y0, z0), V(x, y1, z0), V(x, y1, z1), (z1 - z0) / tile, (y1 - y0) / tile)
    : quad(V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0), (z1 - z0) / tile, (y1 - y0) / tile);

const RIVER = 15, MOAT0 = 8, MOAT1 = 14, CH0 = -104, CH1 = -96, CH_END = 104;
export const LAYOUT = { RIVER, MOAT0, MOAT1, CH0, CH1, CH_END };
const inRect = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;

/** city wall with towers and merlons, along z at x0..x1, broken at the river and the gate */
const cityWall = (b: Batch, m: Record<string, THREE.Material>, x0: number, x1: number, top: number, zA: number, zB: number) => {
  const gaps: [number, number][] = [[-RIVER, RIVER], [GATE_Z - 3, GATE_Z + 3]];
  const segs: [number, number][] = [];
  let z = zA;
  for (const [g0, g1] of gaps) { segs.push([z, g0]); z = g1; }
  segs.push([z, zB]);
  for (const [s0, s1] of segs) {
    b.add(boxGeo(V(x0, G - 0.2, s0), V(x1, top, s1), 4), m.wall);
    // towers every 24 m, 1.2 m proud on the outside, 3.5 m higher
    for (let tz = Math.ceil((s0 + 6) / 24) * 24; tz < s1 - 6; tz += 24)
      if (Math.abs(tz - GATE_Z) > 14) b.add(boxGeo(V(x0 - 1.2, G - 0.2, tz - 3), V(x1 + 0.4, top + 3.5, tz + 3), 4), m.wallDark);
    // merlons on the outer edge
    for (let mz = s0 + 0.6; mz < s1 - 1; mz += 2.4) b.add(boxGeo(V(x0, top, mz), V(x0 + 0.8, top + 1.1, mz + 1.2)), m.wall);
  }
  // over the river: a lintel on two piers, the water passes beneath (the "water gate")
  b.add(boxGeo(V(x0, G + 5.5, -RIVER - 0.5), V(x1, top, RIVER + 0.5), 4), m.wall);
  for (let mz = -RIVER + 0.6; mz < RIVER - 1; mz += 2.4) b.add(boxGeo(V(x0, top, mz), V(x0 + 0.8, top + 1.1, mz + 1.2)), m.wall);
  // over the gate: lintel
  b.add(boxGeo(V(x0, G + 9, GATE_Z - 3), V(x1, top, GATE_Z + 3), 4), m.wall);
};

/** blue glazed gate towers (two per gate) with an animal frieze, crenellated */
const gate = (b: Batch, m: Record<string, THREE.Material>, x0: number, x1: number, top: number, front: THREE.Material, tile = 4) => {
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? GATE_Z - 9 : GATE_Z + 3, z1 = s < 0 ? GATE_Z - 3 : GATE_Z + 9;
    b.add(boxGeo(V(x0 - 2, G - 0.2, z0), V(x1 + 1, top + 5, z1), tile), front);
    for (let mz = z0 + 0.3; mz < z1 - 0.8; mz += 1.8) b.add(boxGeo(V(x0 - 2, top + 5, mz), V(x0 - 1.1, top + 6.2, mz + 0.9)), m.gPlain);
  }
  // the lintel face over the opening, glazed too
  b.add(boxGeo(V(x0 - 1.4, G + 9, GATE_Z - 3), V(x1 + 0.6, top + 2.5, GATE_Z + 3), 4), m.gPlain);
  for (let mz = GATE_Z - 2.7; mz < GATE_Z + 2.5; mz += 1.8) b.add(boxGeo(V(x0 - 1.4, top + 2.5, mz), V(x0 - 0.5, top + 3.6, mz + 0.9)), m.gPlain);
};

/** flat-roofed mudbrick house with a parapet */
const house = (b: Batch, m: Record<string, THREE.Material>, x: number, z: number, w: number, d: number, h: number, k: number, y = G) => {
  const mat = [m.house, m.house2, m.house3][k % 3];
  b.add(boxGeo(V(x - w / 2, y - 0.2, z - d / 2), V(x + w / 2, y + h, z + d / 2), 0), mat);
  b.add(boxGeo(V(x - w / 2 - 0.1, y + h, z - d / 2 - 0.1), V(x + w / 2 + 0.1, y + h + 0.6, z + d / 2 + 0.1), 0), m.roof);
};

const palm = (b: Batch, m: Record<string, THREE.Material>, x: number, z: number, h: number, seed: number, y = G) => {
  const lean = 0.25 * Math.sin(seed * 3.1);
  const tr = new THREE.CylinderGeometry(0.16, 0.26, h, 6);
  b.add(tr, m.trunk, new THREE.Matrix4().makeRotationZ(lean * 0.3).setPosition(x + lean * h * 0.15, y + h / 2, z));
  const tx = x + lean * h * 0.3, ty = y + h;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + seed;
    const fr = new THREE.ConeGeometry(0.55, 3.6, 4); fr.rotateZ(-Math.PI / 2 - 0.5); fr.translate(1.6, -0.4, 0);
    b.add(fr, i % 2 ? m.leaf : m.leaf2, new THREE.Matrix4().makeRotationY(a).setPosition(tx, ty, z));
  }
};

const tent = (b: Batch, mat: THREE.Material, m: Record<string, THREE.Material>, x: number, z: number, r: number, h: number) => {
  b.add(new THREE.CylinderGeometry(r, r, h * 0.45, 10, 1, true), mat, new THREE.Matrix4().makeTranslation(x, G + h * 0.225, z));
  b.add(new THREE.ConeGeometry(r * 1.12, h * 0.65, 10), mat, new THREE.Matrix4().makeTranslation(x, G + h * 0.45 + h * 0.325, z));
  b.add(boxGeo(V(x - 0.05, G + h * 0.9, z - 0.05), V(x + 0.05, G + h * 1.25, z + 0.05)), m.pole);
};
const banner = (b: Batch, m: Record<string, THREE.Material>, x: number, z: number, h: number, mat: THREE.Material) => {
  b.add(boxGeo(V(x - 0.07, G, z - 0.07), V(x + 0.07, G + h, z + 0.07)), m.pole);
  b.add(quad(V(x + 0.07, G + h - 1.3, z), V(x + 1.9, G + h - 1.15, z), V(x + 1.9, G + h - 0.05, z), V(x + 0.07, G + h, z)), mat);
};
export const cartGeo = (b: Batch, m: Record<string, THREE.Material>, x: number, z: number, yaw = 0) => {
  const T = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, G, z);
  b.add(boxGeo(V(-1.1, 0.6, -0.6), V(1.1, 1.2, 0.6)), m.cart, T);
  for (const s of [-1, 1]) {
    const w = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12); w.rotateX(Math.PI / 2);
    b.add(w, m.pole, T.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.55, s * 0.68)));
  }
  b.add(boxGeo(V(1.1, 0.75, -0.05), V(2.6, 0.85, 0.05)), m.pole, T);
};

/** everything static. Returns nothing; dynamic water / gate doors live in world.ts */
export const buildCity = (root: THREE.Object3D) => {
  const m = mats(), b = new Batch(), r = rng(7);
  // ---- ground (holes for the river, the moat and the diversion channel) ----
  for (const [x0, x1, z0, z1] of [
    [-900, MOAT0, -900, -RIVER], [MOAT1, 900, -900, -RIVER],
    [-900, CH0, RIVER, 900], [CH1, MOAT0, RIVER, CH_END], [CH1, MOAT0, CH_END, 900], [MOAT1, 900, RIVER, 900],
  ] as [number, number, number, number][]) {
    // inside the city (x > MOAT1) the ground is packed earth / sand, outside it is the green-ochre floodplain
    b.add(flat(x0, x1, z0, z1, G, 24), x0 >= MOAT1 ? m.sand : m.plain);
  }
  b.add(flat(CH0, CH1, CH_END, CH_END + 0.01, G), m.plain); // (degenerate seam filler)
  // river bed, moat bed, channel bed
  b.add(flat(-900, 900, -RIVER, RIVER, 0, 12), m.bed);
  b.add(flat(MOAT0, MOAT1, -900, -RIVER, 0, 8), m.bed); b.add(flat(MOAT0, MOAT1, RIVER, 900, 0, 8), m.bed);
  b.add(flat(CH0, CH1, RIVER, CH_END, 0.0, 8), m.bed);
  // banks: river (both sides), moat (both sides), channel
  for (const [s, z] of [[1, -RIVER], [-1, RIVER]] as const) {
    b.add(wallX(-900, CH0, z, 0, G, s, 4), m.bank);
    b.add(wallX(CH1, MOAT0, z, 0, G, s, 4), m.bank);
    b.add(wallX(MOAT1, 900, z, 0, G, s, 4), m.wallDark); // brick quay inside the city
  }
  b.add(wallX(CH0, CH1, -RIVER, 0, G, 1, 4), m.bank);
  for (const [zs, ze] of [[-900, -RIVER], [RIVER, 900]] as const) { b.add(wallZ(zs, ze, MOAT0, 0, G, 1), m.bank); b.add(wallZ(zs, ze, MOAT1, 0, G, -1), m.wallDark); }
  b.add(wallZ(RIVER, CH_END, CH0, 0, G, 1), m.bank); b.add(wallZ(RIVER, CH_END, CH1, 0, G, -1), m.bank);
  b.add(wallX(CH0, CH1, CH_END, 0, G, -1), m.bank);
  // causeway over the moat to the gate
  b.add(boxGeo(V(MOAT0 - 0.1, 0, GATE_Z - 3), V(MOAT1 + 0.1, G, GATE_Z + 3), 3), m.wallDark);
  // ---- walls + gates ----
  cityWall(b, m, 0, 6, OUT_TOP, -420, 420);
  cityWall(b, m, 16, 22, IN_TOP, -420, 420);
  gate(b, m, 0, 6, OUT_TOP, m.gDragon, 6);
  gate(b, m, 16, 22, IN_TOP, m.gBull, 6);
  // processional way: paving from the gate into the city, lion-glazed walls lining it
  b.add(flat(-30, 165, GATE_Z - 4, GATE_Z + 4, G + 0.02, 6), m.pave);
  for (const s of [-1, 1]) b.add(boxGeo(V(26, G - 0.2, GATE_Z + s * 7 - 0.8), V(70, G + 5, GATE_Z + s * 7 + 0.8), 4), m.gLion);
  // ---- ziggurat (Etemenanki, stylised) ----
  const ZX = 168, ZZ = GATE_Z + 6;
  let y = G;
  for (const [w, h] of [[56, 11], [42, 9], [30, 8], [20, 7]] as const) { b.add(boxGeo(V(ZX - w / 2, y - 0.2, ZZ - w / 2), V(ZX + w / 2, y + h, ZZ + w / 2), 4), m.zig); y += h; }
  b.add(boxGeo(V(ZX - 6, y, ZZ - 6), V(ZX + 6, y + 6, ZZ + 6), 4), m.temple);
  b.add(boxGeo(V(ZX - 6.4, y + 6, ZZ - 6.4), V(ZX + 6.4, y + 6.8, ZZ + 6.4)), m.gPlain);
  // the stair up the front
  b.add(boxGeo(V(ZX - 28 - 14, G - 0.2, ZZ - 3), V(ZX - 28, G + 11, ZZ + 3), 2), m.zig);
  // ---- houses: blocks either side of the river and the processional way ----
  for (let x = 30; x < 300; x += 9 + r() * 3) for (let z = -260; z < 260; z += 9 + r() * 3) {
    if (Math.abs(z) < RIVER + 7) continue;
    if (x < 175 && z > GATE_Z - 10 && z < GATE_Z + 10) continue; // processional
    if (inRect(x, z, ZX - 36, ZX + 36, ZZ - 36, ZZ + 36)) continue;
    if (Math.hypot(x - PLAZA[0], z - PLAZA[2]) < 22) continue;
    if (r() < 0.12) continue;
    const w = 6 + r() * 3, d = 6 + r() * 3, h = 4 + r() * 5;
    house(b, m, x + (r() - 0.5) * 2, z + (r() - 0.5) * 2, w, d, h, Math.floor(r() * 3));
  }
  // plaza: paving, an altar-like dais and awnings round the festival square
  const P = PLAZA;
  b.add(flat(P[0] - 20, P[0] + 20, P[2] - 20, P[2] + 20, G + 0.03, 6), m.pave);
  b.add(boxGeo(V(P[0] + 9, G, P[2] + 3), V(P[0] + 15, G + 0.9, P[2] + 9), 2), m.gPlain);
  for (const [ax, az] of [[P[0] - 14, P[2] + 14], [P[0] + 14, P[2] - 14], [P[0] + 15, P[2] + 15]] as const) {
    b.add(boxGeo(V(ax - 2.5, G + 2.6, az - 2), V(ax + 2.5, G + 2.8, az + 2)), m.awning);
    for (const [px, pz] of [[-2.3, -1.8], [2.3, -1.8], [-2.3, 1.8], [2.3, 1.8]]) b.add(boxGeo(V(ax + px - 0.06, G, az + pz - 0.06), V(ax + px + 0.06, G + 2.6, az + pz + 0.06)), m.pole);
  }
  // ---- palms: river banks outside the walls, the plain, the camp ----
  for (let i = 0; i < 70; i++) {
    const x = -340 + r() * 330, side = r() < 0.5 ? -1 : 1, z = side * (RIVER + 4 + r() * 40);
    if (x > -110 && x < -90 && z > 0) continue; // channel works
    if (inRect(x, z, -175, -55, -150, -30)) continue; // camp
    if (Math.abs(z - GATE_Z) < 14 && x > -60) continue; // approach to the gate
    if (Math.abs(z - (-40)) < 6) continue; // marching road
    palm(b, m, x, z, 6 + r() * 4, i);
  }
  for (let i = 0; i < 26; i++) { const x = 40 + r() * 230, z = (r() < 0.5 ? -1 : 1) * (RIVER + 2.5 + r() * 3); palm(b, m, x, z, 7 + r() * 3, i + 100); }
  // palms and fields round the Opis plain
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 35 + r() * 60; palm(b, m, OPIS[0] + Math.cos(a) * d, OPIS[2] + Math.sin(a) * d, 6 + r() * 4, i + 300); }
  for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2, d = 45 + r() * 40; if (Math.cos(a) < -0.3) continue; palm(b, m, SIPPAR[0] + Math.cos(a) * d, SIPPAR[2] + Math.sin(a) * d, 6 + r() * 4, i + 400); }
  // ---- Persian camp ----
  const C = CYRUS_CAMP, tm = [m.tentR, m.tentB, m.tentY];
  for (let i = 0; i < 46; i++) {
    const x = -168 + (i % 9) * 12 + (r() - 0.5) * 4, z = -138 + Math.floor(i / 9) * 17 + (r() - 0.5) * 4;
    if (Math.hypot(x - C[0], z - C[2]) < 10) continue;
    tent(b, tm[i % 3], m, x, z, 2.2 + r() * 0.8, 4 + r() * 1.2);
  }
  tent(b, m.tentP, m, C[0] + 1.5, C[2] + 9, 4.2, 7.5); // the king's tent behind him
  for (const [bx, bz, mt] of [[C[0] - 4, C[2] + 3, m.flagP], [C[0] + 5, C[2] + 4, m.flagG], [-150, -46, m.flagR], [-90, -48, m.flagG], [-130, -100, m.flagR]] as const)
    banner(b, m, bx, bz, 6.5, mt);
  for (const [cx, cz, yw] of [[C[0] - 7, C[2] - 2, 0.4], [-86, -58, 1.2], [-140, -60, -0.3], [-100, -90, 0.8]] as const) cartGeo(b, m, cx, cz, yw);
  // marsh reeds round the basin north of the channel
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, rr = 34 + r() * 6, x = CH0 + 4 + Math.cos(a) * rr * 1.2, z = CH_END + 36 + Math.sin(a) * rr;
    b.add(new THREE.ConeGeometry(0.35, 2.2 + r(), 4), m.reed, new THREE.Matrix4().makeTranslation(x, G + 1.1, z));
  }
  // ---- Sippar: a small walled town far up the plain ----
  const S = SIPPAR;
  for (const [x0, z0, x1, z1] of [[-30, -30, 30, -26], [-30, 26, 30, 30], [-30, -26, -26, 26], [26, -26, 30, 26]] as const) {
    if (x0 === -30 && x1 === -26) { // west wall with a gate gap
      b.add(boxGeo(V(S[0] + x0, G, S[2] + z0), V(S[0] + x1, G + 9, S[2] - 3), 4), m.wall);
      b.add(boxGeo(V(S[0] + x0, G, S[2] + 3), V(S[0] + x1, G + 9, S[2] + z1), 4), m.wall);
      b.add(boxGeo(V(S[0] + x0, G + 6, S[2] - 3), V(S[0] + x1, G + 9, S[2] + 3), 4), m.wall);
    } else b.add(boxGeo(V(S[0] + x0, G, S[2] + z0), V(S[0] + x1, G + 9, S[2] + z1), 4), m.wall);
  }
  for (const [tx, tz] of [[-30, -30], [26, -30], [-30, 26], [26, 26], [-30, -7], [-30, 3]] as const) b.add(boxGeo(V(S[0] + tx - 1, G, S[2] + tz - 1), V(S[0] + tx + 5, G + 12, S[2] + tz + 5), 4), m.wallDark);
  for (let i = 0; i < 18; i++) house(b, m, S[0] - 16 + (i % 5) * 8, S[2] - 16 + Math.floor(i / 5) * 9, 5.5, 6, 4 + r() * 3, i);
  y = G; for (const [w, h] of [[16, 5], [10, 4], [6, 3]] as const) { b.add(boxGeo(V(S[0] + 12 - w / 2, y, S[2] + 12 - w / 2), V(S[0] + 12 + w / 2, y + h, S[2] + 12 + w / 2), 4), m.zig); y += h; }
  b.build(root);
};

/** positions that crowds must keep clear of (for cast.ts) */
export const clearOfHouses = (x: number, z: number) => !(x > 26 && Math.abs(z) > RIVER + 5);
export type { V3 };
