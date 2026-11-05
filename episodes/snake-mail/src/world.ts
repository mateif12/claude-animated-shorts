// "Snake Mail" world: one three.js scene with four places far apart (cam.far 800, fog hides the others):
// BATTLE (open sea at the origin, two fleets of toon galleys), HARBOUR (Bithynian quay + houses, x = 1500),
// MEADOW (hillside with bushes, x = 3000), BEACH (Pergamene shore with guards, x = -1500).
// Look (sky, two-tone shading, painted textures, water shader, ink-friendly geometry) is reused from the bridge short.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, house } from "./build";
import { rep, ctex, stoneHD, cobbleHD, grassHD, planksHD, beamHD, waterNear, waterFar, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, SHIPS, shipPose, LOC, V3, SKIFF } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- galley ----------------
const SHIP_L = 22, SHIP_B = 4.6, DECK = 1.5;
const halfW = (z: number) => (SHIP_B / 2) * Math.sqrt(Math.max(0, 1 - Math.abs((2 * z) / SHIP_L) ** 2.6));
const hullTex = (side: string, stripe: string) => ctex("hull" + side + stripe, 1024, 256, (g, r) => {
  g.fillStyle = side; g.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = "rgba(20,10,10,0.18)"; g.fillRect(0, y, 1024, 3); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,240,220,${0.04 + 0.05 * r()})`; g.fillRect(r() * 1024, r() * 256, 60 + 120 * r(), 6); }
  g.fillStyle = stripe; g.fillRect(0, 26, 1024, 34);
  g.fillStyle = "rgba(20,10,10,0.5)"; g.fillRect(0, 60, 1024, 4);
});
const sailTex = (a: string, b: string) => ctex("sail" + a + b, 512, 512, (g) => {
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * 512) / 6, 0, 512 / 6 + 1, 512); }
  g.fillStyle = "rgba(60,30,30,0.12)"; for (let y = 0; y < 512; y += 64) g.fillRect(0, y, 512, 3);
});
const eyeTex = () => ctex("bowEye", 256, 128, (g) => {
  g.fillStyle = "#f7f1e1"; g.beginPath(); g.ellipse(128, 64, 110, 48, 0, 0, 7); g.fill();
  g.lineWidth = 12; g.strokeStyle = "#141014"; g.stroke();
  g.fillStyle = "#141014"; g.beginPath(); g.arc(150, 64, 30, 0, 7); g.fill();
});
type Fleet = "bith" | "perg";
const FLEET_COL: Record<Fleet, { hull: string; stripe: string; sail: [string, string] }> = {
  bith: { hull: "#8a5a3a", stripe: "#d9a441", sail: ["#c8463a", "#f1e6cf"] },
  perg: { hull: "#3f5f7a", stripe: "#f1e6cf", sail: ["#2f5fa8", "#f1e6cf"] },
};
class Galley {
  g = new THREE.Group();
  oars: THREE.InstancedMesh;
  constructor(fleet: Fleet, big = false) {
    const C = FLEET_COL[fleet];
    // hull: U sections along z (bow at +z), sheer rising toward both ends
    const NZ = 24, sec = (z: number) => {
      const w = halfW(z), sheer = DECK + 0.5 * ((2 * z) / SHIP_L) ** 4, keel = -0.9 * (1 - ((2 * z) / SHIP_L) ** 6);
      return [[-w, sheer], [-w * 0.9, keel * 0.45], [-w * 0.5, keel * 0.9], [0, keel], [w * 0.5, keel * 0.9], [w * 0.9, keel * 0.45], [w, sheer]];
    };
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= NZ; j++) {
      const z = -SHIP_L / 2 + (SHIP_L * j) / NZ;
      sec(z).forEach(([x, y], k) => { pos.push(x, y, z); uv.push(j / NZ * 3, k < 3 ? (y + 1) / 3 : (y + 1) / 3); });
    }
    for (let j = 0; j < NZ; j++) for (let k = 0; k < 6; k++) { const a = j * 7 + k, b = a + 1, c = a + 8, d = a + 7; idx.push(a, d, c, a, c, b); }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    hg.setIndex(idx); hg.computeVertexNormals();
    // u flips the side texture so the stripe sits under the rail on both sides
    const hullM = lam("hull" + fleet, () => ({ map: hullTex(C.hull, C.stripe), side: THREE.DoubleSide }));
    const hull = new THREE.Mesh(hg, hullM);
    // deck
    const dpos: number[] = [], duv: number[] = [], didx: number[] = [];
    for (let j = 0; j <= NZ; j++) {
      const z = -SHIP_L / 2 + (SHIP_L * j) / NZ, w = Math.max(0.05, halfW(z) - 0.05), y = DECK + 0.5 * ((2 * z) / SHIP_L) ** 4 - 0.12;
      dpos.push(-w, y, z, w, y, z); duv.push(0, z / 2, 2.3, z / 2);
    }
    for (let j = 0; j < NZ; j++) { const a = j * 2; didx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dpos, 3)); dg.setAttribute("uv", new THREE.Float32BufferAttribute(duv, 2));
    dg.setIndex(didx); dg.computeVertexNormals();
    const deck = new THREE.Mesh(dg, lam("deckHD2", () => ({ map: planksHD(), side: THREE.DoubleSide })));
    // ram, stern curl, mast, yard, sail
    const bronze = lam("bronze", () => ({ color: "#b9853a" }));
    const ram = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 8).rotateX(Math.PI / 2), bronze); ram.position.set(0, -0.15, SHIP_L / 2 + 0.7);
    const curve = new THREE.CatmullRomCurve3([V(0, DECK + 0.3, -SHIP_L / 2 + 0.6), V(0, DECK + 1.6, -SHIP_L / 2 - 0.6), V(0, DECK + 3.4, -SHIP_L / 2 - 0.2), V(0, DECK + 3.9, -SHIP_L / 2 + 0.9), V(0, DECK + 3.2, -SHIP_L / 2 + 1.3)]);
    const wood = lam("shipWood", () => ({ map: beamHD() }));
    const stern = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.32, 8), lam("hullTail" + fleet, () => ({ color: C.hull })));
    const mastH = big ? 13 : 11.5;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, mastH, 10), wood); mast.position.set(0, DECK + mastH / 2, 1);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 9, 8).rotateZ(Math.PI / 2), wood); yard.position.set(0, DECK + mastH - 0.4, 1.05);
    const sg = new THREE.PlaneGeometry(8.2, 5.6, 10, 6);
    const sp = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / 4.1, y = sp.getY(i) / 2.8; sp.setZ(i, 0.9 * (1 - x * x) * (1 - 0.5 * y * y)); }
    sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, lam("sail" + fleet, () => ({ map: sailTex(...C.sail), side: THREE.DoubleSide })));
    sail.position.set(0, DECK + mastH - 3.2, 1.15);
    // painted eyes at the bow (unlit decals)
    const em = new THREE.MeshBasicMaterial({ map: eyeTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const z = SHIP_L / 2 - 2.2, e = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), em);
      e.position.set(s * (halfW(z) + 0.03), 0.85, z); e.rotation.y = s * Math.PI / 2 + s * 0.28; e.layers.set(NOINK);
      this.g.add(e);
    }
    // shields along the rail
    const shieldM = lam("shield" + fleet, () => ({ color: C.sail[0] }));
    const sh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14).rotateZ(Math.PI / 2), shieldM, 18);
    let si = 0; const m4 = new THREE.Matrix4();
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const z = -6.5 + k * 1.5; sh.setMatrixAt(si++, m4.makeTranslation(s * (halfW(z) + 0.05), DECK + 0.2, z)); }
    // oars: 2 x 11, pivot at the rail, swept per frame
    this.oars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 1).translate(0, 0, 0.5), wood, 22);
    for (const o of [hull, deck, ram, stern, mast, yard, sail, sh, this.oars]) { o.castShadow = true; o.receiveShadow = true; this.g.add(o); }
    this.oars.frustumCulled = false;
  }
  pose(p: { x: number; z: number; yaw: number; t: number; row: number; bob: number; roll: number }) {
    this.g.position.set(p.x, 0.12 * Math.sin(p.t * 1.7 + p.bob) - 0.05, p.z);
    this.g.rotation.set(0.012 * Math.sin(p.t * 1.3 + p.bob), p.yaw, p.roll + 0.02 * Math.sin(p.t * 1.1 + p.bob * 2), "YXZ");
    const q = new THREE.Quaternion(), e = new THREE.Euler(), m = new THREE.Matrix4(), one = V(1, 1, 1);
    let i = 0;
    for (const s of [-1, 1]) for (let k = 0; k < 11; k++) {
      const z = -6.8 + k * 1.35, ph = p.row ? p.t * p.row * Math.PI * 2 : 0;
      const sweep = p.row ? 0.45 * Math.sin(ph) : 0.15, dip = p.row ? 0.25 * Math.cos(ph) : 0;
      e.set(0, 0, 0); q.setFromEuler(e.set(0.55 + dip, s * (Math.PI / 2 + sweep) , 0, "YXZ"));
      this.oars.setMatrixAt(i++, m.compose(V(s * halfW(z), DECK - 0.15, z), q, V(1, 1, 5.2)));
    }
    this.oars.instanceMatrix.needsUpdate = true;
    void one;
  }
}

// ---------------- helpers ----------------
function quadAt(cx: number, cz: number, sx: number, sz: number, y: number, u: number, v: number) {
  const g = new THREE.PlaneGeometry(sx, sz); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz);
  const a = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * u, a.getY(i) * v);
  return g;
}
const bush = (b: Batch, x: number, y: number, z: number, s: number, mat: THREE.Material) => {
  for (const [dx, dy, dz, r] of [[0, 0.6, 0, 0.9], [0.7, 0.45, 0.2, 0.7], [-0.6, 0.5, -0.1, 0.75], [0.1, 1.1, 0.1, 0.6]])
    b.add(new THREE.SphereGeometry(r * s, 14, 10), mat, new THREE.Matrix4().makeTranslation(x + dx * s, y + dy * s, z + dz * s));
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private ships = new Map<string, Galley>();
  private skiff = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.renderOrder = -0.5; this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- water (one quad per place, shader from the bridge river) ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    for (const L of [LOC.battle, LOC.harbour, LOC.beach, LOC.meadow]) {
      const w = new THREE.Mesh(quadAt(L[0], L[2], 1600, 1600, 0, 1, 1), waterM); w.receiveShadow = true; R.add(w);
    }

    const b = new Batch();
    const grassM = lam("grassHD", () => ({ map: grassHD() })), cobM = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const stoneM = lam("quayHD", () => ({ map: stoneHD("quayHD", ["#d8c9ae", "#cdbd9f", "#e2d5bc", "#c4b294"], "#9c8c72") }));
    const sandM = lam("sand3", () => ({ color: "#dccaa4" })), leafM = lam("leaf", () => ({ color: "#5fa64a" })), leaf2 = lam("leaf2", () => ({ color: "#4e9441" }));
    const rockM = lam("rock", () => ({ color: "#b8afa2" }));
    // ---- HARBOUR: quay along x at z = 0 (water at z > 0), houses behind, hills ----
    {
      const [hx, , hz] = LOC.harbour, Q = 1.6;
      b.add(boxGeo(V(hx - 260, -1, hz - 300), V(hx + 260, Q, hz), 4), stoneM);
      b.add(quadAt(hx, hz - 7, 520, 14, Q + 0.01, 130, 3.5), cobM);
      b.add(quadAt(hx, hz - 160, 520, 290, Q + 0.005, 130, 72), grassM);
      let x = hx - 70, si = 0;
      while (x < hx + 70) { const w = [7, 9][si % 2], h = [7, 8.4, 9.8][si % 3]; house(b, x + w / 2, hz - 19, 0, w, 8, h, si, Q); x += w + 0.4; si++; }
      for (let i = 0; i < 9; i++) house(b, hx - 60 + i * 15, hz - 40 - (i % 2) * 6, 0, 8, 8, 7 + (i % 3) * 1.4, i + 3, Q + 2);
      for (let i = 0; i < 6; i++) { const g = new THREE.SphereGeometry(60 + i * 8, 24, 12); g.scale(1, 0.32, 1); b.add(g, grassM, new THREE.Matrix4().makeTranslation(hx - 200 + i * 80, Q - 4, hz - 150 - (i % 2) * 40)); }
      for (let i = 0; i < 14; i++) { const x2 = hx - 66 + i * 10; b.add(boxGeo(V(x2 - 0.25, Q, hz - 1.2), V(x2 + 0.25, Q + 0.8, hz - 0.7)), lam("bollard", () => ({ color: "#6d5a48" }))); }
    }
    // ---- MEADOW: rolling grass, bushes, rocks ----
    {
      const [mx, , mz] = LOC.meadow, G = 0.6;
      b.add(quadAt(mx, mz, 900, 900, G, 220, 220), grassM);
      for (let i = 0; i < 8; i++) { const g = new THREE.SphereGeometry(70 + (i % 3) * 25, 24, 12); g.scale(1, 0.3, 1); b.add(g, grassM, new THREE.Matrix4().makeTranslation(mx - 260 + i * 75, G - 6, mz - 140 - (i % 3) * 30)); }
      const spots: V3[] = [[-6, 0, -3], [5, 0, -6], [-3, 0, -12], [8, 0, -14], [-10, 0, -9], [2, 0, -20], [-14, 0, -18], [12, 0, -4], [-9, 0, -26], [15, 0, -22]];
      spots.forEach(([x, , z], i) => bush(b, mx + x, G, mz + z, 1 + (i % 3) * 0.25, i % 2 ? leafM : leaf2));
      for (let i = 0; i < 6; i++) { const g = new THREE.DodecahedronGeometry(0.6 + (i % 3) * 0.3); g.scale(1.3, 0.7, 1); b.add(g, rockM, new THREE.Matrix4().makeTranslation(mx - 12 + i * 5, G + 0.2, mz - 6 - (i % 3) * 5)); }
    }
    // ---- BEACH: sand slope rising from the water toward -z, rocks, grass behind ----
    {
      const [bx, , bz] = LOC.beach;
      const g = new THREE.PlaneGeometry(400, 60, 1, 1); g.rotateX(-Math.PI / 2 + 0.045); g.translate(bx, 0.9, bz - 25);
      b.add(g, sandM);
      b.add(quadAt(bx, bz - 160, 400, 220, 2.25, 100, 55), grassM);
      for (let i = 0; i < 7; i++) { const r = new THREE.DodecahedronGeometry(1 + (i % 3) * 0.6); r.scale(1.4, 0.8, 1); b.add(r, rockM, new THREE.Matrix4().makeTranslation(bx - 30 + i * 10, 1.2, bz - 14 - (i % 2) * 8)); }
      for (let i = 0; i < 6; i++) { const h2 = new THREE.SphereGeometry(50 + i * 10, 24, 12); h2.scale(1, 0.35, 1); b.add(h2, grassM, new THREE.Matrix4().makeTranslation(bx - 150 + i * 60, -3, bz - 120 - (i % 2) * 30)); }
    }
    b.build(R);
    // ---- ships ----
    {
      const hullS = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 3.2, 12, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), lam("skiff", () => ({ color: "#9a6a42", side: THREE.DoubleSide })));
      hullS.scale.set(1, 0.7, 1); hullS.position.y = 0.42;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.35), lam("shipWood", () => ({ map: beamHD() }))); plank.position.set(0, 0.35, 0);
      this.skiff.add(hullS, plank);
      for (const s2 of [-1, 1]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.4), lam("shipWood", () => ({ map: beamHD() }))); o.position.set(s2 * 1.1, 0.35, 0); o.rotation.set(0.2, s2 * 1.2, 0); o.name = "oar"; this.skiff.add(o); }
      this.skiff.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(this.skiff);
    }
    for (const s of SHIPS) { const gal = new Galley(s.fleet as Fleet, !!s.big); this.ships.set(s.id, gal); R.add(gal.g); }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 800; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 14, 70);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = Math.min(L.fogFar, 420);
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 600); this.sunDisc.scale.setScalar(2 * 600 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 520 + (i % 3) * 40, w = 130 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d, 110 + (i % 4) * 34, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- ships ----
    for (const sd of SHIPS) {
      const gal = this.ships.get(sd.id)!, p = shipPose(sd.id, id, t);
      gal.g.visible = !!p;
      if (p) gal.pose({ ...p, t, bob: sd.bob });
    }
    this.skiff.visible = s.name === "messenger";
    if (this.skiff.visible) {
      const sk = SKIFF(t); this.skiff.position.set(sk[0], 0.05 * Math.sin(t * 3), sk[2]); this.skiff.rotation.set(0, Math.atan2(3, -14), 0.04 * Math.sin(t * 2.5));
      this.skiff.children.forEach((o) => { if (o.name === "oar") o.rotation.y = Math.sign(o.position.x) * (1.2 + 0.35 * Math.sin(t * 7)); });
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.25 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

function discTex() {
  return ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.7, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
}
void rep;
