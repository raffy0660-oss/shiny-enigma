import React from "react";
import { Composition } from "remotion";
import { PionCastle, PionCastleProps } from "./PionCastle";
import { SceneOverlay, SceneOverlayProps } from "./SceneOverlay";
import { BossWords, BossSpit } from "./GreenFX";
import { CastSheet, CastSheetProps } from "./CastSheet";

const defaults: PionCastleProps = {
  frames: 30, fps: 30, width: 1080, height: 1350, sceneW: 1620, sceneH: 2026,
  focus: [810, 900], cam: [[1, 0, 0, 0]], audio: null, camBlur: 1,
  callouts: [{ t: 0.1, dur: 2.5, text: "TRICHORRHEXIS NODOSA", sub: "hair that snaps at weak points", label: "Medical term", pos: "top" }],
};

const overlayDefaults: SceneOverlayProps = { frames: 60, fps: 60, width: 1080, height: 1920, seq: "seq", pts: {}, items: [], cuts: [], intro: null };

export const Root: React.FC = () => (
  <>
  <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={60} width={1080} height={1920} defaultProps={{ top: [], suspects: [], k: 1 } as CastSheetProps} />
  <Composition id="BossWords" component={BossWords} durationInFrames={127} fps={60} width={1080} height={1920} />
  <Composition id="BossSpit" component={BossSpit} durationInFrames={136} fps={60} width={1080} height={1920} />
  <Composition
    id="SceneOverlay"
    component={SceneOverlay}
    defaultProps={overlayDefaults}
    calculateMetadata={({ props }) => ({ durationInFrames: props.frames, fps: props.fps, width: props.width, height: props.height })}
  />
  <Composition
    id="PionCastle"
    component={PionCastle}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.frames,
      fps: props.fps,
      width: props.width,
      height: props.height,
    })}
  />
  </>
);
