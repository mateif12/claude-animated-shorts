// The whole place as one three.js scene: sky, sea, the sea wall of Syracuse (merlons, towers, loopholes), the Greek
// town and temple behind it, the beach camp, the Roman galleys (hull, oars, sail, shields, ram, painted eye), the
// claw crane, catapults, rock crane, the sambuca ladder, the scaling ladders, festival lanterns and the poking stick.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f). Sky, water, light rig,
// two-tone shading and the cast plumbing are the bridge short's (templates/bridge/world.ts).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad, tri } from "./build";
import { rep, ctex, stoneHD, cloudHD, waterNear, waterFar, facadeHD, roofHD, beam, beamHD, planksHD, rng } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, V3, WALL_H, WALL_T, PARAPET, MERLON, BEACH_X0, CLAW_PIVOT, BEAM_L, SHIP_L, clawAt, shipsAt, ShipPose,
  CATAPULTS, BOULDERS, boulderAt, cataArm, LOOPS, loopOpen, SAMB_X, SAMB_HINGE, LADDER_L, ladderAt, rockAt, LADDERS, ladderLean,
  stickOut, STICK_X, ARCH, smooth, clamp01,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit); // no external models: everything is built here

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- painted textures (Canvas2D, seams as dark tints) ----------------
const hullTex = (key: string, band: string) => ctex("hull" + key, 1024, 256, (g, r) => {
  g.fillStyle = "#b07a46"; g.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 22) { g.fillStyle = `rgba(40,22,14,${0.35 + 0.2 * r()})`; g.fillRect(0, y, 1024, 3); }
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,220,170,${0.05 + 0.06 * r()})`; g.fillRect(r() * 1024, r() * 256, 40 + r() * 120, 6); }
  g.fillStyle = band; g.fillRect(0, 18, 1024, 40); // painted band under the gunwale (v = 1 at the top)
  g.fillStyle = "#e8c45a"; g.fillRect(0, 60, 1024, 8);
  g.fillStyle = "rgba(20,10,6,.5)"; g.fillRect(0, 230, 1024, 26); // waterline grime
});
const sailTex = (key: string, stripe: string) => ctex("sail" + key, 512, 512, (g, r) => {
  g.fillStyle = "#f1e6cc"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = stripe; for (const x of [70, 200, 330, 460]) g.fillRect(x - 24, 0, 48, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(90,70,50,.18)"; g.fillRect(0, y, 512, 3); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(120,90,60,${0.04 + 0.04 * r()})`; g.fillRect(r() * 512, r() * 512, 60, 30); }
});
const eyeTex = () => ctex("shipEye", 256, 160, (g) => {
  g.fillStyle = "#f6f1e3"; g.strokeStyle = "#1a1418"; g.lineWidth = 12;
  g.beginPath(); g.ellipse(128, 80, 110, 58, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#1a1418"; g.beginPath(); g.arc(140, 80, 34, 0, 7); g.fill();
});
const sandTrayTex = () => ctex("sandTray", 512, 384, (g, r) => {
  g.fillStyle = "#e8d29c"; g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,90,50,${0.08 * r()})`; g.fillRect(r() * 512, r() * 384, 3, 3); }
  g.strokeStyle = "rgba(110,80,45,.75)"; g.lineWidth = 6;
  for (const [x, y, rr] of [[150, 190, 90], [300, 160, 60], [380, 250, 70], [250, 260, 40]] as const) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); }
  g.beginPath(); g.moveTo(60, 190); g.lineTo(470, 120); g.moveTo(150, 100); g.lineTo(380, 320); g.stroke();
});
const grassTex = () => ctex("dryGrass", 512, 512, (g, r) => {
  g.fillStyle = "#b9a65e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,140,60,.25)" : "rgba(220,200,130,.25)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 8 + r() * 18, r() * 3, 0, 7); g.fill(); }
});
const sandTex = () => ctex("beachSand", 512, 512, (g, r) => {
  g.fillStyle = "#e6cf98"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "150,120,80" : "255,245,215"},${0.12 * r()})`; g.fillRect(r() * 512, r() * 512, 4, 4); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(160,130,85,.18)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, r() * 512); g.bezierCurveTo(170, r() * 512, 340, r() * 512, 512, r() * 512); g.stroke(); }
});

/** horizontal quad facing up at height y */
const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y: number) =>
  quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);

