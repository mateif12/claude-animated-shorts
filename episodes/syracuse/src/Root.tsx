import React from "react";
import { Composition } from "remotion";
import { SyracuseShort, SYRACUSE_FRAMES } from "./videos/syracuse/Bridge";

// "The One Guy Who Made Rome Look Stupid" (Archimedes vs. the Roman army), built from templates/bridge
export const Root: React.FC = () => (
  <Composition id="SyracuseShort" component={SyracuseShort} durationInFrames={SYRACUSE_FRAMES} fps={30} width={1080} height={1920} />
);
