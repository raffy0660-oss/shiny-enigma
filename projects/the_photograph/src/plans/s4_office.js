// Scene 4 in the office (15.40 - 21.10 s, frames 924-1266): out of the photo (top-down), the photo lifts and flips into Pion's hands,
// "On the back of the photograph, someone had written five words" -> push to the sheet; "Find him before Friday." close on the handwriting,
// lamp flickers once + lightning on "Friday".
const { cam, key, L3 } = require("./lib.js");
const DZ = -0.95, PZ = DZ - 0.42, PH = 0.831, PHZ = -0.73, F0 = 924;
const K = [
  { t: 15.4, pos: [0, PH + 0.44, PHZ + 0.004], tgt: [0, PH, PHZ], fov: 40, focus: 0.44 },
  { t: 16.25, pos: [0.05, 1.25, 0.55], tgt: [0, 1.05, -1.4], fov: 42, focus: 1.95, ease: "io" },              // pull out + tilt up: Pion holding the photo
  { t: 17.5, pos: [0.04, 1.23, 0.42], tgt: [0, 1.04, -1.4], fov: 42, focus: 1.82, ease: "lin" },
  { t: 18.1, pos: [0.02, 1.08, -0.15], tgt: [0, 1.0, -1.4], fov: 40, focus: 1.2, ease: "io" },                // "five words" -> the sheet + his face
  { t: 19.2, pos: [0.02, 1.07, -0.22], tgt: [0, 1.0, -1.4], fov: 40, focus: 1.13, ease: "lin" },
  { t: 19.75, pos: [0.0, 1.0, -0.5], tgt: [0, 0.98, -1.4], fov: 38, focus: 0.86, ease: "io" },               // "Find him before Friday." the handwriting fills the frame
  { t: 21.1, pos: [0.0, 1.0, -0.6], tgt: [0, 0.98, -1.4], fov: 38, focus: 0.76, ease: "lin" },
];
function lamp(t) { const d = t - 20.1; if (d < 0 || d > 0.4) return 1; return d < 0.06 ? 0.1 : d < 0.12 ? 1 : d < 0.2 ? 0.15 : d < 0.26 ? 0.8 : 1; }
module.exports = { N: 1267, F0, set: "office", K, frame(f) { const t = f / 60, L = lamp(t);
  let anon; const u = key([[15.72, 0], [16.02, 1, "in"]], t);   // the photo lifts off the desk and flips towards Pion's hands
  if (t > 15.72) anon = { p: L3([0, PH - 0.003, PHZ], [0, 0.98, PZ + 0.32], u), rx: -Math.PI * u, ry: 0 };
  return { t, cam: cam(K, t), mood: "normal", lampK: L, anon, anonVis: t < 16.02, strike: Math.abs(t - 20.12) < 0.06,
    pion: { eng: process.env.ENG || "s4", ef: f - F0, anchor: [0, 0.48, PZ], height: 1.15, tint: L3([0.22, 0.27, 0.42], [1.0, 0.94, 0.84], L) } }; } };
