// "Rivers in the Sky": how the Romans built aqueducts. Speed-optimised version of the skill's pipeline:
// one three.js world posed per frame (world.ts) -> InkPass (world ink lines) -> Neutral tone map -> colour grade.
// DOF, bloom and MSAA are off (CPU WebGL budget). Characters and 2D effects are drawn by overlay.ts on a 2D
// canvas with the same camera, instead of as per-frame billboard textures.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASH_AT, SHOTS, layersAt } from "./story";
import { drawOverlay } from "./overlay";

export const AQ_FRAMES = TOTAL;
type Props = { msaa?: number; ink?: boolean; shadows?: boolean };
const props = () => getInputProps() as Props;

let worldSingleton: World | null = null;
const getWorld = () => (worldSingleton ??= new World());

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => getWorld(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const p = props();
  const post = useMemo(() => (
    <EffectComposer multisampling={p.msaa ?? 0}>
      {p.ink === false ? <></> : <primitive object={fx.ink} dispose={null} />}
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx, p.msaa, p.ink]);
  world.update(id, f, camera as THREE.PerspectiveCamera, scene);
  noInkFallback(world.root);
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const Overlay: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current?.getContext("2d"); if (!g) return; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, width, height); try { drawOverlay(g, width, height, id, f); } catch (e) { console.error("overlay", id, f, e); } }, [f, id, width, height]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={width} height={height} dpr={1} shadows={props().shadows ?? true}
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.15, far: 2000 }}>
        <Inner id={id} />
      </ThreeCanvas>
      <Overlay id={id} />
    </AbsoluteFill>
  );
};

export const AqueductShort: React.FC = () => {
  const f = useCurrentFrame();
  const [h] = useState(() => delayRender("aqueduct world"));
  useEffect(() => { getWorld(); continueRender(h); }, [h]);
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
