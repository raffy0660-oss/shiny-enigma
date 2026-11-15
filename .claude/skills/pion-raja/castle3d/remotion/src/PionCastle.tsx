import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { Callout, Callouts } from "./Callouts";

export type PionCastleProps = {
  frames: number;
  fps: number;
  width: number;
  height: number;
  sceneW: number;               // scene frames are bigger than the output, so a 1.5x zoom stays sharp
  sceneH: number;
  focus: [number, number];      // Pion's face in scene pixels: the zoom centre
  cam: [number, number, number, number][]; // per frame [zoom, offsetX, offsetY, roll deg] from engine/camplan.js
  audio: string | null;
  camBlur: number;              // camera motion-blur samples (1 = off)
  callouts?: Callout[];         // on-screen term titles (cue `callout`), above the camera layer
};

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// fractional frames (motion-blur subframes) interpolate between plan samples
const camAt = (cam: PionCastleProps["cam"], f: number) => {
  const x = clamp(f, 0, cam.length - 1), i = Math.floor(x), j = Math.min(i + 1, cam.length - 1), u = x - i;
  return cam[i].map((v, k) => lerp(v, cam[j][k], u)) as [number, number, number, number];
};

const Scene: React.FC<PionCastleProps> = (p) => {
  const frame = useCurrentFrame();
  const [z, ox, oy, rollDeg] = camAt(p.cam, frame);
  const { width: W, height: H, sceneW: SW, sceneH: SH } = p;
  const th = (rollDeg * Math.PI) / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  // cover the frame after the dutch tilt (no black corners): scene and frame share the aspect ratio
  const cover = Math.max(c + (H / W) * s, c + (W / H) * s);
  const S = (W / SW) * z * cover;
  // camera centre: from the frame centre toward the face as we zoom, plus the mood's corner offset
  const a = clamp((1 - 1 / z) / (1 - 1 / 1.5), 0, 1.2) * 0.9;
  let cx = lerp(SW / 2, p.focus[0], a) + ox * SW;
  let cy = lerp(SH / 2, p.focus[1], a) + oy * SH;
  const hw = (W / 2) / S, hh = (H / 2) / S, bx = hw * c + hh * s, by = hw * s + hh * c;
  cx = clamp(cx, bx, SW - bx);
  cy = clamp(cy, by, SH - by);
  const src = staticFile(`scene/${String(Math.round(frame)).padStart(5, "0")}.jpg`);
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, width: SW, height: SH, transformOrigin: "0 0",
        transform: `translate(${W / 2}px, ${H / 2}px) rotate(${rollDeg}deg) scale(${S}) translate(${-cx}px, ${-cy}px)`,
      }}>
        <Img src={src} style={{ width: SW, height: SH, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

export const PionCastle: React.FC<PionCastleProps> = (p) => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    {p.camBlur > 1 ? (
      <CameraMotionBlur shutterAngle={270} samples={p.camBlur}>
        <Scene {...p} />
      </CameraMotionBlur>
    ) : (
      <Scene {...p} />
    )}
    {/* gentle vignette */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)" }} />
    {p.callouts && p.callouts.length ? <Callouts items={p.callouts} /> : null}
    {p.audio ? <Audio src={staticFile(p.audio)} /> : null}
  </AbsoluteFill>
);
