// Scenes 2 (end) - 3 inside the photograph: apartment version A (8.20 - 15.40 s, frames 492-924).
// Starts on the photo camera C0 zoomed so it matches the photo filling the frame in s12_office (dissolve 8.2-8.5), keeps pushing in,
// "abandoned apartment" -> lifts to show the boarded window / cobwebs; "Beside his body was a broken clock" -> down to Daniel + clock;
// "frozen at exactly 11:42" -> pushes into the clock face, which starts to glow.
const { cam, key } = require("./lib.js");
const C0 = require("./photo_still.js").C0, f0 = 2 * Math.atan(Math.tan(C0.fov * Math.PI / 360) / (1920 / 1440)) * 180 / Math.PI;   // photo = centre 3:4 crop
const D = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const K = [
  { t: 8.2, pos: C0.pos, tgt: C0.tgt, fov: f0, focus: 1.9, aperture: 0.0008 },
  { t: 9.0, pos: D(C0.pos, C0.tgt, 0.12), tgt: C0.tgt, fov: f0 - 3, focus: 1.7, ease: "lin" },
  { t: 9.62, pos: [1.0, 1.72, 1.0], tgt: [-1.3, 1.15, -1.3], fov: 62, focus: 2.6, ease: "io" },                // "abandoned apartment": boarded window, cobweb, sofa
  { t: 10.6, pos: [0.92, 1.7, 0.86], tgt: [-1.3, 1.1, -1.3], fov: 62, focus: 2.5, ease: "lin" },
  { t: 11.2, pos: [1.0, 0.88, 0.55], tgt: [0.05, 0.14, -0.45], fov: 50, focus: 1.25, ease: "io" },           // "Beside his body" -> Daniel + the clock
  { t: 11.7, pos: [0.98, 0.85, 0.48], tgt: [0.1, 0.14, -0.43], fov: 50, focus: 1.2, ease: "lin" },
  { t: 12.3, pos: [0.43, 0.88, 0.2], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.95, ease: "io" },             // "broken clock"
  { t: 13.0, pos: [0.45, 0.84, 0.16], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.9, ease: "lin" },
  { t: 13.62, pos: [0.52, 0.6, 0.0], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.6, ease: "io" },              // "frozen at exactly 11:42" -> the face
  { t: 15.4, pos: [0.535, 0.55, -0.04], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.55, ease: "lin" },
];
const daniel = (f) => ({ eng: process.env.DAN || "dan_ko", ef: f % 120, anchor: [0.2, 0.1, -0.5], height: 1.15, face: true, roll: Math.PI / 2, shadow: [1.2, 0.5, -0.45, 0], tint: [1, 0.96, 0.88] });
module.exports = { N: 925, F0: 492, set: "apartment", K, frame(f) { const t = f / 60;
  return { t, ver: "A", cam: cam(K, t), clockGlow: key([[12.9, 0], [13.7, 1.0], [15.4, 1.15, "lin"]], t), pions: [daniel(f)] }; } };
