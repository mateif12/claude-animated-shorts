// Characters and 2D effects for the aqueduct short, drawn straight onto a 2D canvas over the 3D render with the SAME
// camera (projection of world points). This replaces the template's per-character billboard textures (the dominant
// cost on a CPU WebGL renderer) while keeping the skill's character design (toon.ts: bean heads, plum ink, crescent
// shading, blinks, 0-3 frame reaction lead) and its effect drawings (fxBurst, fxSplash, fxPuff).
// Placement rule: characters are only staged where no world geometry passes in front of them.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxSplash, fxPuff, Outfit, FrontOpts, Expr, SKINS, INK } from "./toon";
import { FPS, SHOTS, PLAZA, SURVEY, SPRING, SITE, SHAFTS, STRIKES, V3, camAt, waterFront, fountainOn, smooth, keystoneU } from "./story";
import { groundY } from "./world";

// ---------------- Roman cast ----------------
const TUNICS = ["#b07a4f", "#8f6b4a", "#c9a46f", "#9c5c3c", "#7d7f5a", "#a8643c"];
const HAIR = ["#3a2618", "#5a3b2a", "#2a1d16", "#6b4a2f"];
/** labourer: short belted wool tunic, bare legs, sandals */
const worker = (v: number): Outfit => ({ jacket: TUNICS[v % 6], dress: TUNICS[v % 6], pants: SKINS[(v + 1) % 4], boots: "#6b4a2f", hat: "hair", hair: HAIR[v % 4], skin: SKINS[(v + 1) % 4], belt: null, build: v % 3 === 2 ? "stout" : "adult" });
/** engineer / surveyor (mensor): off-white tunic with a red sash, grey hair */
const ENGINEER: Outfit = { jacket: "#efe7d6", dress: "#efe7d6", pants: SKINS[1], boots: "#5a3b2a", hat: "hair", hair: "#8a8580", skin: SKINS[1], sash: "#a8322d", moustache: "#7a756f", build: "stout" };
const citizen = (v: number): Outfit => {
  const cols = ["#5a8fc2", "#c25a7a", "#d9a441", "#6a9a5a", "#8a6ab0", "#e0c9a0"];
  return { jacket: cols[v % 6], dress: cols[(v + 2) % 6], pants: SKINS[v % 4], boots: "#5a3b2a", hat: "hair", hair: HAIR[v % 4], skin: SKINS[v % 4] };
};
const KIDR: Outfit = { jacket: "#e0a050", dress: "#e0a050", pants: SKINS[2], boots: "#5a3b2a", hat: "hair", hair: "#3a2618", skin: SKINS[2], build: "kid" };

// ---------------- life ----------------
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => { let s = Math.round(-60 * hh(i, 9)); for (let n = 0; s <= f && n < 400; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hh(i * 31 + n, 13)); } return 0; };
/** mallet / tool stroke: 0 raised .. 1 struck, 4 f wind-up, ~7 f hold, 1-frame strike (skill's action timing) */
const strikeK = (f: number, hits: number[]) => { let k = 1; for (const th of hits) { const n = f - th; if (n >= -11 && n < -7) k = Math.min(k, 1 - smooth((n + 11) / 4)); else if (n >= -7 && n < 0) k = 0; } return k; };

// ---------------- projection ----------------
const cam = new THREE.PerspectiveCamera(40, 9 / 16, 0.15, 2000);
const P = new THREE.Vector3(), Q = new THREE.Vector3();
type Ctx = { g: CanvasRenderingContext2D; W: number; H: number; f: number; id: number; light: number };
const proj = (c: Ctx, p: V3): [number, number, number] | null => {
  P.set(...p).project(cam);
  if (P.z > 1 || P.z < -1) return null;
  return [(P.x + 1) * 0.5 * c.W, (1 - P.y) * 0.5 * c.H, P.z];
};
/** pixels per metre at world point p (measured along the camera's up axis) */
const ppm = (c: Ctx, p: V3) => {
  const a = proj(c, p); Q.set(0, 1, 0).applyQuaternion(cam.quaternion);
  const b = proj(c, [p[0] + Q.x, p[1] + Q.y, p[2] + Q.z]);
  return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
};
const SU = 2.16 / 1000; // metres per design unit (the skill's card scale)

