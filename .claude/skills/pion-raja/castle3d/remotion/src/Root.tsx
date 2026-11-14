import React from "react";
import { Composition } from "remotion";
import { PionCastle, PionCastleProps } from "./PionCastle";

const defaults: PionCastleProps = {
  frames: 30, fps: 30, width: 1080, height: 1350, sceneW: 1620, sceneH: 2026,
  focus: [810, 900], cam: [[1, 0, 0, 0]], audio: null, camBlur: 1,
};

export const Root: React.FC = () => (
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
);
