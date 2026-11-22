// Scene 5 outside (21.00 - 27.95 s, frames 1260-1677): "I tracked down the apartment and discovered it had once belonged to a man named
// Daniel Cross who had disappeared five years earlier."  fly down the wet street at dusk to No. 77 and Pion; tilt up to the boarded 7B window;
// "Daniel Cross" -> the MISSING poster on the lamp post beside Pion; "five years earlier" -> push into the poster; then into the door.
const { cam, key } = require("./lib.js");
const FZ = -4.9, F0 = 1260, PA = [1.15, 0.15, FZ + 1.35];
const K = [
  { t: 21.0, pos: [-9.0, 4.6, 3.2], tgt: [-3.0, 2.6, FZ], fov: 58, focus: 9 },
  { t: 22.35, pos: [-4.6, 2.6, 2.6], tgt: [0.2, 2.0, FZ], fov: 56, focus: 7, ease: "io" },                 // "the apartment": No. 77, neon, Pion on the sidewalk
  { t: 23.1, pos: [-4.2, 2.5, 2.3], tgt: [0.3, 2.1, FZ], fov: 56, focus: 6.6, ease: "lin" },
  { t: 23.75, pos: [-1.6, 1.3, 0.2], tgt: [0.75, 5.7, FZ], fov: 54, focus: 6, ease: "io" },                 // "belonged to a man": up to the boarded window of 7B
  { t: 24.4, pos: [-1.45, 1.3, 0.05], tgt: [0.75, 5.75, FZ], fov: 54, focus: 6, ease: "lin" },
  { t: 25.0, pos: [1.58, 1.22, FZ + 4.4], tgt: [1.55, 0.95, FZ + 1.1], fov: 50, focus: 3.2, ease: "io" },     // "Daniel Cross": the poster with Pion beside it
  { t: 25.9, pos: [1.6, 1.22, FZ + 4.2], tgt: [1.56, 0.95, FZ + 1.1], fov: 50, focus: 3.05, ease: "lin" },
  { t: 26.5, pos: [2.15, 1.2, FZ + 2.1], tgt: [1.95, 1.18, FZ + 0.97], fov: 42, focus: 1.15, ease: "io" },   // "disappeared five years earlier": push into the poster
  { t: 27.3, pos: [2.12, 1.2, FZ + 1.95], tgt: [1.95, 1.18, FZ + 0.97], fov: 42, focus: 1.0, ease: "lin" },
  { t: 27.95, pos: [-0.6, 1.25, FZ + 1.0], tgt: [-0.6, 1.2, FZ - 1.0], fov: 50, focus: 0.9, ease: "in" },     // whip into the door (dissolve into apartment B)
];
module.exports = { N: 1678, F0, set: "exterior", K, frame(f) { const t = f / 60;
  return { t, cam: cam(K, t), pions: [{ eng: process.env.ENG || "s5", ef: f - F0, anchor: PA, height: 1.15, tint: [1.0, 0.88, 0.92], shadow: [0.9, 0.45] }] }; } };
