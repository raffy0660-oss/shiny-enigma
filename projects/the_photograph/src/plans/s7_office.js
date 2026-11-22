// Scene 7 in the office (34.00 - 36.20 s, frames 2040-2172): "Then Friday arrived."  the light breaks to CONFLICT exactly on "Then" (34.46):
// lightning, the THURSDAY page tears off the desk calendar -> FRIDAY 14; Pion behind it in shock; white lightning flash into the crime scene.
const { cam, key, L3 } = require("./lib.js");
const DZ = -0.95, PZ = DZ - 0.42, F0 = 2040;
const K = [
  { t: 34.0, pos: [0.98, 1.03, 0.08], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.9 },
  { t: 34.46, pos: [0.96, 1.02, 0.0], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.86, ease: "lin" },
  { t: 34.62, pos: [0.82, 1.0, -0.28], tgt: [0.5, 0.96, -0.82], fov: 44, focus: 0.6, ease: "out" },     // snap in on the tear
  { t: 35.3, pos: [0.8, 1.0, -0.3], tgt: [0.48, 0.97, -0.82], fov: 44, focus: 0.58, ease: "lin" },
  { t: 35.85, pos: [0.08, 1.2, 0.35], tgt: [0, 1.15, -1.4], fov: 40, focus: 1.7, ease: "io" },          // "arrived": Pion's face in the storm light
  { t: 36.2, pos: [0.06, 1.2, 0.2], tgt: [0, 1.16, -1.4], fov: 40, focus: 1.55, ease: "lin" },
];
module.exports = { N: 2173, F0, set: "office", K, frame(f) { const t = f / 60, c = t >= 34.46;
  return { t, cam: cam(K, t), mood: c ? "conflict" : "tension", strike: Math.abs(t - 34.48) < 0.05 || Math.abs(t - 34.62) < 0.04 || t > 36.02, calTear: key([[34.5, 0], [34.9, 1, "in"]], t),
    pion: { eng: process.env.ENG || "s7", ef: f - F0, anchor: [0, 0.48, PZ], height: 1.15, tint: c ? [0.62, 0.68, 1.0] : [0.8, 0.84, 1.0] } }; } };
