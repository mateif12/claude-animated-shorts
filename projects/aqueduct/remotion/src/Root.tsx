import React from "react";
import { Composition } from "remotion";
import { AqueductShort, AQ_FRAMES } from "./videos/aqueduct/Aqueduct";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="AqueductShort" component={AqueductShort} durationInFrames={AQ_FRAMES} fps={30} width={720} height={1280} />
    <Composition id="AqueductFinal" component={AqueductShort} durationInFrames={AQ_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
