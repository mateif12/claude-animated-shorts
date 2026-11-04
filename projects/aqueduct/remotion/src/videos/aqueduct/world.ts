// The Roman valley as one three.js scene, posed per frame (pure function of shot id + frame):
// terrain with the river valley, a three-tier arcade (Pont du Gard proportions, built bay by bay from extruded
// arched walls), the channel with its pink opus signinum lining and flowing water, the spring and sluice gate, the
// tunnel hill with shafts and windlasses, the surveyors' groma and chorobates, the construction site (wooden
// centering, treadwheel crane) and the city (insulae, temple, baths, castellum, fountain square).
// Look: the skill's two-tone shading (shade.ts), painted textures (paint.ts), sky/fog/light presets (lights.ts).
// Characters are NOT in this scene: they are drawn by overlay.ts on a 2D canvas with the same camera.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex, rng, stoneHD, roofHD, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import {
  FPS, SHOTS, CHY, BAY, valleyG, tunnelBump, TUN, SHAFTS, SPRING, SURVEY, PLAZA, CASTELLUM, SITE, camAt, waterFront,
  liftU, keystoneU, smooth, V3, ShotDef,
} from "./story";

// ---------------- terrain ----------------
const hash = (x: number, z: number) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
const vnoise = (x: number, z: number) => {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), w = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
};
/** ground height anywhere: valley profile along x (river at x = 0), hills away from the aqueduct line, tunnel hill,
 *  the ridge behind the spring, a river bed */
export const groundY = (x: number, z: number) => {
  let y = valleyG(x);
  const away = smooth((Math.abs(z) - 22) / 70);
  y += away * (7 * vnoise(x / 55, z / 55) + 16 * smooth((Math.abs(z) - 120) / 220) * vnoise(x / 120 + 3, z / 120));
  y += tunnelBump(x, z);
  y += 36 * smooth((-x - 345) / 80) * (0.7 + 0.3 * vnoise(z / 40, 1)); // ridge behind the spring
  y -= 1.6 * smooth((9 - Math.abs(x)) / 3); // river bed
  // level building plots: survey meadow, spring, city plateau
  const k = Math.max(smooth((24 - Math.hypot(x - SURVEY[0], z - SURVEY[2])) / 10), smooth((16 - Math.hypot(x - SPRING[0], z - SPRING[2])) / 6),
    smooth((x - 140) / 10) * smooth((135 - Math.abs(z)) / 12));
  return y + (47 - y) * k;
};

