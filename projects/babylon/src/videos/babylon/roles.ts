// Who stands where in every shot of the Babylon short, using the template's billboard cast (cast.ts person/blob,
// toon.ts drawings, blinks, walk phases). Every expression change lands LEAD (2 f) before its word (voice/words.json).
import * as THREE from "three";
import { Pen, Outfit, Expr, FrontOpts, SideOpts, CYRUS, GATEKEEPER, SCOUT, persian, babylonian, babSoldier, fxNote, fxPuff, fxRing, fxBurst, INK } from "./toon";
import { CamInfo, Stage, person, blob, lidAt, viewOf, hh, q, LEAD, Who, findSun, SUN, setLight } from "./cast";
import {
  FPS, G, GATE_Z, OUT_TOP, IN_TOP, SHOTS, CYRUS_CAMP, PLAZA, SIPPAR, OPIS, KEEPER_WALL, SCOUT_BASE, RIVER_BANK, DIG, WADE, COL_Z, colFront,
  cyrusWalkX, riverLevel, clamp01, smooth, V3,
} from "./story";

const P = (o: Outfit, i: number, key: string): Who => ({ i, o, okey: key });
const PERS = [0, 1, 2, 3].map((v) => persian(v));
const BABS = [0, 1, 2, 3, 4, 5].map((v) => babylonian(v));
const BSOL = [0, 1, 2, 3].map((v) => babSoldier(v));
const W = (s: number) => s - LEAD; // reaction time for a word at s seconds

/** standing character, front view (or profile facing dir when side = +-1) */
const stand = (out: Stage, cam: CamInfo, t: number, who: Who, x: number, y: number, z: number, expr: Expr, o: Partial<FrontOpts> = {}, shadow = true, side = 0, scale = 1) => {
  const blink = lidAt(t, who.i);
  if (side) out.places.push(person(cam, who, x, y, z, { side: true, mirror: side < 0 }, {}, { expr, mode: "stand", blink }, scale));
  else out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink, ...o }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};
/** walking character along (dx, dz) at speed v (m/s), started at (x0, z0) at time t0; 2 steps/s march or stroll */
const walk = (out: Stage, cam: CamInfo, t: number, who: Who, x0: number, y: number, z0: number, dx: number, dz: number, v: number, t0: number, expr: Expr,
  mode: "march" | "stroll" = "march", shadow = true) => {
  const d = v * (t - t0), x = x0 + dx * d, z = z0 + dz * d, ph = ((t * (v / 0.8) / 2 + hh(who.i, 4)) % 1 + 1) % 1;
  const view = viewOf(cam, x, z, dx, dz), blink = lidAt(t, who.i);
  out.places.push(person(cam, who, x, y, z, view, { phase: ph, expr, mode, blink, lift: 40 }, { phase: ph, expr, mode: "march", blink, stride: view.fs * (v / 1.6), stomp: 0.6 }));
  if (shadow) blob(out, x, y, z);
  return [x, z] as const;
};