type Who = { o: Outfit; at: V3; i: number; fo?: FrontOpts; side?: { phase: number; expr: Expr; mirror?: boolean }; scale?: number; jar?: boolean };
const person = (c: Ctx, w: Who) => {
  const s = w.scale ?? 1, feet = proj(c, w.at);
  if (!feet) return;
  const k = ppm(c, w.at) * SU * s;
  if (k <= 0 || feet[0] < -400 * k || feet[0] > c.W + 400 * k || feet[1] < -100 || feet[1] > c.H + 1100 * k) return;
  // camera roll: rotate the card with the projected vertical
  const up = proj(c, [w.at[0], w.at[1] + 1, w.at[2]]), ang = up ? Math.atan2(up[0] - feet[0], feet[1] - up[1]) : 0;
  const g = c.g;
  g.save(); g.translate(feet[0], feet[1]); g.rotate(ang);
  // contact shadow (blue-violet multiply pool under the feet)
  g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = "rgba(70,62,120,0.45)";
  g.beginPath(); g.ellipse(0, 0, 150 * k, 34 * k, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.scale(w.side?.mirror ? -k : k, k); g.translate(-300, -975);
  const pen = new Pen(g);
  if (w.jar) { // terracotta amphora standing by the feet
    pen.poly([[390, 975], [372, 900], [380, 850], [410, 830], [440, 850], [448, 900], [430, 975]], "#c8693c", 7);
    pen.poly([[400, 832], [400, 812], [420, 812], [420, 832]], "#b55a30", 6);
  }
  if (w.side) bodySide(pen, w.o, { mode: "march", phase: w.side.phase, expr: w.side.expr, stomp: 0.6, stride: 0.6, blink: lidAt(c.f, w.i), seed: (w.i % 7) + 1 });
  else bodyFront(pen, w.o, { mode: "stand", seed: (w.i % 7) + 1, blink: lidAt(c.f, w.i), light: c.light, ...w.fo });
  g.restore();
};
/** effect drawing (design canvas `size` px) centred at world point p, `m` metres wide */
const fx = (c: Ctx, p: V3, m: number, size: number, draw: (pen: Pen) => void, rot = 0) => {
  const a = proj(c, p); if (!a) return;
  const k = (ppm(c, p) * m) / size; if (k <= 0) return;
  const g = c.g; g.save(); g.translate(a[0], a[1]); g.rotate(rot); g.scale(k, k); g.translate(-size / 2, -size / 2); draw(new Pen(g)); g.restore();
};
/** water jet: projected parabola from a to b peaking h above a, inked, with a lighter core */
const jet = (c: Ctx, a: V3, b: V3, h: number, wM: number, phase: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, p: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 4 * h * u * (1 - u), a[2] + (b[2] - a[2]) * u];
    const q = proj(c, p); if (!q) return; pts.push([q[0], q[1]]);
  }
  const w = ppm(c, a) * wM, g = c.g;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  path(); g.strokeStyle = "#1d2a44"; g.lineWidth = w + Math.max(2, w * 0.35); g.stroke();
  path(); g.strokeStyle = "#7fd0f0"; g.lineWidth = w; g.stroke();
  path(); g.strokeStyle = "#dff6ff"; g.lineWidth = w * 0.35; g.setLineDash([w * 1.2, w * 1.6]); g.lineDashOffset = -phase * w * 6; g.stroke();
  g.restore();
};

// ---------------- staging per shot ----------------
const PZ = PLAZA, SV = SURVEY, SP = SPRING;
const gy = (x: number, z: number) => groundY(x, z);
const crowd = (c: Ctx, cheer: boolean) => {
  const spots: [number, number][] = [[-4.2, -4.6], [-2.0, -5.4], [0.6, -5.2], [3.0, -4.8], [4.9, -3.4], [-5.4, -2.9], [-0.8, -7.0], [1.9, -7.4]];
  spots.forEach(([dx, dz], i) => {
    const kid = i === 6, at: V3 = [PZ[0] + dx, 47, PZ[2] + dz];
    const ex: Expr = cheer ? (["laugh", "grin", "laugh", "relief_open", "grin", "laugh", "laugh", "grin"] as Expr[])[i] : (["nervous", "dazed", "stern", "nervous", "pained", "neutral", "nervous", "dazed"] as Expr[])[i];
    const wave = cheer && i % 2 === 0 ? Math.sin(c.f * 0.45 + i) : undefined;
    const hop = cheer && kid ? Math.max(0, Math.sin(c.f * 0.4)) * 0.25 : 0;
    person(c, { o: kid ? KIDR : citizen(i), at: [at[0], at[1] + hop, at[2]], i: i + 20, jar: !cheer && i % 2 === 1, scale: kid ? 0.72 : 1,
      fo: { expr: ex, wave, look: !cheer && (i === 0 || i === 3) ? (i ? -1 : 1) : 0, facing: dx > 2 ? -1 : dx < -2 ? 1 : 0 } });
  });
};