// ---------------- textures ----------------
const LIME = ["#e6cf9f", "#dcc18e", "#ead7ad", "#d2b582"]; // golden Gard limestone
const stoneT = () => stoneHD("aqStone", LIME, "#a8906a");
const romanFacade = (key: string, wall: string, shop: boolean) => ctex("rf_" + key, 512, 512, (g, r) => {
  // one 8 m x 8 m facade tile: lime plaster, a darker plinth, small dark windows with timber lintels, shop openings
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "120,90,60" : "255,250,235"},${0.05 + 0.05 * r()})`; g.beginPath(); g.arc(r() * 512, r() * 512, 20 + r() * 60, 0, 7); g.fill(); }
  g.fillStyle = "rgba(90,60,40,0.22)"; g.fillRect(0, 470, 512, 42);
  const win = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = "#2b2230"; g.fillRect(x, y, w, h);
    g.fillStyle = "#7a5a3a"; g.fillRect(x - 4, y - 8, w + 8, 8);
    g.fillStyle = "rgba(255,240,210,0.6)"; g.fillRect(x - 3, y + h, w + 6, 5);
  };
  for (const y of [70, 210]) for (const x of [60, 220, 380]) win(x, y, 60, 74);
  if (shop) for (const x of [30, 280]) {
    g.fillStyle = "#3a2b2a"; g.fillRect(x, 340, 200, 172);
    g.fillStyle = "#8a5a36"; g.fillRect(x - 6, 328, 212, 14);
    g.fillStyle = "#b8763e"; for (let k = 0; k < 6; k++) g.fillRect(x + 14 + k * 31, 360, 18, 152);
  } else for (const x of [60, 220, 380]) win(x, 350, 60, 74);
});
const paveT = () => stoneHD("paveHD", ["#d9cfbd", "#cfc3ae", "#e2d9c8", "#c7b9a2"], "#9d907c");
const dirtT = () => ctex("dirt", 512, 512, (g, r) => {
  g.fillStyle = "#b08a5c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,65,40" : "230,200,150"},${0.15 + 0.2 * r()})`; g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 4, 0, 7); g.fill(); }
});
const woodT = () => ctex("roWood", 256, 256, (g, r) => {
  g.fillStyle = "#a9733f"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "90,55,25" : "220,170,110"},0.35)`; g.lineWidth = 1 + r() * 3; const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 6 * (r() - 0.5), 170, y + 6 * (r() - 0.5), 256, y); g.stroke(); }
});
const scaleUV = (geo: THREE.BufferGeometry, k: number) => {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  return geo;
};

/** one arcade bay: wall from xa to xb, yb..yt, with an arched opening between half-piers p (springing ys) */
const bayGeo = (xa: number, xb: number, yb: number, ys: number, yt: number, p: number, d: number, open = true) => {
  const s = new THREE.Shape();
  s.moveTo(xa, yb); s.lineTo(xb, yb); s.lineTo(xb, yt); s.lineTo(xa, yt); s.lineTo(xa, yb);
  if (open) {
    const r = (xb - xa - 2 * p) / 2, cx = (xa + xb) / 2, h = new THREE.Path();
    h.moveTo(xa + p, yb); h.lineTo(xa + p, ys); h.absarc(cx, ys, r, Math.PI, 0, true); h.lineTo(xb - p, yb); h.lineTo(xa + p, yb);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 18 });
  g.translate(0, 0, -d / 2);
  return scaleUV(g, 1 / 7);
};
const cyl = (r0: number, r1: number, h: number, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n);
const at = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1));
const beam = (a: THREE.Vector3, b: THREE.Vector3, th: number) => {
  const g = new THREE.BoxGeometry(th, a.distanceTo(b), th);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};

// ---------------- water shader (channel, river, pools) ----------------
const WATER_VS = `varying vec3 vWP; varying float vFog;
void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; vec4 mv = viewMatrix * wp; vFog = -mv.z; gl_Position = projectionMatrix * mv; }`;
const WATER_FS = `uniform vec3 cA, cB, cC, fogC; uniform float t, front, fogN, fogF, flow, scale; uniform vec2 dir; varying vec3 vWP; varying float vFog;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  if (vWP.x > front) discard;
  vec2 p = vWP.xz * scale; vec2 q = p - dir * t * flow;
  float a = n(q * vec2(0.35, 1.6)) * 0.6 + n(q * vec2(0.9, 3.2) + 7.0) * 0.4;
  vec3 c = mix(cA, cB, smoothstep(0.35, 0.75, a));
  float crest = smoothstep(0.80, 0.86, n(q * vec2(0.6, 2.4) + 3.0));
  c = mix(c, cC, crest * 0.85);
  float edge = smoothstep(front - 1.2, front, vWP.x); c = mix(c, cC, edge * 0.9); // foam at the advancing front
  float fk = clamp((vFog - fogN) / (fogF - fogN), 0.0, 1.0);
  gl_FragColor = vec4(mix(c, fogC, fk), 1.0);
}`;
type WaterU = { [k: string]: THREE.IUniform };
const waterMat = (flow: number, dir: [number, number], scale: number) => {
  const u: WaterU = {
    cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, cC: { value: new THREE.Color() }, fogC: { value: new THREE.Color() },
    t: { value: 0 }, front: { value: 1e9 }, fogN: { value: 80 }, fogF: { value: 900 }, flow: { value: flow }, scale: { value: scale }, dir: { value: new THREE.Vector2(...dir) },
  };
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: WATER_VS, fragmentShader: WATER_FS });
};

/** every lens position of the film, for keeping trees out of shot (centre ray only) */
const camPts = () => {
  const out: { o: THREE.Vector3; l: THREE.Vector3 }[] = [];
  for (const s of SHOTS) for (let f = s.a; f < s.b; f += 6) { const c = camAt(s.id, f); out.push({ o: V(...c.pos), l: V(...c.look) }); }
  return out;
};
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
};

export class World {
  root = new THREE.Group();
  private done = new THREE.Group(); private site = new THREE.Group();
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 80, 900);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private clouds: THREE.Mesh[] = []; private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private sunCache = new Map<number, THREE.Vector3>();
  private waters: { m: THREE.ShaderMaterial; kind: "channel" | "river" | "pool" | "fountain" }[] = [];
  private fountainWater!: THREE.Mesh;
  private gate!: THREE.Mesh; private wheel!: THREE.Group; private block!: THREE.Mesh; private rope!: THREE.Mesh; private keystone!: THREE.Mesh;
  private baskets: THREE.Mesh[] = []; private bRopes: THREE.Mesh[] = [];

  constructor() {
    const R = this.root;
    R.add(this.done, this.site);
    // ---- sky, sun, clouds (the skill's sky shader: 5 colour stops by elevation, tone-map inverted) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1300, 32, 16), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    const disc = ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 56, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const halo = ctex("sunHalo", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.3, "rgba(255,255,255,0.2)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(1.6, 1.25, 0.85), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.5);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 900 + (i % 3) * 80, w = 200 + (i % 4) * 50;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 170 + (i % 4) * 45, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    const M = {
      grass: lam("aqGrass", () => ({ map: grassHD(), vertexColors: true })),
      stone: lam("aqStoneM", () => ({ map: stoneT() })),
      lining: lam("signinum", () => ({ color: "#d79a82" })), // opus signinum: lime + crushed pottery, pink
      rock: lam("rock", () => ({ color: "#a59a8c" })),
      dirt: lam("dirtM", () => ({ map: dirtT() })),
      wood: lam("roWoodM", () => ({ map: woodT() })),
      rope: lam("rope", () => ({ color: "#c9a56b" })),
      dark: new THREE.MeshBasicMaterial({ color: "#140f16" }),
      cypress: lam("cypress", () => ({ color: "#3f7a3c" })),
      pine: lam("pine", () => ({ color: "#5c9a45" })),
      bark: lam("bark", () => ({ color: "#7a5236" })),
      roof: lam("roofTerra", () => ({ map: roofHD("#c4633a") })),
      pave: lam("paveM", () => ({ map: paveT() })),
      marble: lam("marble", () => ({ color: "#efe9dc" })),
      bronze: lam("bronze", () => ({ color: "#7d6a3e" })),
      groove: new THREE.MeshBasicMaterial({ color: "#7fc9e4" }),
      mount: lam("mount", () => ({ color: "#7d9a7a" })),
    };
    const roofT = M.roof.map; if (roofT) { roofT.repeat.set(0.25, 0.25); }

    // ---- terrain ----
    const N = 200, SZ = 1100;
    const tg = new THREE.PlaneGeometry(SZ, SZ, N, N); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position as THREE.BufferAttribute, cols: number[] = [];
    const cA = new THREE.Color("#b3a777"), cDry = new THREE.Color("#d2b07a"), cDeep = new THREE.Color("#98ad78"), tmpC = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), y = groundY(x, z);
      tp.setY(i, y);
      const dry = 0.45 * smooth((y - 30) / 40) * vnoise(x / 30, z / 30), deep = 0.5 * smooth((10 - y) / 10);
      tmpC.copy(cA).lerp(cDry, dry).lerp(cDeep, deep); cols.push(tmpC.r, tmpC.g, tmpC.b);
    }
    tg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    scaleUV(tg, SZ / 14);
    tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, M.grass); terrain.receiveShadow = true; R.add(terrain);

    const b = new Batch(), bd = new Batch(), bs = new Batch();
    // distant mountains (hazy in the fog)
    const mr = rng(7);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 650 + mr() * 200, h = 90 + mr() * 120, g = new THREE.ConeGeometry(h * 1.6, h, 7);
      b.add(g, M.mount, at(Math.cos(a) * d, h / 2 - 5, Math.sin(a) * d, mr() * 3));
    }
    // ---- the arcade (tiers: 6 / 12 / 50 bays) ----
    const tier = (x0: number, n: number, w: number, ybIn: number, inX: number, ys: number, yt: number, p: number, d: number, batchOf: (xc: number) => Batch | null) => {
      for (let k = 0; k < n; k++) {
        const xa = x0 + k * w, xb = xa + w, xc = (xa + xb) / 2, B = batchOf(xc);
        if (!B) continue;
        const inside = Math.abs(xc) < inX, yb = inside ? ybIn : 0;
        const crown = ys + (w - 2 * p) / 2, gnd = groundY(xc, 0);
        B.add(bayGeo(xa, xb, yb, ys, yt, p, d, gnd < crown - 1.2), M.stone);
      }
    };
    const siteBay = (xc: number) => xc > SITE.x0 && xc < SITE.x1;
    tier(-50, 6, BAY, 0, 99, 9.2, 20, 2.3, 6.2, (xc) => (siteBay(xc) ? bd : b));
    tier(-100, 12, BAY, 20, 50, 29.2, 40, 2.3, 4.8, () => bd);
    tier(-50 * BAY / 6, 50, BAY / 3, 40, 100, 43.1, 46.6, 0.75, 3.4, () => bd);
    // string courses (protruding ledges) between tiers
    b.add(boxGeo(V(-50, 19.6, -3.45), V(50, 20.3, 3.45), 7), M.stone);
    bd.add(boxGeo(V(-100, 39.6, -2.75), V(100, 40.3, 2.75), 7), M.stone);
    // ---- channel: stone walls, pink lining, water (spring -326 .. castellum 238) ----
    const cx0 = -326, cx1 = 238;
    for (const s of [-1, 1]) {
      bd.add(boxGeo(V(cx0, 46.6, s < 0 ? -1.15 : 0.6), V(cx1, 48.45, s < 0 ? -0.6 : 1.15), 7), M.stone);
      bd.add(new THREE.PlaneGeometry(cx1 - cx0, 1.0).rotateY(s < 0 ? 0 : Math.PI), M.lining, at((cx0 + cx1) / 2, 47.75, s * -0.595));
    }
    bd.add(boxGeo(V(cx0, 46.6, -0.6), V(cx1, 47.25, 0.6), 7), M.lining);
    const chW = waterMat(5.0, [1, 0], 1.6);
    const chMesh = new THREE.Mesh(new THREE.PlaneGeometry(cx1 - cx0, 1.2, 60, 1).rotateX(-Math.PI / 2), chW);
    chMesh.position.set((cx0 + cx1) / 2, CHY, 0); this.done.add(chMesh); this.waters.push({ m: chW, kind: "channel" });
    // ---- river ----
    const rW = waterMat(1.2, [0, 1], 0.35);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(18, 1100).rotateX(-Math.PI / 2), rW);
    river.position.set(0, -0.55, 0); R.add(river); this.waters.push({ m: rW, kind: "river" });
    // ---- the spring: rock pool, boulders, sluice gate ----
    const SP = SPRING;
    b.add(cyl(4.4, 4.6, 1.1, 20), M.stone, at(SP[0], SP[1] - 0.45, SP[2]));
    const pool = waterMat(0.6, [1, 0.2], 1.0);
    const poolM = new THREE.Mesh(new THREE.CircleGeometry(3.9, 28).rotateX(-Math.PI / 2), pool);
    poolM.position.set(SP[0], SP[1] + 0.12, SP[2]); R.add(poolM); this.waters.push({ m: pool, kind: "pool" });
    const rr = rng(3);
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (0.45 + 1.1 * (i / 15)), d = 5.2 + rr() * 2.5, s = 0.9 + rr() * 1.6;
      const g = new THREE.DodecahedronGeometry(s, 0);
      b.add(g, M.rock, at(SP[0] + Math.cos(a) * d, groundY(SP[0] + Math.cos(a) * d, Math.sin(a) * d) + s * 0.4, SP[2] + Math.sin(a) * d, rr() * 6, rr() * 6));
    }
    b.add(new THREE.DodecahedronGeometry(3.2, 0), M.rock, at(SP[0] - 6.5, SP[1] + 1.8, SP[2] - 0.5, 0.4, 0.3)); // the spring rock
    for (const s of [-1, 1]) b.add(boxGeo(V(-327.4, 47.2, s * 0.62 - 0.12), V(-326.8, 49.6, s * 0.62 + 0.12)), M.wood);
    b.add(boxGeo(V(-327.4, 49.4, -0.8), V(-326.8, 49.7, 0.8)), M.wood);
    this.gate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 1.2), M.wood); this.gate.castShadow = true; R.add(this.gate);
    // ---- tunnel hill: shaft heads, windlasses, spoil heaps ----
    SHAFTS.forEach((x, i) => {
      const y = groundY(x, 0);
      b.add(new THREE.TorusGeometry(0.95, 0.28, 6, 14).rotateX(-Math.PI / 2), M.stone, at(x, y + 0.12, 0));
      b.add(new THREE.CircleGeometry(0.9, 14).rotateX(-Math.PI / 2), M.dark, at(x, y + 0.05, 0));
      for (const s of [-1, 1]) b.add(boxGeo(V(x - 0.1, y, s * 1.35 - 0.1), V(x + 0.1, y + 1.9, s * 1.35 + 0.1)), M.wood);
      b.add(cyl(0.16, 0.16, 2.9, 8).rotateX(Math.PI / 2), M.wood, at(x, y + 1.75, 0));
      b.add(boxGeo(V(x - 0.05, y + 1.7, 1.45), V(x + 0.05, y + 2.15, 1.55)), M.wood);
      b.add(new THREE.ConeGeometry(2.4, 1.5, 9), M.dirt, at(x + 0.5, y + 0.4, (i % 2 ? 1 : -1) * 3.6));
      const rope = new THREE.Mesh(cyl(0.025, 0.025, 1, 5).translate(0, -0.5, 0), M.rope);
      const bask = new THREE.Mesh(cyl(0.32, 0.24, 0.42, 10), M.wood);
      rope.position.set(x, y + 1.75, 0.3); bask.castShadow = true;
      this.bRopes.push(rope); this.baskets.push(bask); R.add(rope, bask);
    });
    // ---- surveyors: groma + chorobates ----
    const sv = SURVEY;
    b.add(cyl(0.04, 0.05, 2.1, 8), M.wood, at(sv[0], sv[1] + 1.05, sv[2]));
    for (const ry of [0, Math.PI / 2]) b.add(boxGeo(V(-0.55, -0.03, -0.03), V(0.55, 0.03, 0.03)), M.wood, at(sv[0], sv[1] + 2.05, sv[2], ry + 0.3));
    for (let k = 0; k < 4; k++) {
      const a = 0.3 + (k * Math.PI) / 2, x = sv[0] + Math.cos(a) * 0.53, z = sv[2] - Math.sin(a) * 0.53;
      b.add(cyl(0.008, 0.008, 0.85, 4), M.rope, at(x, sv[1] + 1.62, z));
      b.add(new THREE.ConeGeometry(0.05, 0.11, 6).rotateX(Math.PI), M.bronze, at(x, sv[1] + 1.17, z));
    }
    const ch = V(sv[0] + 6.5, sv[1], sv[2] + 2);
    b.add(boxGeo(V(ch.x - 3, 1.0, ch.z - 0.16), V(ch.x + 3, 1.12, ch.z + 0.16)), M.wood, at(0, sv[1], 0));
    b.add(boxGeo(V(ch.x - 2.6, 1.121, ch.z - 0.05), V(ch.x + 2.6, 1.13, ch.z + 0.05)), M.groove, at(0, sv[1], 0));
    for (const dx of [-2.7, 2.7]) for (const dz of [-0.13, 0.13]) b.add(boxGeo(V(ch.x + dx - 0.05, 0, ch.z + dz - 0.05), V(ch.x + dx + 0.05, 1.0, ch.z + dz + 0.05)), M.wood, at(0, sv[1], 0));
    for (const s of [-1, 1]) b.add(beam(V(ch.x + s * 2.7, sv[1] + 0.25, ch.z + 0.14), V(ch.x + s * 1.6, sv[1] + 1.0, ch.z + 0.14), 0.06), M.wood);
    // ---- construction site (valley floor, bay 33.3-50) ----
    const sx = (SITE.x0 + SITE.x1) / 2, sr = (BAY - 2 * 2.3) / 2, ys = 9.2;
    for (const [a0, a1] of [[SITE.x0, SITE.x0 + 2.3], [SITE.x1 - 2.3, SITE.x1]]) bs.add(boxGeo(V(a0, 0, -3.1), V(a1, ys, 3.1), 7), M.stone);
    // wooden centering: two semicircular ribs, struts, posts, lagging
    for (const z of [-2.3, 2.3]) {
      for (let k = 0; k < 12; k++) {
        const a0 = Math.PI * (k / 12), a1 = Math.PI * ((k + 1) / 12);
        bs.add(beam(V(sx + sr * Math.cos(a0), ys + sr * Math.sin(a0), z), V(sx + sr * Math.cos(a1), ys + sr * Math.sin(a1), z), 0.28), M.wood);
        if (k % 2 === 0) bs.add(beam(V(sx, ys - 0.2, z), V(sx + sr * Math.cos(a0 + 0.13), ys + sr * Math.sin(a0 + 0.13), z), 0.16), M.wood);
      }
      for (const dx of [-sr + 0.3, -2, 0, 2, sr - 0.3]) bs.add(boxGeo(V(sx + dx - 0.13, 0, z - 0.13), V(sx + dx + 0.13, ys - 0.1, z + 0.13)), M.wood);
      bs.add(boxGeo(V(sx - sr, ys - 0.35, z - 0.15), V(sx + sr, ys - 0.1, z + 0.15)), M.wood);
    }
    for (let k = 0; k <= 16; k++) { const a = Math.PI * (k / 16); bs.add(boxGeo(V(-0.12, -0.05, -2.7), V(0.12, 0.05, 2.7)), M.wood, at(sx + (sr + 0.05) * Math.cos(a), ys + (sr + 0.05) * Math.sin(a), 0, 0, 0, a)); }
    // voussoirs already set (all but the keystone)
    const NV = 15, vs = (k: number) => { const a = Math.PI * ((k + 0.5) / NV); return new THREE.BoxGeometry(1.25, (Math.PI * sr) / NV - 0.05, 6.0).applyMatrix4(at(sx + (sr + 0.68) * Math.cos(a), ys + (sr + 0.68) * Math.sin(a), 0, 0, 0, a)); };
    for (let k = 0; k < NV; k++) if (k !== 7) bs.add(scaleUV(vs(k), 1 / 7), M.stone);
    this.keystone = new THREE.Mesh(new THREE.BoxGeometry(1.25, (Math.PI * sr) / NV - 0.05, 6.0), M.stone); this.keystone.castShadow = true; this.site.add(this.keystone);
    // scaffold poles and planks around the piers
    for (const x of [SITE.x0 - 0.6, SITE.x0 + 2.9, SITE.x1 - 2.9, SITE.x1 + 0.6]) for (const z of [-3.9, 3.9]) bs.add(boxGeo(V(x - 0.09, 0, z - 0.09), V(x + 0.09, 11.5, z + 0.09)), M.wood);
    for (const x0 of [SITE.x0 - 0.8, SITE.x1 - 3.1]) for (const y of [4.5, 8.8]) bs.add(boxGeo(V(x0, y, 3.4), V(x0 + 3.9, y + 0.12, 4.4)), M.wood);
    bs.add(boxGeo(V(sx - 4.2, 8.8, 3.3), V(sx + 4.2, 8.95, 4.5)), M.wood);
    for (const dx of [-4, 4]) bs.add(boxGeo(V(sx + dx - 0.09, 0, 4.3), V(sx + dx + 0.09, 8.8, 4.48)), M.wood);
    // dressed blocks lying about + the mason's block
    for (let i = 0; i < 9; i++) bs.add(boxGeo(V(-0.6, 0, -0.45), V(0.6, 0.85, 0.45), 7), M.stone, at(20 + (i % 3) * 1.5 + (i > 5 ? 3 : 0), Math.floor(i / 3) % 2 ? 0 : 0, 17 + Math.floor(i / 3) * 1.25, 0.2 * (i % 2)));
    bs.add(boxGeo(V(-0.7, 0, -0.5), V(0.7, 0.9, 0.5), 7), M.stone, at(...SITE.block));
    // treadwheel crane: two leaning jib beams (A-frame) with a pulley over the bay, the wheel on a frame
    const W = SITE.wheel, tip = V(sx, 13.6, 4.4);
    for (const s of [-1, 1]) {
      bs.add(beam(V(W[0] + 1.2, 0, W[2] + s * 1.4), tip, 0.32), M.wood);
      bs.add(boxGeo(V(W[0] - 0.15, 0, W[2] + s * 1.0 - 0.15), V(W[0] + 0.15, 2.9, W[2] + s * 1.0 + 0.15)), M.wood);
    }
    bs.add(beam(V(W[0] + 1.2, 0, W[2] + 2.6), tip, 0.18), M.rope);
    bs.add(cyl(0.3, 0.3, 0.3, 12).rotateX(Math.PI / 2), M.wood, at(tip.x, tip.y, tip.z));
    this.wheel = new THREE.Group();
    const wR = 2.5;
    for (const z of [-0.65, 0.65]) { const t = new THREE.Mesh(new THREE.TorusGeometry(wR, 0.13, 6, 32), M.wood); t.position.z = z; this.wheel.add(t); }
    for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2 * wR, 0.12), M.wood); s.rotation.z = (k * Math.PI) / 8; for (const z of [-0.65, 0.65]) { const c = s.clone(); c.position.z = z; this.wheel.add(c); } }
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.45), M.wood); s.position.set(Math.cos(a) * wR, Math.sin(a) * wR, 0); s.rotation.z = a; this.wheel.add(s); }
    const axle = new THREE.Mesh(cyl(0.18, 0.18, 2.4, 10).rotateX(Math.PI / 2), M.wood); this.wheel.add(axle);
    this.wheel.position.set(W[0], 2.9, W[2]); this.wheel.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    this.site.add(this.wheel);
    this.block = new THREE.Mesh(scaleUV(new THREE.BoxGeometry(1.4, 1.0, 1.0), 1 / 7), M.stone); this.block.castShadow = true; this.site.add(this.block);
    this.rope = new THREE.Mesh(cyl(0.035, 0.035, 1, 5).translate(0, -0.5, 0), M.rope); this.site.add(this.rope);
    // ---- the city (east plateau) ----
    const P = PLAZA;
    b.add(new THREE.PlaneGeometry(46, 40).rotateX(-Math.PI / 2), M.pave, at(P[0], 47.03, P[2]));
    const cr = rng(11), wallCols = ["#ecd9b0", "#e7c497", "#dfae86", "#f0e3c8", "#e3bf8f"];
    const building = (x: number, z: number, w: number, d: number, h: number, i: number) => {
      const key = `${i % 5}${i % 2}`, fm = lam("fac" + key, () => ({ map: romanFacade(key, wallCols[i % 5], i % 2 === 0) }));
      const g = boxGeo(V(x - w / 2, 47, z - d / 2), V(x + w / 2, 47 + h, z + d / 2), 8);
      b.add(g, fm);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.74, 3.2, 4); roof.rotateY(Math.PI / 4); roof.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
      b.add(scaleUV(roof, 3), M.roof, at(x, 47 + h + 1.6, z));
      b.add(boxGeo(V(x - w / 2 - 0.3, 47 + h - 0.2, z - d / 2 - 0.3), V(x + w / 2 + 0.3, 47 + h + 0.15, z + d / 2 + 0.3)), M.bark);
    };
    let bi = 0;
    for (let gx = 160; gx <= 300; gx += 17) for (let gz = -120; gz <= 90; gz += 17) {
      const x = gx + (cr() - 0.5) * 3, z = gz + (cr() - 0.5) * 3;
      if (Math.abs(x - P[0]) < 30 && Math.abs(z - P[2]) < 27) continue; // square
      if (Math.abs(z) < 6 && x < 250) continue; // channel path
      if (Math.abs(x - 207) < 10 && Math.abs(z + 12) < 9) continue; // temple
      if (Math.abs(x - 228) < 12 && Math.abs(z - 14) < 12) continue; // baths
      building(x, z, 10 + cr() * 5, 10 + cr() * 5, 7 + cr() * 9, bi++);
    }
    // temple (facing the square): podium, six columns, pediment
    const T0 = V(207, 47, -12);
    b.add(boxGeo(V(T0.x - 6, 47, T0.z - 7), V(T0.x + 6, 48.6, T0.z + 7), 7), M.marble);
    b.add(boxGeo(V(T0.x - 5, 48.6, T0.z - 2), V(T0.x + 5, 56, T0.z + 6.5), 7), M.marble);
    for (let k = 0; k < 6; k++) b.add(cyl(0.38, 0.45, 7.2, 12), M.marble, at(T0.x - 4.3 + k * 1.72, 52.2, T0.z - 5.6));
    b.add(boxGeo(V(T0.x - 5.4, 55.8, T0.z - 6.3), V(T0.x + 5.4, 56.8, T0.z + 6.8)), M.marble);
    const ped = new THREE.ConeGeometry(7.6, 2.6, 4); ped.rotateY(Math.PI / 4); ped.scale(0.72, 1, 1.0);
    b.add(scaleUV(ped, 3), M.roof, at(T0.x, 58.1, T0.z + 0.25));
    // baths with a dome
    const B0 = V(228, 47, 14);
    b.add(boxGeo(V(B0.x - 9, 47, B0.z - 8), V(B0.x + 9, 55, B0.z + 8), 8), lam("facBath", () => ({ map: romanFacade("bath", "#e9cfa0", false) })));
    b.add(new THREE.SphereGeometry(6.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.roof, at(B0.x, 55, B0.z));
    // castellum (distribution tank house) at the end of the channel
    const C = CASTELLUM;
    b.add(boxGeo(V(C[0] - 3.2, 47, C[2] - 3.2), V(C[0] + 3.2, 51.5, C[2] + 3.2), 7), M.stone);
    const cro = new THREE.ConeGeometry(4.9, 2.2, 4); cro.rotateY(Math.PI / 4); b.add(scaleUV(cro, 3), M.roof, at(C[0], 52.6, C[2]));
    // the fountain: round basin, central pillar with a bowl
    b.add(cyl(3.3, 3.4, 0.8, 28), M.marble, at(P[0], 47.4, P[2]));
    b.add(cyl(0.45, 0.6, 1.9, 12), M.marble, at(P[0], 48.0, P[2]));
    b.add(cyl(1.0, 0.5, 0.35, 16), M.marble, at(P[0], 49.05, P[2]));
    const fw = waterMat(0.4, [0.3, 1], 1.4);
    this.fountainWater = new THREE.Mesh(new THREE.CircleGeometry(3.0, 28).rotateX(-Math.PI / 2), fw);
    this.fountainWater.position.set(P[0], 47.72, P[2]); R.add(this.fountainWater); this.waters.push({ m: fw, kind: "fountain" });
    const dryBed = new THREE.Mesh(new THREE.CircleGeometry(3.0, 28).rotateX(-Math.PI / 2), M.dirt); dryBed.position.set(P[0], 47.45, P[2]); R.add(dryBed);
    // ---- trees: Italian cypresses and umbrella pines, kept out of every camera's sight line ----
    const cams = camPts(), tr = rng(5);
    let placed = 0;
    for (let i = 0; i < 900 && placed < 230; i++) {
      const x = (tr() - 0.5) * 760, z = (tr() - 0.5) * 760, y = groundY(x, z);
      if (Math.abs(z) < 9 && x > -335 && x < 240) continue;
      if (x > 150 && x < 305 && z > -125 && z < 95) continue;
      if (Math.abs(x) < 18) continue;
      if (Math.hypot(x - SURVEY[0], z - SURVEY[2]) < 18 || Math.hypot(x - SPRING[0], z) < 14 || (Math.abs(x - 40) < 32 && Math.abs(z) < 30)) continue;
      const p = V(x, y + 3, z);
      if (cams.some((c) => segDist(p, c.o, c.l) < 7 || c.o.distanceTo(p) < 12)) continue;
      if (tr() < 0.55) {
        const h = 7 + tr() * 5;
        b.add(new THREE.ConeGeometry(0.95 + tr() * 0.3, h, 8), M.cypress, at(x, y + h / 2 + 0.3, z));
      } else {
        const h = 5 + tr() * 3, r = 3 + tr() * 1.6;
        b.add(cyl(0.25, 0.35, h, 6), M.bark, at(x, y + h / 2, z));
        b.add(new THREE.SphereGeometry(r, 10, 6).scale(1, 0.42, 1), M.pine, at(x, y + h + 0.5, z));
      }
      placed++;
    }
    b.build(R); bd.build(this.done); bs.build(this.site);
  }

  /** camera-relative sun frozen per shot (the skill's lighting grammar) */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const AZ: Record<number, number> = { 1: 35, 11: -28, 7: 120, 8: 110 };
    const EL: Record<number, number> = { 1: 9, 11: 8 };
    const az = THREE.MathUtils.degToRad(AZ[id] ?? L.az), el = THREE.MathUtils.degToRad(EL[id] ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 2000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.1 + 8, 14, 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint);
    // ---- sky + fog (fog = horizon colour; pushed out for the valley's long views) ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = s.light === "golden" ? 90 : 110; this.fog.far = s.light === "golden" ? 950 : 1100;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 1000); this.sunDisc.scale.setScalar(2 * 1000 * Math.tan(THREE.MathUtils.degToRad(1.6)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 1000 * Math.tan(THREE.MathUtils.degToRad(22)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.2);
    }
    this.clouds.forEach((m, i) => { m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; });
    // ---- water ----
    const wc = K.water, front = waterFront(id, f);
    for (const w of this.waters) {
      const u = w.m.uniforms;
      if (w.kind === "river") { untone(wc.mid, u.cA.value); untone(wc.far, u.cB.value); untone(wc.crest, u.cC.value); }
      else { untone(s.light === "golden" ? "#3f7fa6" : "#2fa7c2", u.cA.value); untone(s.light === "golden" ? "#5fa0b8" : "#58c6d8", u.cB.value); untone(s.light === "golden" ? "#ffe0b8" : "#d8f6fb", u.cC.value); }
      u.t.value = t; u.front.value = w.kind === "channel" ? front : 1e9;
      u.fogC.value.copy(this.fog.color); u.fogN.value = this.fog.near; u.fogF.value = this.fog.far;
    }
    const fon = id === 10 ? (f >= 1484 ? 1 : 0) : id === 11 ? 1 : 0;
    this.fountainWater.visible = fon > 0;
    // ---- story state ----
    const siteMode = s.build === "site";
    this.done.visible = !siteMode; this.site.visible = siteMode;
    const gateUp = id === 10 ? smooth((f - 1376) / 10) : id === 3 || id === 1 || id === 5 || id === 11 ? 1 : 0;
    this.gate.position.set(-327.1, 47.85 + 1.25 * gateUp, 0);
    if (siteMode) {
      this.wheel.rotation.z = -(f - 1074) * 0.045 * (f > 1080 && f < 1205 ? 1 : 0.15);
      const u = liftU(f), sx = (SITE.x0 + SITE.x1) / 2, by = 0.5 + u * 7.6;
      this.block.position.set(sx, by, 4.4); this.block.rotation.y = 0.15 * Math.sin(t * 1.3) * u;
      this.block.visible = f >= 1074 && f < 1160;
      this.rope.position.set(sx, 13.3, 4.4); this.rope.scale.set(1, Math.max(0.1, 13.3 - by - 0.5), 1);
      this.rope.visible = f >= 1074 && f < 1160;
      const sr = (BAY - 2 * 2.3) / 2, a = Math.PI / 2, k = keystoneU(f);
      this.keystone.position.set(sx, 9.2 + (sr + 0.68) + 3.4 * (1 - k), 0); this.keystone.rotation.set(0, 0, a + 0.0);
      this.keystone.rotation.z = a; this.keystone.visible = true;
    }
    // shaft baskets: up and down on the windlass ropes
    SHAFTS.forEach((x, i) => {
      const y = groundY(x, 0), ph = ((t * 0.32 + i * 0.27) % 1), up = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      const by = y - 2.2 + 3.4 * up;
      this.baskets[i].position.set(x, by, 0.3); this.baskets[i].visible = by > y - 1.0;
      this.bRopes[i].scale.set(1, Math.max(0.05, y + 1.75 - by - 0.2), 1);
    });
    return focus;
  }
}
export { TUN };
