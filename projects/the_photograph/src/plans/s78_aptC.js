// Scenes 7-8 in apartment C, Friday night (36.10 - 45.40 s, frames 2166-2724): "Police discovered a dead body inside that exact apartment.
// It was Daniel Cross. And beside him was the same broken clock, stopped at 11:42."  police strobes, tape, the police rook with a torch,
// Pion at the doorway behind the tape. 41.6-43.0: the camera sits exactly where the photo was taken (C0) so the photo can be laid over the scene.
const { cam, key } = require("./lib.js");
const C0 = require("./photo_still.js").C0, F0 = 2166;
const K = [
  { t: 36.1, pos: [1.25, 1.5, 1.6], tgt: [-0.1, 0.45, -0.8], fov: 64, focus: 2.4 },
  { t: 36.9, pos: [1.15, 1.45, 1.45], tgt: [-0.1, 0.45, -0.8], fov: 63, focus: 2.3, ease: "lin" },
  { t: 37.45, pos: [0.75, 0.95, 0.6], tgt: [0.15, 0.25, -0.6], fov: 50, focus: 1.3, ease: "io" },        // "dead body"
  { t: 38.05, pos: [0.72, 0.93, 0.55], tgt: [0.15, 0.25, -0.6], fov: 50, focus: 1.25, ease: "lin" },
  { t: 38.7, pos: [-1.6, 2.15, 1.5], tgt: [0.6, 0.4, -1.0], fov: 66, focus: 2.8, ease: "io" },           // "that exact apartment": the whole room + the doorway
  { t: 39.55, pos: [-1.5, 2.1, 1.4], tgt: [0.6, 0.4, -1.0], fov: 66, focus: 2.7, ease: "lin" },
  { t: 40.15, pos: [-0.25, 0.75, 0.25], tgt: [-0.4, 0.2, -0.5], fov: 44, focus: 0.85, ease: "io" },      // "Daniel Cross": his face
  { t: 41.05, pos: [-0.24, 0.73, 0.2], tgt: [-0.4, 0.2, -0.5], fov: 44, focus: 0.8, ease: "lin" },
  { t: 41.65, pos: C0.pos, tgt: C0.tgt, fov: C0.fov, focus: 1.9, ease: "io" },                          // the photo's exact viewpoint (overlay in assembly)
  { t: 43.15, pos: C0.pos, tgt: C0.tgt, fov: C0.fov - 1.5, focus: 1.9, ease: "lin" },
  { t: 43.95, pos: [0.47, 0.82, 0.17], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.9, ease: "io" },      // "stopped at 11:42": the clock
  { t: 45.4, pos: [0.5, 0.62, 0.02], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.62, ease: "lin" },
];
const daniel = (f) => ({ eng: "dan_ko", ef: f % 120, anchor: [0.2, 0.1, -0.5], height: 1.15, face: true, roll: Math.PI / 2, shadow: [1.2, 0.5, -0.45, 0], tint: [0.78, 0.8, 1.0] });
module.exports = { N: 2725, F0, set: "apartment", K, frame(f) { const t = f / 60, ph = Math.floor(t * 4) % 2;
  const tint = ph ? [1.0, 0.72, 0.78] : [0.72, 0.8, 1.05];
  return { t, ver: "C", cam: cam(K, t), flash: key([[36.1, 0.85], [36.35, 0, "out"]], t), torch: [[0.95, 1.0, -1.15], [0.0, 0.1, -0.5]],
    pions: [daniel(f), { eng: process.env.POL || "s8_police", ef: (f - F0) % 240, anchor: [0.95, 0, -1.1], height: 1.25, tint, shadow: [0.95, 0.5] },
            { eng: process.env.ENG || "s8", ef: f - F0, anchor: [2.02, 0, -0.22], height: 1.15, tint, shadow: [0.9, 0.45] }] }; } };