export const drawOverlay = (g: CanvasRenderingContext2D, W: number, H: number, id: number, f: number) => {
  const cc = camAt(id, f), s = SHOTS[id - 1];
  cam.aspect = W / H; cam.fov = cc.fov; cam.position.set(...cc.pos); cam.up.set(0, 1, 0); cam.lookAt(...cc.look); cam.rotateZ(cc.roll);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  g.clearRect(0, 0, W, H);
  const c: Ctx = { g, W, H, f, id, light: (-120 * Math.PI) / 180 };
  const t = f / FPS;
  switch (id) {
    case 2: crowd(c, false); break;
    case 3: case 10: {
      // the spring pours from the rock into the pool
      for (let k = 0; k < 3; k++) jet(c, [SP[0] - 4.3, 49.6 + 0.15 * k, SP[2] - 0.6 + 0.6 * k], [SP[0] - 2.2, 48.1, SP[2] - 0.6 + 0.6 * k], 0.25, 0.32, t * 2 + k);
      if (id === 10 && f < 1414) {
        const open = f >= 1385;
        person(c, { o: worker(1), at: [-326.4, gy(-326.4, 2.2), 2.2], i: 61, fo: { expr: open ? "grin" : "stern", prop: ["hammer", open ? 0.2 : 1 - smooth((f - 1370) / 12)], facing: 1 } });
        person(c, { o: ENGINEER, at: [-321.0, gy(-321.0, 3.0), 3.0], i: 62, fo: { expr: f >= 1388 ? "laugh" : "neutral", wave: f >= 1388 ? Math.sin(f * 0.5) : undefined, facing: -1 } });
        if (open && f < 1405) fx(c, [-326.2, 48.2, 0], 1.5, 800, (p) => fxSplash(p, (f - 1385) / 20));
      }
      if (id === 10 && f >= 1414 && f < 1456) { const x = waterFront(10, f); fx(c, [x - 0.3, 48.15, 0], 1.6, 800, (p) => fxSplash(p, ((f * 0.13) % 1))); }
      if (id === 10 && f >= 1456) {
        crowd(c, f >= 1486);
        const on = fountainOn(10, f);
        if (on > 0) for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.3, r = 2.5 * on;
          jet(c, [PZ[0] + 0.5 * Math.cos(a), 49.25, PZ[2] + 0.5 * Math.sin(a)], [PZ[0] + r * Math.cos(a), 47.75, PZ[2] + r * Math.sin(a)], 0.9 * on, 0.13, t * 3 + k);
          if (f > 1490) fx(c, [PZ[0] + r * Math.cos(a), 47.95, PZ[2] + r * Math.sin(a)], 0.8, 800, (p) => fxSplash(p, ((t * 1.4 + k * 0.17) % 1)));
        }
        if (f >= 1500) for (let k = 0; k < 4; k++) { const u = ((t * 0.35 + k * 0.25) % 1); fx(c, [226 + k * 1.5, 61.5 + 6 * u, 14], 6 + 6 * u, 300, (p) => fxPuff(p, u * 0.85)); } // bath steam
      }
      break;
    }
    case 4: {
      person(c, { o: ENGINEER, at: [SV[0] + 0.62, SV[1], SV[2] - 0.32], i: 41, fo: { expr: f < 440 ? "stern" : "neutral", look: -1, facing: -1 } });
      person(c, { o: worker(2), at: [SV[0] + 5.0, SV[1], SV[2] + 0.95], i: 42, fo: { expr: "neutral", look: 1, facing: 1 } });
      if (f < 506) person(c, { o: worker(4), at: [SV[0] + 9.9, SV[1], SV[2] + 1.0], i: 43, fo: { expr: f > 519 ? "smile" : "stern", look: -1, facing: -1 } });
      break;
    }
    case 6: SHAFTS.forEach((x, i) => {
      const y = gy(x, 0), crank = 0.5 + 0.5 * Math.sin(t * 4 + i);
      person(c, { o: worker(i), at: [x + 0.85, y, -1.55], i: 30 + i, fo: { expr: i % 2 ? "stern" : "grin", prop: ["hammer", crank], facing: -1 } });
      person(c, { o: worker(i + 3), at: [x - 0.9, gy(x - 0.9, -1.6), -1.6], i: 34 + i, fo: { expr: "neutral", prop: ["hammer", 1 - crank], facing: 1 } });
    }); break;
    case 7: [[-26, 9, 0.2], [-12, 13, 0.5], [3, 7, 0.8], [18, 11, 0.1]].forEach(([x, z, ph], i) =>
      person(c, { o: worker(i), at: [x, gy(x, z), z], i: 50 + i, side: { phase: (t * 0.9 + ph) % 1, expr: "neutral", mirror: i % 2 === 1 } })); break;
    case 8: {
      const B = SITE.block, sx = (SITE.x0 + SITE.x1) / 2;
      if (f < 1074) {
        const k = strikeK(f, STRIKES);
        person(c, { o: worker(3), at: [B[0] - 1.25, 0, B[2] + 0.2], i: 70, fo: { expr: k > 0.9 ? "grin" : "stern", prop: ["hammer", k], facing: 1 } });
        for (const s of STRIKES) if (f >= s && f < s + 6) fx(c, [B[0] - 0.1, 0.95, B[2] + 0.1], 0.9, 500, (p) => fxBurst(p, (f - s) / 6, "#fff3b0", 8, 30, 210));
        for (const s of STRIKES) if (f >= s && f < s + 14) fx(c, [B[0] - 0.2, 1.0, B[2] + 0.2], 0.9, 300, (p) => fxPuff(p, (f - s) / 14));
      } else if (f < 1160) {
        const W = SITE.wheel, ph = ((f - 1074) * 0.045 * 2.5 / 1.6) % 1;
        person(c, { o: worker(0), at: [W[0] + 0.15, 0.48, W[2] + 0.35], i: 71, side: { phase: ph, expr: "stern", mirror: true } });
        person(c, { o: worker(5), at: [W[0] - 0.2, 0.48, W[2] - 0.3], i: 72, side: { phase: (ph + 0.5) % 1, expr: "pained", mirror: true } });
        person(c, { o: ENGINEER, at: [46.5, 0, 9.5], i: 73, fo: { expr: "stern", wave: Math.sin(f * 0.2) * 0.6 - 0.3, facing: -1 } });
        person(c, { o: worker(2), at: [sx + 1.6, 0, 6.3], i: 74, fo: { expr: "nervous", look: 1, facing: -1 } });
      } else {
        const done = f >= 1222, k = keystoneU(f);
        person(c, { o: worker(1), at: [sx - 2.8, 8.95, 3.9], i: 75, fo: { expr: done ? "laugh" : "nervous", wave: done ? Math.sin(f * 0.5) : undefined, look: done ? 0 : 1, facing: 1 } });
        person(c, { o: worker(4), at: [sx + 2.8, 8.95, 3.9], i: 76, fo: { expr: done ? "grin" : "stern", wave: done ? Math.sin(f * 0.5 + 1) : undefined, look: done ? 0 : -1, facing: -1 } });
        person(c, { o: ENGINEER, at: [39.3, 0, 7.0], i: 77, fo: { expr: done ? "smile" : "stern", facing: 1 } });
        if (f >= 1222 && f < 1236) for (const dx of [-1.2, 1.2]) fx(c, [sx + dx, 9.2 + 6.1 + 1.6, 3.3], 1.6, 300, (p) => fxPuff(p, (f - 1222) / 14));
        void k;
      }
      break;
    }
    case 9: {
      const k = 0.5 + 0.5 * Math.sin(t * 5.2);
      person(c, { o: worker(2), at: [-70.3, 47.25, 0.0], i: 80, fo: { mode: "sit", expr: f > 1340 ? "smile" : "stern", prop: ["hammer", 0.55 + 0.35 * k], facing: 1 } });
      break;
    }
  }
  // golden light: warm the cast a little (the skill's golden character tint)
  if (s.light === "golden") { g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,160,80,0.16)"; g.fillRect(0, 0, W, H); g.restore(); }
  void INK;
};