// ---------------- effect drawings ----------------
/** cartoon horse in profile (facing right) on a 600 x 420 canvas; phase = walk cycle */
export const fxHorse = (p: Pen, phase: number, col = "#a8693a") => {
  const k = Math.sin(phase * Math.PI * 2);
  for (const [lx, s] of [[150, 1], [190, -1], [400, -1], [440, 1]] as const) p.stroke([[lx, 230], [lx + 18 * k * s, 330], [lx + 22 * k * s, 400]], 16, INK);
  p.ell(300, 210, 175, 70, col, 9);
  p.poly([[420, 180], [500, 70], [560, 90], [565, 130], [520, 140], [470, 230]], col, 9);
  p.poly([[470, 72], [430, 120], [440, 160], [480, 110]], "#3a2418", 6);
  p.dot(530, 98, 7);
  p.stroke([[128, 190], [80, 260], [90, 300]], 14, "#3a2418");
};
/** Herodotus's four-horse chariot (side view) on 1100 x 520 */
const fxChariot = (p: Pen, phase: number) => {
  for (let i = 0; i < 4; i++) {
    const g = p.g; g.save(); g.translate(380 + i * 34, 10 + i * 6); g.scale(1.1, 1.1); fxHorse(p, (phase + i * 0.13) % 1, ["#a8693a", "#f2e4c4", "#6b4a2e", "#c98a4a"][i]); g.restore();
  }
  p.poly([[60, 260], [330, 260], [320, 380], [80, 380]], "#c2453a", 9);
  p.band([[300, 330], [470, 300]], "#7a4b2a", 10, 4);
  p.ell(190, 410, 85, 85, null, 12); p.ell(190, 410, 12, 12, INK, 0);
  for (let a = 0; a < 6; a++) { const r = (a / 6) * Math.PI + phase * 3; p.stroke([[190 - 80 * Math.cos(r), 410 - 80 * Math.sin(r)], [190 + 80 * Math.cos(r), 410 + 80 * Math.sin(r)]], 6); }
  p.ell(200, 200, 52, 58, "#e9bf95", 8); p.dot(222, 196, 7); p.ell(200, 252, 34, 22, "#2c1d18", 6);
  p.poly([[160, 150], [240, 150], [228, 112], [172, 112]], "#e0a032", 7);
};
/** "?" over a confused head, 300 x 400 */
const fxQuestion = (p: Pen, u: number) => {
  const s = 0.6 + 0.4 * Math.min(1, u * 5);
  const g = p.g; g.save(); g.translate(150, 230); g.scale(s, s); g.translate(-150, -230);
  p.arc(150, 130, 70, 70, 190, 450, 34, INK); p.arc(150, 130, 70, 70, 190, 450, 22, "#f7d64a");
  p.stroke([[150, 200], [150, 260]], 34, INK); p.stroke([[150, 200], [150, 258]], 22, "#f7d64a");
  p.ell(150, 330, 22, 22, "#f7d64a", 8);
  g.restore();
};
/** Persian banner (purple + gold) on a pole, 300 x 600 */
const fxBanner = (p: Pen) => {
  p.band([[40, 590], [40, 20]], "#7a5434", 14, 4);
  p.poly([[48, 40], [280, 70], [250, 160], [280, 250], [48, 220]], "#6a3d9a", 9);
  p.ell(150, 140, 46, 46, "#e8b93a", 7);
};
const fxCup = (p: Pen) => { p.poly([[30, 20], [130, 20], [110, 120], [50, 120]], "#c99a4a", 8); };

