// Narration-driven timing. The story (story.ts / cast.ts / world.ts / the audio event table) is written in STORY time.
// voice/warp.json (written by scripts/analyze_voice.py from the supplied voice.mp3) maps story time -> voice time with
// monotonic word anchors; between anchors the mapping is linear, so every action keeps its sync to its word and
// pauses stretch or shrink with the recording. With no anchors it is the identity (story time = voice time).
// The video timeline is the VOICE timeline: useStoryFrame() converts the current video frame into the story frame.
import { useCurrentFrame } from "remotion";
import warp from "../../../voice/warp.json";

type Warp = { anchors: [number, number][]; storyFrames: number; videoFrames: number };
const W = warp as Warp;
const FPS = 30;
const A = W.anchors.length ? W.anchors : [[0, 0], [W.storyFrames / FPS, W.storyFrames / FPS]] as [number, number][];

/** voice (video) seconds -> story seconds */
export const toStory = (tv: number) => {
  if (tv <= A[0][1]) return A[0][0] + (tv - A[0][1]);
  for (let i = 1; i < A.length; i++) if (tv <= A[i][1]) {
    const [s0, v0] = A[i - 1], [s1, v1] = A[i];
    return s0 + ((tv - v0) * (s1 - s0)) / Math.max(1e-6, v1 - v0);
  }
  const [s, v] = A[A.length - 1];
  return s + (tv - v);
};
/** total frames of the video (= the voice length + tag) */
export const VIDEO_FRAMES = W.videoFrames || W.storyFrames;
/** current story frame (fractional) for the current video frame */
export const useStoryFrame = () => toStory(useCurrentFrame() / FPS) * FPS;