// ---------------- ship ----------------
const DECK_Y = 1.55;
/** hull: sections along z (bow at +z), U-shaped, sheer rising at both ends, sharp bow, rounded stern */
const hullGeo = (L: number, W: number) => {
  const N = 22, P = 9, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, z = (s - 0.5) * L, e = Math.abs(2 * s - 1);
    const half = (W / 2) * Math.sqrt(Math.max(0.0001, 1 - e ** (s > 0.5 ? 1.6 : 2.6)));
    const top = DECK_Y - 0.15 + 1.1 * e ** 3, keel = -0.9 * (1 - e ** 4);
    for (let j = 0; j < P; j++) {
      const a = (j / (P - 1)) * Math.PI; // 0 = right gunwale, PI = left gunwale, through the keel
      const x = Math.cos(a) * half, y = top + (keel - top) * Math.sin(a) ** 0.7;
      pos.push(x, y, z); uv.push((s * L) / 6, 1 - Math.sin(a) * 0.95);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < P - 1; j++) {
    const a = i * P + j, b = a + 1, c = a + P, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
type ShipRig = { g: THREE.Group; oars: THREE.InstancedMesh; sail: THREE.Object3D; ladder?: THREE.Group };
const OARS = 9;
const makeShip = (kind: ShipPose["kind"], M: Record<string, THREE.Material>): ShipRig => {
  const g = new THREE.Group(), L = SHIP_L, W = 4.2, flag = kind === "flag";
  const hullM = lam(flag ? "hullFlag" : "hull", () => ({ map: hullTex(flag ? "f" : "g", flag ? "#2f5f9a" : "#b8322e"), side: THREE.DoubleSide }));
  const hull = new THREE.Mesh(hullGeo(L, W), hullM); hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
  const deckG = new THREE.ShapeGeometry(new THREE.Shape(Array.from({ length: 23 }, (_, i) => {
    const s = i / 22, e = Math.abs(2 * s - 1), half = (W / 2 - 0.12) * Math.sqrt(Math.max(0.0001, 1 - e ** (s > 0.5 ? 1.6 : 2.6)));
    return new THREE.Vector2(half, (s - 0.5) * L * 0.96);
  }).concat(Array.from({ length: 23 }, (_, i) => {
    const s = 1 - i / 22, e = Math.abs(2 * s - 1), half = (W / 2 - 0.12) * Math.sqrt(Math.max(0.0001, 1 - e ** (s > 0.5 ? 1.6 : 2.6)));
    return new THREE.Vector2(-half, (s - 0.5) * L * 0.96);
  }))));
  deckG.rotateX(-Math.PI / 2); deckG.scale(1, 1, -1); deckG.translate(0, DECK_Y - 0.25, 0);
  const deck = new THREE.Mesh(deckG, M.deck); deck.receiveShadow = true; g.add(deck);
  // stern post curling up and forward, bow post + bronze ram at the waterline, painted eyes
  const curl = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 6, 14, Math.PI * 1.2), hullM);
  curl.rotation.y = Math.PI / 2; curl.position.set(0, DECK_Y + 1.6, -L / 2 + 0.3); curl.rotation.z = 0; g.add(curl);
  const ram = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 6), M.bronze); ram.rotation.x = Math.PI / 2; ram.position.set(0, -0.2, L / 2 + 0.7); g.add(ram);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.78), M.eye);
    eye.position.set(s * 0.95, DECK_Y - 0.1, L / 2 - 2.0); eye.rotation.y = s * (Math.PI / 2 - 0.35); eye.layers.set(NOINK); g.add(eye);
  }
  // mast + yard + sail
  const sail = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 9, 8), M.wood); mast.position.set(0, DECK_Y + 4.5, 0.6); sail.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7.6, 6), M.wood); yard.rotation.z = Math.PI / 2; yard.position.set(0, DECK_Y + 8.6, 0.75); sail.add(yard);
  const sg = new THREE.PlaneGeometry(7.2, 5.6, 6, 4);
  const sp = sg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, 0.55 * (1 - (x / 3.6) ** 2) * (0.6 + 0.4 * (1 - (y / 2.8) ** 2))); }
  sg.computeVertexNormals();
  const sm = new THREE.Mesh(sg, flag ? M.sailFlag : M.sail); sm.position.set(0, DECK_Y + 5.75, 0.95); sm.castShadow = true; sail.add(sm);
  g.add(sail);
  // shields along the rails
  const shields = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 14).rotateZ(Math.PI / 2), M.shield, 2 * 9);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let k = 0; k < 9; k++) for (const s of [-1, 1]) {
    const z = -L * 0.32 + k * (L * 0.62) / 8, e = Math.abs((2 * z) / L), half = (W / 2) * Math.sqrt(Math.max(0.0001, 1 - e ** 2));
    shields.setMatrixAt(k * 2 + (s > 0 ? 1 : 0), m4.compose(V(s * (half + 0.04), DECK_Y - 0.05, z), q, V(1, 1, 1)));
  }
  shields.castShadow = true; g.add(shields);
  // oars: pivot on the gunwale, blade in the water; posed per frame
  const oarG = new THREE.BoxGeometry(0.11, 0.11, 6.2).translate(0, 0, 3.1);
  const oars = new THREE.InstancedMesh(oarG, M.oar, OARS * 2); oars.castShadow = true; oars.frustumCulled = false; g.add(oars);
  return { g, oars, sail };
};

