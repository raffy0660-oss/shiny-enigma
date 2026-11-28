// preview stills of the museum set v2 + the thief rig (key poses of the reference move), Pion from an existing engine segment for scale
const cam = (pos, tgt, fov, o) => Object.assign({ pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]) }, o || {});
const MZ = -3.4, PI = Math.PI, PION = (x, z, o) => Object.assign({ eng: "pH3", ef: 120, height: 1.03, preset: "detective", tint: [1, 0.97, 0.92], anchor: [x, 0, z] }, o);
const UP = { handL: [-0.06, 0.55, 0.13], handR: [0.06, 0.78, 0.13] };
const S = [
  { loc: "gallery", mood: "heist", thief: { pos: [0, 2.75, -2.68], yaw: PI + 0.3, pitch: 0, ...UP, tail: 0.7 }, cam: cam([1.45, 0.75, 0.4], [0, 2.1, -3.0], 56) },
  { loc: "gallery", mood: "heist", thief: { pos: [0, 2.35, -2.62], yaw: PI, pitch: -1.45, handL: [-0.08, 0.5, 0.1], handR: [0.08, 0.62, 0.1], tail: 0.6 }, cam: cam([1.9, 1.5, -0.9], [0, 2.1, -2.9], 50) },
  { loc: "gallery", mood: "heist", glass: "broken", shatter: 0.22, thief: { pos: [0, 1.92, -2.78], yaw: 0, pitch: -PI, handL: [-0.16, 0.3, 0.22], handR: [0.04, 0.36, 0.42], tail: 0.5 }, cam: cam([1.3, 1.25, -1.5], [0, 1.6, -3.1], 48) },
  { loc: "gallery", mood: "heist", glass: "broken", thief: { pos: [0, 1.92, -2.78], yaw: 0, pitch: -PI, grip: 1, panelK: 0.55, tail: 0.5 }, cam: cam([-1.2, 1.1, -1.4], [0, 1.6, -3.1], 48) },
  { loc: "gallery", mood: "heist", cam: cam([0.0, 1.7, 3.2], [0, 1.6, -3.6], 60) },
  { loc: "gallery", mood: "day", painting: false, tape: true, ropeDown: true, fabric: true, pions: [PION(0.55, -1.3)], key: { at: [0.55, 0.6, -1.3], from: [0.8, 1.9, 1.4], col: 0xffe2b0, k: 7 }, cam: cam([1.9, 1.35, 1.6], [0.1, 1.15, -2.6], 48) },
  { loc: "gallery", mood: "day", cam: cam([-1.6, 1.55, -2.4], [1.2, 2.0, 3.2], 60) },
  { loc: "gallery", mood: "night", cam: cam([0.4, 1.48, -1.8], [0, 1.45, MZ], 34) },
  { loc: "gallery", mood: "day", painting: false, fabric: true, hookLight: 1, cam: cam([0.35, 3.5, -1.95], [0, 4.25, -2.65], 40) },
  { loc: "corridor", hatch: 1, prints: 1, hatchBeam: true, camsOn: false, cam: cam([30.55, 1.45, 2.6], [30.1, 0.6, -1.6], 50) },
];
module.exports = { N: S.length, set: "museum", frame(f) { return Object.assign({ t: f * 0.1, set: "museum" }, S[f]); } };
