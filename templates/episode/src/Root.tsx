import React from "react";
import { Composition } from "remotion";
import { EpisodeShort, EPISODE_FRAMES } from "./videos/episode/Episode";

// The composition is always 1080x1920 @ 30 fps; production.config.json "scale" sets the native render size.
export const Root: React.FC = () => (
  <Composition id="EpisodeShort" component={EpisodeShort} durationInFrames={EPISODE_FRAMES} fps={30} width={1080} height={1920} />
);