// ---------------- the world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private ships = new Map<string, ShipRig>();
  private shipPool: Record<string, ShipRig[]> = {};
  private M: Record<string, THREE.Material> = {};
  private beam = new THREE.Group(); private chain: THREE.Mesh; private claw = new THREE.Group(); private hooks: THREE.Mesh[] = [];
  private catArms: THREE.Group[] = []; private boulders: THREE.Mesh[] = [];
  private loops: THREE.Mesh[] = [];
  private ladder = new THREE.Group(); private rock: THREE.Mesh; private rockRope: THREE.Mesh;
  private beachLadders: THREE.Group[] = [];
  private lanterns = new THREE.Group();
  private stick: THREE.Mesh;
  private beach = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, M = this.M;
    // ---- sky + light (bridge rig) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 110 + (i % 4) * 36, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.wall = lam("syrWall", () => ({ map: stoneHD("syrWallHD", ["#e3cfa8", "#d8c39b", "#ead8b4", "#cdb68d"], "#a8916c") }));
    M.cope = lam("syrCope", () => ({ map: stoneHD("syrCopeHD", ["#efe2c6", "#e6d8b9", "#f3e8d0", "#ddcfae"], "#b5a27f") }));
    M.wood = lam("wood", () => ({ map: beam() }));
    M.woodHD = lam("woodHD", () => ({ map: beamHD() }));
    M.deck = lam("planksHD", () => ({ map: rep(planksHD(), 0.5, 2) }));
    M.bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#c08a3e", specular: "#ffd9a0", shininess: 50 }), 0.15);
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }), 0.15);
    M.rope = lam("rope", () => ({ color: "#b8955e" }));
    M.oar = lam("oar", () => ({ color: "#a8784c" }));
    M.shield = lam("shieldRed", () => ({ color: "#b8322e" }));
    M.sail = lam("sailG", () => ({ map: sailTex("g", "#c0392b"), side: THREE.DoubleSide }));
    M.sailFlag = lam("sailF", () => ({ map: sailTex("f", "#7a2a6a"), side: THREE.DoubleSide }));
    M.eye = new THREE.MeshBasicMaterial({ map: eyeTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xdddddd });
    M.stone = lam("boulder", () => ({ map: stoneHD("boulderHD", ["#b9ad99", "#ada08b", "#c4b9a6", "#a39784"], "#8a7e6c") }));
    M.tray = lam("tray", () => ({ map: sandTrayTex() }));
    M.grass = lam("dryGrass", () => ({ map: rep(grassTex(), 30, 30) }));
    M.sand = lam("beachSand", () => ({ map: rep(sandTex(), 20, 8) }));
    M.tent = lam("tent", () => ({ color: "#efe4cc", side: THREE.DoubleSide }));
    M.temple = lam("temple", () => ({ color: "#f2ead8" }));
    M.dark = new THREE.MeshBasicMaterial({ color: "#140e14" });

    // ---- sea wall, towers, merlons, city (static batch) ----
    const b = new Batch();
    const X0 = -220, X1 = 420;
    b.add(boxGeo(V(X0, -3, 0), V(X1, WALL_H, WALL_T), 4), M.wall);
    b.add(boxGeo(V(X0, WALL_H, 0), V(X1, PARAPET, 0.7), 2), M.cope);
    b.add(boxGeo(V(X0, WALL_H, WALL_T - 0.45), V(X1, WALL_H + 0.8, WALL_T), 2), M.cope);
    b.add(boxGeo(V(X0, WALL_H - 0.4, -0.25), V(X1, WALL_H, 0.01), 2), M.cope); // string course under the parapet
    const TOWERS = [-120, -72, 36, 66, 140, 200];
    for (let x = X0; x < X1; x += 2.3) if (!TOWERS.some((tx) => Math.abs(x - tx) < 6)) b.add(boxGeo(V(x, PARAPET, 0), V(x + 1.35, MERLON, 0.7), 2), M.cope);
    for (const tx of TOWERS) {
      b.add(boxGeo(V(tx - 5, -3, -2.2), V(tx + 5, 18, 5.5), 4), M.wall);
      b.add(boxGeo(V(tx - 5.3, 18, -2.5), V(tx + 5.3, 18.6, 5.8), 2), M.cope);
      for (let k = 0; k < 4; k++) for (const [z0, z1] of [[-2.5, -1.8], [5.1, 5.8]] as const) b.add(boxGeo(V(tx - 5.3 + k * 2.9, 18.6, z0), V(tx - 5.3 + k * 2.9 + 1.5, 19.8, z1), 2), M.cope);
      for (const s of [-1, 1]) b.add(boxGeo(V(tx + s * 5.3 - (s > 0 ? 0.7 : 0), 18.6, -2.5), V(tx + s * 5.3 + (s < 0 ? 0.7 : 0), 19.8, 5.8), 2), M.cope);
      for (const [wy, wx] of [[9, -1.8], [9, 1.8], [14, 0]] as const) b.add(boxGeo(V(tx + wx - 0.45, wy, -2.26), V(tx + wx + 0.45, wy + 1.6, -2.2)), M.dark);
    }
    // rubble at the wall foot
    const rr = rng(5);
    for (let x = X0; x < BEACH_X0; x += 3.5) {
      const r = 0.8 + rr() * 1.3, g = new THREE.IcosahedronGeometry(r, 0);
      b.add(g, M.stone, new THREE.Matrix4().makeTranslation(x + rr() * 2, -0.4, -0.6 - rr() * 1.4));
    }
    // town behind the wall: terrace at y 6, flat-roofed and hip-roofed Greek houses, a temple on the hill
    b.add(quadUp(X0, X1, WALL_T, 400, 64, 40, 6), M.grass);
    const STY = [{ wall: "#efe3c8", shutter: "#3f6fb5" }, { wall: "#e4c890", shutter: "#2f6a43" }, { wall: "#f3ead6", shutter: "#8c3b4a" }, { wall: "#d9b07a", shutter: "#2f5f6a" }, { wall: "#ecd6ae", shutter: "#5a3b2a" }];
    const ROOFS = ["#c9775a", "#b8644f", "#d27a62"];
    const hr = rng(17);
    for (let x = X0 + 10; x < X1 - 10; x += 8.5 + hr() * 3) for (const zr of [9, 19, 31, 46]) {
      if (hr() < 0.18) continue;
      const w = 6 + hr() * 3, d = 6 + hr() * 2, h = 4.5 + hr() * 4 + (zr > 25 ? 2 : 0), st = STY[Math.floor(hr() * STY.length)], si = Math.floor(hr() * 5);
      const z = zr + hr() * 3, y = 6 + Math.max(0, (zr - 20) * 0.25);
      const front = lam(`gf${si}_${Math.round(w)}_${Math.round(h)}`, () => ({ map: facadeHD(`g${si}_${Math.round(w)}_${Math.round(h)}`, Math.round(w), Math.round(h), { ...st, door: true }) }));
      const sideM = lam(`gs${si}_${Math.round(h)}`, () => ({ map: facadeHD(`gs${si}_${Math.round(h)}`, 7, Math.round(h), st) }));
      const hw = w / 2, hd = d / 2;
      b.add(quad(V(x - hw, y, z - hd), V(x + hw, y, z - hd), V(x + hw, y + h, z - hd), V(x - hw, y + h, z - hd)).rotateY(0), front);
      b.add(quad(V(x + hw, y, z - hd), V(x + hw, y, z + hd), V(x + hw, y + h, z + hd), V(x + hw, y + h, z - hd)), sideM);
      b.add(quad(V(x - hw, y, z + hd), V(x - hw, y, z - hd), V(x - hw, y + h, z - hd), V(x - hw, y + h, z + hd)), sideM);
      b.add(quad(V(x + hw, y, z + hd), V(x - hw, y, z + hd), V(x - hw, y + h, z + hd), V(x + hw, y + h, z + hd)), sideM);
      const rc = ROOFS[Math.floor(hr() * 3)], roofM = lam("groof" + rc, () => ({ map: roofHD(rc), side: THREE.DoubleSide }));
      if (hr() < 0.65) { // low hip roof
        const o = 0.4, ry = y + h + 1.5;
        b.add(quad(V(x - hw - o, y + h, z - hd - o), V(x + hw + o, y + h, z - hd - o), V(x + hw * 0.2, ry, z), V(x - hw * 0.2, ry, z), w / 3, 1), roofM);
        b.add(quad(V(x + hw + o, y + h, z + hd + o), V(x - hw - o, y + h, z + hd + o), V(x - hw * 0.2, ry, z), V(x + hw * 0.2, ry, z), w / 3, 1), roofM);
        b.add(tri(V(x - hw - o, y + h, z + hd + o), V(x - hw - o, y + h, z - hd - o), V(x - hw * 0.2, ry, z)), roofM);
        b.add(tri(V(x + hw + o, y + h, z - hd - o), V(x + hw + o, y + h, z + hd + o), V(x + hw * 0.2, ry, z)), roofM);
      } else { // flat terrace roof with a parapet
        b.add(boxGeo(V(x - hw - 0.15, y + h, z - hd - 0.15), V(x + hw + 0.15, y + h + 0.45, z + hd + 0.15), 2), M.cope);
      }
    }
    // the hill + temple (Doric: stylobate, columns, entablature, pediment, roof)
    const hill = new THREE.SphereGeometry(70, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(1.6, 0.42, 1);
    b.add(hill, M.grass, new THREE.Matrix4().makeTranslation(10, 4, 130));
    const TX = 4, TY = 33, TZ = 112;
    b.add(boxGeo(V(TX - 13, TY - 1.5, TZ - 7), V(TX + 13, TY, TZ + 7), 2), M.temple);
    for (let k = 0; k < 8; k++) for (const zz of [TZ - 6, TZ + 6]) b.add(new THREE.CylinderGeometry(0.75, 0.85, 9, 12), M.temple, new THREE.Matrix4().makeTranslation(TX - 11.2 + k * 3.2, TY + 4.5, zz));
    b.add(boxGeo(V(TX - 12.5, TY + 9, TZ - 6.8), V(TX + 12.5, TY + 10.8, TZ + 6.8), 2), M.temple);
    b.add(quad(V(TX - 12.5, TY + 10.8, TZ - 6.8), V(TX + 12.5, TY + 10.8, TZ - 6.8), V(TX + 12.5, TY + 14, TZ), V(TX - 12.5, TY + 14, TZ)), lam("groof#c9775a", () => ({ map: roofHD("#c9775a"), side: THREE.DoubleSide })));
    b.add(quad(V(TX + 12.5, TY + 10.8, TZ + 6.8), V(TX - 12.5, TY + 10.8, TZ + 6.8), V(TX - 12.5, TY + 14, TZ), V(TX + 12.5, TY + 14, TZ)), lam("groof#c9775a", () => ({ map: roofHD("#c9775a"), side: THREE.DoubleSide })));
    for (const sx of [-1, 1]) b.add(tri(V(TX + sx * 12.5, TY + 10.8, TZ + sx * 6.8), V(TX + sx * 12.5, TY + 10.8, TZ - sx * 6.8), V(TX + sx * 12.5, TY + 14, TZ)), M.temple);
    // far headland and a hazy mountain (fog does the rest)
    const mtn = new THREE.ConeGeometry(160, 120, 24); b.add(mtn, lam("mtn", () => ({ color: "#8fa0b8" })), new THREE.Matrix4().makeTranslation(-260, 50, 520));
    // ---- wall-walk props: rope coils, boulder piles, Archimedes' sand tray ----
    for (const [x, z] of [[-6, 2.6], [-6.8, 3.2], [-5.4, 3.3], [18, 3.0], [17.2, 2.4], [-30, 2.8]] as const) b.add(new THREE.IcosahedronGeometry(0.55, 0), M.stone, new THREE.Matrix4().makeTranslation(x, WALL_H + 0.45, z));
    for (const [x, z] of [[-2.5, 3.2], [9.5, 3.3], [-16, 3.0]] as const) b.add(new THREE.TorusGeometry(0.42, 0.14, 6, 14).rotateX(Math.PI / 2), M.rope, new THREE.Matrix4().makeTranslation(x, WALL_H + 0.15, z));
    b.add(boxGeo(V(ARCH[0] - 0.75, WALL_H, ARCH[2] - 1.55), V(ARCH[0] + 0.75, WALL_H + 0.16, ARCH[2] - 0.55)), M.wood);
    b.add(quadUp(ARCH[0] - 0.7, ARCH[0] + 0.7, ARCH[2] - 1.5, ARCH[2] - 0.6, 1, 1, WALL_H + 0.165), M.tray);
    // claw crane frame (A-frame around the pivot) and the rock crane at the sambuca
    for (const s of [-1, 1]) {
      b.add(boxGeo(V(CLAW_PIVOT[0] + s * 0.9 - 0.2, WALL_H, CLAW_PIVOT[2] - 0.2), V(CLAW_PIVOT[0] + s * 0.9 + 0.2, CLAW_PIVOT[1] + 0.3, CLAW_PIVOT[2] + 0.2)), M.woodHD);
      b.add(boxGeo(V(SAMB_X + s * 0.8 - 0.2, WALL_H, 1.8), V(SAMB_X + s * 0.8 + 0.2, WALL_H + 1.6, 2.2)), M.woodHD);
    }
    const crane = new THREE.BoxGeometry(0.6, 0.6, 14).translate(0, 0, -5.5); crane.rotateX(-0.75);
    b.add(crane, M.woodHD, new THREE.Matrix4().makeTranslation(SAMB_X, WALL_H + 1.6, 2));
    // catapult frames
    for (const [cx, cy, cz] of CATAPULTS) {
      b.add(boxGeo(V(cx - 1.1, cy, cz - 1.4), V(cx - 0.8, cy + 0.4, cz + 1.4)), M.woodHD);
      b.add(boxGeo(V(cx + 0.8, cy, cz - 1.4), V(cx + 1.1, cy + 0.4, cz + 1.4)), M.woodHD);
      for (const s of [-1, 1]) b.add(boxGeo(V(cx + s * 0.95 - 0.15, cy, cz - 0.15), V(cx + s * 0.95 + 0.15, cy + 1.9, cz + 0.15)), M.woodHD);
      b.add(boxGeo(V(cx - 1.1, cy + 1.75, cz - 0.15), V(cx + 1.1, cy + 2.0, cz + 0.15)), M.woodHD);
    }
    b.build(R);

    // ---- beach + camp (only on the beach shots) ----
    const bb = new Batch();
    bb.add(quadUp(BEACH_X0, X1, -46, -0.05, 30, 10, 0.35), M.sand);
    bb.add(quad(V(BEACH_X0, -0.6, -56), V(X1, -0.6, -56), V(X1, 0.35, -46), V(BEACH_X0, 0.35, -46), 30, 2), M.sand);
    for (let i = 0; i < 9; i++) {
      const x = 86 + i * 6.5 + (i % 2) * 2, z = -30 - (i % 3) * 5, h = 2.6;
      const tg = new THREE.ConeGeometry(2.1, h, 4, 1, true); tg.rotateY(Math.PI / 4);
      bb.add(tg, M.tent, new THREE.Matrix4().makeTranslation(x, 0.35 + h / 2, z));
    }
    for (const [x, z] of [[97, -18], [108, -19.5], [101, -16.8]] as const) bb.add(new THREE.IcosahedronGeometry(0.55, 0), M.stone, new THREE.Matrix4().makeTranslation(x, 0.45, z));
    bb.build(this.beach); R.add(this.beach);

    // ---- water (bridge river shader, slow drift) ----
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
    const wm = new THREE.Mesh(quadUp(-900, 900, -900, -0.02, 1, 1, 0), waterM); wm.receiveShadow = true; wm.layers.set(NOINK); R.add(wm);

    // ---- claw crane (beam pivots about x at CLAW_PIVOT; local +y along the beam) ----
    const bm = new THREE.Mesh(new THREE.BoxGeometry(0.75, BEAM_L + 3, 0.75).translate(0, (BEAM_L - 3) / 2, 0), M.woodHD); bm.castShadow = true;
    const cw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6).translate(0, -3, 0), M.stone); cw.castShadow = true;
    this.beam.add(bm, cw); this.beam.position.set(...CLAW_PIVOT); R.add(this.beam);
    this.chain = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 6).translate(0, -0.5, 0), M.iron); this.chain.castShadow = true; R.add(this.chain);
    const hub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), M.iron); this.claw.add(hub);
    for (let k = 0; k < 3; k++) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.13, 6, 12, Math.PI * 1.1), M.iron);
      h.rotation.order = "YXZ"; this.hooks.push(h); this.claw.add(h);
    }
    this.claw.traverse((o) => { o.castShadow = true; }); R.add(this.claw);
    // catapult arms
    for (const [cx, cy, cz] of CATAPULTS) {
      const arm = new THREE.Group(), a = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 0.3).translate(0, 2.1, 0), M.woodHD);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.35, 10), M.woodHD); cup.position.y = 4.2;
      arm.add(a, cup); arm.position.set(cx, cy + 0.4, cz + 0.2); arm.traverse((o) => { o.castShadow = true; });
      this.catArms.push(arm); R.add(arm);
    }
    for (const bo of BOULDERS) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(bo.r, 1), M.stone); m.castShadow = true; m.visible = false; this.boulders.push(m); R.add(m); }
    // loopholes: dark squares that open on the sea face
    for (const [x, y] of LOOPS) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), M.dark); m.position.set(x, y, -0.02); m.rotation.y = Math.PI; m.layers.set(NOINK); this.loops.push(m); R.add(m); }
    // sambuca ladder: two rails + rungs, hinged at SAMB_HINGE, local +y along the ladder
    const rail = new THREE.BoxGeometry(0.28, LADDER_L, 0.28).translate(0, LADDER_L / 2, 0);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(rail, M.woodHD); r.position.x = s * 1.1; this.ladder.add(r); }
    for (let k = 1; k < 14; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), M.wood); r.position.y = k * (LADDER_L / 14); this.ladder.add(r); }
    const plat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.2), M.woodHD); plat.position.set(0, LADDER_L, 0.6); this.ladder.add(plat);
    this.ladder.position.set(...SAMB_HINGE); this.ladder.traverse((o) => { o.castShadow = true; }); R.add(this.ladder);
    this.rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), M.stone); this.rock.castShadow = true; R.add(this.rock);
    this.rockRope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5).translate(0, 0.5, 0), M.rope); R.add(this.rockRope);
    // beach scaling ladders
    for (const L of LADDERS) {
      const g = new THREE.Group(), len = 14.2;
      for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, len, 0.16).translate(0, len / 2, 0), M.woodHD); r.position.x = s * 0.45; g.add(r); }
      for (let k = 1; k < 16; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), M.wood); r.position.y = k * (len / 16); g.add(r); }
      g.position.set(L.x, 0.35, -4.6); g.traverse((o) => { o.castShadow = true; }); this.beachLadders.push(g); R.add(g);
    }
    // festival lanterns along the parapet (HDR emissive: they bloom)
    const lg = new THREE.SphereGeometry(0.28, 10, 8), lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 3.0, 1.2) });
    for (let x = 84; x < 128; x += 3.1) { const m = new THREE.Mesh(lg, lm); m.position.set(x, MERLON + 0.55 + 0.25 * Math.sin(x), 0.35); m.layers.set(NOINK); this.lanterns.add(m); }
    R.add(this.lanterns);
    this.stick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1.7), M.wood); this.stick.castShadow = true; R.add(this.stick);
  }

  private rig(key: string, kind: ShipPose["kind"]) {
    let r = this.ships.get(key);
    if (!r) { r = makeShip(kind, this.M); this.ships.set(key, r); this.root.add(r.g); }
    return r;
  }

  /** camera-relative sun, frozen per shot */
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
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 70);
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
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear + 20; this.fog.far = L.fogFar + 120;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;

    // ---- ships ----
    const want = shipsAt(id, t), used = new Set<string>();
    const count: Record<string, number> = {};
    for (const p of want) {
      const n = (count[p.kind] = (count[p.kind] ?? 0) + 1), key = `${p.kind}${n}`;
      const r = this.rig(key, p.kind);
      used.add(key);
      r.g.visible = true;
      r.g.position.set(p.x, p.y, p.z); r.g.rotation.order = "YXZ"; r.g.rotation.set(p.pitch, p.yaw, p.roll);
      r.sail.visible = p.sail;
      r.oars.visible = !(p.kind === "victim" && p.pitch < -0.03) && !(p.kind === "victim" && Math.abs(p.roll) > 0.3);
      for (let k = 0; k < OARS; k++) for (const sd of [-1, 1]) {
        const ph = p.row * Math.PI * 2, sweep = 0.38 * Math.sin(ph), dip = 0.22 + 0.12 * Math.cos(ph);
        const z = -SHIP_L * 0.3 + k * (SHIP_L * 0.58) / (OARS - 1);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dip, sd * (Math.PI / 2 - sweep), 0, "YXZ"));
        r.oars.setMatrixAt(k * 2 + (sd > 0 ? 1 : 0), this.m4.compose(this.v.set(sd * 1.7, DECK_Y - 0.4, z), q, V(1, 1, 1)));
      }
      r.oars.instanceMatrix.needsUpdate = true;
    }
    for (const [k, r] of this.ships) if (!used.has(k)) r.g.visible = false;

    // ---- claw ----
    const showSea = s.place !== "beach";
    const cl = clawAt(id === 2 ? tau : t);
    const clawOn = showSea && (id <= 6);
    this.beam.visible = clawOn; this.chain.visible = clawOn; this.claw.visible = clawOn;
    const beamA = id <= 4 && id !== 2 ? -0.26 : cl.beam;
    this.beam.rotation.set(-beamA, 0, 0);
    const tip = V(CLAW_PIVOT[0], CLAW_PIVOT[1] + BEAM_L * Math.cos(beamA), CLAW_PIVOT[2] - BEAM_L * Math.sin(beamA));
    const cy = id <= 4 && id !== 2 ? tip.y - 3 : cl.clawY;
    this.claw.position.set(tip.x, cy, tip.z);
    this.hooks.forEach((h, k) => { h.rotation.set(Math.PI / 2 + 0.5 * cl.open, (k * 2 * Math.PI) / 3, 0); h.position.set(0.5 * Math.sin((k * 2 * Math.PI) / 3), -0.5, 0.5 * Math.cos((k * 2 * Math.PI) / 3)); });
    this.chain.position.copy(tip); this.chain.scale.set(1, Math.max(0.1, tip.y - cy), 1);
    // ---- catapults + boulders ----
    this.catArms.forEach((a, i) => { a.rotation.x = 0.55 - 1.4 * cataArm(i, tau); a.visible = showSea; });
    BOULDERS.forEach((bo, i) => { const p = boulderAt(bo, tau); this.boulders[i].visible = !!p && showSea; if (p) { this.boulders[i].position.set(...p); this.boulders[i].rotation.set(t * 3, t * 2, 0); } });
    // ---- loopholes ----
    this.loops.forEach((m, i) => { const k = id === 8 ? loopOpen(tau, i) : 0; m.visible = k > 0.01; m.scale.setScalar(Math.max(0.01, k)); });
    // ---- sambuca + rock ----
    const sam = id === 9 || id === 10;
    this.ladder.visible = sam;
    const la = ladderAt(tau);
    this.ladder.rotation.set(-(Math.PI / 2 - la.ang), 0, la.broken * 0.25);
    this.ladder.position.set(SAMB_HINGE[0], SAMB_HINGE[1] - la.broken * 0.6, SAMB_HINGE[2]);
    const rk = id === 9 ? rockAt(tau) : null;
    const rockHang = id === 9 && !rk && tau < 39.6;
    this.rock.visible = !!rk || rockHang;
    if (rk) this.rock.position.set(...rk); else if (rockHang) this.rock.position.set(SAMB_X, 24, -3.4);
    this.rock.rotation.set(t * 0.5, t * 0.3, 0);
    this.rockRope.visible = rockHang;
    if (rockHang) { this.rockRope.position.set(SAMB_X, 25.2, -3.4); this.rockRope.scale.set(1, 1.6, 1); }
    // ---- beach ----
    const beach = s.place === "beach";
    this.beach.visible = beach;
    this.beachLadders.forEach((g, i) => {
      const L = LADDERS[i], on = (id === 13 && tau > L.t - 0.4) || id === 14;
      g.visible = on;
      const lean = id === 14 ? 0 : ladderLean(tau, L.t);
      g.rotation.set(0.26 - 0.6 * lean, 0, 0); // leaning toward the wall (+z); 'lean' tilts it back into the air
    });
    this.lanterns.visible = id >= 13;
    const so = stickOut(id, tau);
    this.stick.visible = so > 0.01 && beach;
    this.stick.position.set(STICK_X(id), id === 14 ? PARAPET + 0.25 : PARAPET + 0.35, 0.95 - 1.5 * so);
    this.stick.rotation.set(0.12, 0.25, 0);

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const usedA: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      usedA.push(a);
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
      else if (p.face !== undefined) { e2.mesh.rotation.set(0, p.face, p.rot ?? 0); }
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of usedA) a.bind();
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
void smooth; void clamp01;