// ---------------- staging by shot ----------------
const army = (out: Stage, cam: CamInfo, t: number, x0: number, z0: number, rows: number, cols: number, dx: number, v: number, t0: number, expr: (i: number) => Expr, gap = 1.5) => {
  for (let i = 0; i < rows * cols; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), x0 - dx * r * gap + (hh(i) - 0.5) * 0.3, G, z0 + (c - (cols - 1) / 2) * gap + (hh(i, 2) - 0.5) * 0.3, dx, 0, v, t0, expr(i));
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS);
  setLight(s.light);
  findSun(cam, SUN);
  const K = KEEPER_WALL;
  switch (id) {
    case 1: {
      army(out, cam, t, -150, GATE_Z - 2, 8, 10, 1, 1.4, 0, () => "stern", 2.2);
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), K[0], K[1], K[2], "smile_closed");
      break;
    }
    case 2: {
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), K[0], K[1], K[2], t < W(9.34) ? "smile_closed" : "grin", { headTilt: t < W(9.34) ? 0 : 4 });
      stand(out, cam, t, P(BSOL[1], 901, "b1"), K[0] + 0.2, K[1], K[2] - 14, "stern");
      stand(out, cam, t, P(BSOL[2], 902, "b2"), K[0] + 0.3, K[1], K[2] + 22, "neutral");
      break;
    }
    case 3: case 4: {
      for (let i = 0; i < 6; i++) stand(out, cam, t, P(BSOL[i % 4], 910 + i, `b${i % 4}`), i < 3 ? 2 : 19, i < 3 ? OUT_TOP : IN_TOP, GATE_Z - 30 + i * 9, "neutral");
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), K[0], K[1], K[2], "smile_closed");
      break;
    }
    case 5: {
      const sc = SCOUT_BASE;
      // looking up at the wall; jaw drops on "chariot"
      const e: Expr = t < W(16.88) ? "neutral" : t < W(19.58) ? "nervous" : "shock";
      if (f < 578) stand(out, cam, t, P(SCOUT, 800, "sc"), sc[0], sc[1], sc[2], e, {}, true, 1);
      else stand(out, cam, t, P(SCOUT, 800, "sc"), sc[0], sc[1], sc[2], e, { look: 0.6, headTilt: -6 });
      // the chariot drives along the wall top (Herodotus's claim), passing above the scout
      const u = clamp01((t - 17.4) / 3.6), z = GATE_Z - 26 + 22 * u;
      if (t > 17.2) out.fx.push({ key: `chariot${q((t * 2) % 1, 8)}`, cw: 1100, ch: 520, draw: (p) => fxChariot(p, q((t * 2) % 1, 8)), x: 1.2, y: OUT_TOP + 1.25, z, w: 5.2, h: 2.45 });
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), K[0], K[1], K[2], "smile_closed");
      break;
    }
    case 6: {
      const C = CYRUS_CAMP;
      stand(out, cam, t, P(CYRUS, 700, "cy"), C[0], C[1], C[2], t < W(21.08) ? "smile" : t < W(23.12) ? "smile_closed" : "smile", { headTilt: t > W(23.5) ? -3 : 0 });
      stand(out, cam, t, P(PERS[1], 701, "p1"), C[0] - 2.6, G, C[2] + 2.2, "stern");
      stand(out, cam, t, P(PERS[2], 702, "p2"), C[0] + 2.8, G, C[2] + 2.6, "stern");
      out.fx.push({ key: "horse0", cw: 600, ch: 420, draw: (p) => fxHorse(p, 0.1), x: C[0] - 7.5, y: G + 1.0, z: C[2] + 1.5, w: 2.7, h: 1.9 });
      blob(out, C[0] - 7.5, G, C[2] + 1.5, 2.2, 0.7);
      break;
    }
    case 7: {
      const F = colFront(t);
      for (let i = 0; i < 36; i++) {
        const r = Math.floor(i / 4), c = i % 4;
        walk(out, cam, t, P(PERS[(i + r) % 4], i, `p${(i + r) % 4}`), F - r * 1.4, G, COL_Z + (c - 1.5) * 1.3, 1, 0, 1.6, t, i % 5 === 2 ? "grin" : "stern");
      }
      // supply horses with the column
      for (let k = 0; k < 2; k++) {
        const x = F - 15 - k * 4, ph = (t * 1.4 + k * 0.3) % 1;
        out.fx.push({ key: `horse${q(ph, 8)}${k}`, cw: 600, ch: 420, draw: (p) => fxHorse(p, q(ph, 8), k ? "#6b4a2e" : "#a8693a"), x, y: G + 1.0, z: COL_Z + 3.6, w: 2.7, h: 1.9 });
        blob(out, x, G, COL_Z + 3.6, 2.2, 0.7);
      }
      break;
    }
    case 8: {
      // Opis: Persians press forward (+x+z); after "defeated" the Babylonian line breaks and runs
      const O = OPIS, br = W(27.1);
      for (let i = 0; i < 48; i++) {
        const r = Math.floor(i / 8), c = i % 8;
        walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), O[0] - 6 - r * 1.8, G, O[2] - 6 + c * 1.8 + r * 0.3, 0.8, 0.6, t < br ? 0.6 : 1.4, 24.5, t < br ? "stern" : "grin");
      }
      for (let i = 0; i < 30; i++) {
        const r = Math.floor(i / 6), c = i % 6, x0 = O[0] + 8 + r * 1.8, z0 = O[2] + 4 + c * 1.8;
        if (t < br) stand(out, cam, t, P(BSOL[i % 4], 300 + i, `b${i % 4}`), x0, G, z0, i % 3 ? "nervous" : "stern");
        else {
          const [x, z] = walk(out, cam, t, P(BSOL[i % 4], 300 + i, `b${i % 4}`), x0, G, z0, 0.8, 0.6, 3.0, br, "shock");
          const u = ((t - br) * 2 + hh(i, 3)) % 1;
          if (i % 3 === 0) out.fx.push({ key: `puff${q(u, 12)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 12)), x: x - 0.8, y: G + 0.4, z: z - 0.6, w: 1.4, h: 1.4, soft: true });
        }
      }
      break;
    }
    case 9: {
      const S = SIPPAR;
      for (let i = 0; i < 20; i++) walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), S[0] - 44 - Math.floor(i / 2) * 1.6, G, S[2] + (i % 2 ? 0.8 : -0.8), 1, 0, 1.6, 29.2, "grin");
      const u = smooth((t - W(29.96)) / 0.8);
      out.fx.push({ key: "banner", cw: 300, ch: 600, draw: fxBanner, x: S[0] - 27, y: G + 12 + 1.6 * u, z: S[2] - 27, w: 1.6 * u + 0.01, h: 3.2 * u + 0.01 });
      out.fx.push({ key: "banner", cw: 300, ch: 600, draw: fxBanner, x: S[0] - 27, y: G + 12 + 1.6 * u, z: S[2] + 29, w: 1.6 * u + 0.01, h: 3.2 * u + 0.01 });
      break;
    }
    case 10: {
      // Persian soldiers walk in through the open gate; no fighting shown
      for (let i = 0; i < 24; i++) walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), -14 - Math.floor(i / 2) * 1.6, G, GATE_Z + (i % 2 ? 1.1 : -1.1), 1, 0, 1.5, 30.6, i % 4 ? "neutral" : "smile");
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), K[0], K[1], K[2], t < W(31.28) ? "neutral" : "nervous", { look: -1 });
      break;
    }
    case 11: {
      const x = cyrusWalkX(t);
      walk(out, cam, t, P(CYRUS, 700, "cy"), x, G, GATE_Z, 1, 0, 0, t, "smile", "stroll");
      for (let i = 0; i < 12; i++) stand(out, cam, t, P(PERS[i % 4], 720 + i, `p${i % 4}`), -30 + i * 1.7, G, GATE_Z + 2.9 + (i % 2) * 0.5, i % 3 ? "grin" : "smile_closed");
      break;
    }
    case 12: {
      const B = RIVER_BANK;
      stand(out, cam, t, P(CYRUS, 700, "cy"), B[0], G, B[2], t < W(38.02) ? "smile" : "smile_closed", { wave: t > W(37.6) ? 0.6 : undefined });
      stand(out, cam, t, P(SCOUT, 800, "sc"), B[0] + 1.7, G, B[2] - 0.5, t < W(38.72) ? "neutral" : t < W(39.46) ? "nervous" : "grin", { look: -1 });
      stand(out, cam, t, P(PERS[3], 801, "p3"), B[0] - 1.9, G, B[2] + 0.7, "stern");
      break;
    }
    case 13: {
      // the last plug of earth between the river and the new channel, hacked away with mattocks
      for (let i = 0; i < 6; i++) {
        const x = DIG[0] - 1.3 + (i % 3) * 1.3 + (i > 2 ? 0.65 : 0), z = i > 2 ? 18.6 : 16.9;
        const k = 0.5 + 0.5 * Math.sin((t * 2.4 + hh(i)) * Math.PI * 2);
        stand(out, cam, t, P(PERS[i % 4], 500 + i, `p${i % 4}`), x, G, z, f < 1262 ? "stern" : "grin", { prop: ["hammer", k] });
        if (f < 1262 && k > 0.9) out.fx.push({ key: `puff${q(k, 8)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, 0.3), x: x + 0.6, y: G + 0.3, z: z - 0.3, w: 1.2, h: 1.2, soft: true });
      }
      if (f >= 1262 && f < 1276) {
        const u = (f - 1262) / 14;
        out.fx.push({ key: `burst${q(u, 14)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 14), "#cfe8ff"), x: DIG[0], y: 1.8, z: 16.5, w: 8, h: 8 });
      }
      break;
    }
    case 14: {
      stand(out, cam, t, P(SCOUT, 800, "sc"), -22, G, -16.5, t < W(44.68) ? "neutral" : t < W(45.26) ? "nervous" : "shock", {}, true, 1);
      break;
    }
    case 15: case 17: {
      const lv = riverLevel(id, f);
      const n = id === 15 ? 16 : 6;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / 4), c = i % 4, x0 = WADE[0] - 4 - r * 2.2, z0 = (c - 1.5) * 2.4 + (hh(i) - 0.5);
        const [x, z] = walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), x0, 0, z0, 1, 0, id === 15 ? 0.8 : 0.5, 46.2, i % 3 ? "nervous" : "stern", "march", false);
        const u = ((t * 0.8 + hh(i, 7)) % 1);
        out.fx.push({ key: `ring${q(u, 20)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q(u, 20)), x, y: lv + 0.02, z, w: 1.8, h: 1.8, flat: true });
      }
      const sx = WADE[0] + 0.2, sz = -1.2;
      const e: Expr = id === 15 ? (t < W(48.88) ? "nervous" : "shock") : "grin";
      stand(out, cam, t, P(SCOUT, 800, "sc"), sx, 0, sz, e, { look: id === 15 ? 1 : 0, headTilt: id === 17 ? 5 * Math.sin(t * 7) : 0 }, false);
      out.fx.push({ key: `ring${q((t * 0.8) % 1, 20)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q((t * 0.8) % 1, 20)), x: sx, y: lv + 0.02, z: sz, w: 1.6, h: 1.6, flat: true });
      break;
    }
    case 16: {
      const C = PLAZA;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, rr = 3.2 + (i % 3) * 1.6, x = C[0] + Math.cos(a) * rr * 1.2, z = C[2] + Math.sin(a) * rr;
        const ph = (t * 1.8 + hh(i)) % 1;
        out.places.push(person(cam, P(BABS[i % 6], 600 + i, `bb${i % 6}`), x, G + 0.06 * Math.abs(Math.sin(ph * Math.PI * 2)), z, { side: false, mirror: false },
          { mode: "stroll", phase: ph, expr: i % 3 ? "laugh" : "grin", blink: lidAt(t, 600 + i), wave: i % 2 ? 0.5 + 0.5 * Math.sin(t * 6 + i) : undefined }, {}));
        blob(out, x, G, z);
      }
      // the gatekeeper, off duty, celebrating
      stand(out, cam, t, P(GATEKEEPER, 900, "gk"), C[0] + 1.2, G, C[2] - 1.6, "laugh", { wave: 0.5 + 0.5 * Math.sin(t * 5) });
      for (let n = 0; n < 6; n++) {
        const age = ((t * 0.6 + n / 6) % 1);
        out.fx.push({ key: `note${n % 2}`, cw: 220, ch: 260, draw: (p) => fxNote(p, n % 2), x: C[0] - 3 + n * 1.3, y: G + 2.2 + 1.6 * age, z: C[2] + 1 - n * 0.4, w: 0.35, h: 0.42, rot: 0.3 * Math.sin(age * 6 + n) });
      }
      // ... while the Persians slip past behind them ("didn't even notice")
      if (t > W(52.34)) for (let i = 0; i < 8; i++)
        walk(out, cam, t, P(PERS[i % 4], i, `p${i % 4}`), C[0] + 9 + (i % 2) * 0.9, G, C[2] - 7 - i * 1.5, 0, 1, 1.4, 52.3, "nervous");
      break;
    }
    case 18: {
      const B = RIVER_BANK, sx = B[0] + 0.9, sz = B[2] + 0.3;
      stand(out, cam, t, P(SCOUT, 800, "sc"), sx, G, sz, t < W(57.8) ? "shock" : "nervous", { look: t > W(58.5) ? -1 : 0, headTilt: -6 });
      const u = clamp01((t - 57.0) / 1.2);
      out.fx.push({ key: `q${q(u, 10)}`, cw: 300, ch: 400, draw: (p) => fxQuestion(p, q(u, 10)), x: sx + 0.45, y: G + 2.05, z: sz, w: 0.5, h: 0.66 });
      break;
    }
    case 19: break;
    case 20: {
      const x = -4.2 + 1.1 * (t - 61.7);
      walk(out, cam, t, P(CYRUS, 700, "cy"), x, G, GATE_Z, 1, 0, 0, t, "smile", "stroll");
      
      break;
    }
    case 21: {
      const C = PLAZA;
      for (let i = 0; i < 10; i++) stand(out, cam, t, P(BABS[i % 6], 600 + i, `bb${i % 6}`), C[0] + Math.cos(i) * 5, G, C[2] + Math.sin(i) * 5, "grin");
      break;
    }
  }
  return out;
};
