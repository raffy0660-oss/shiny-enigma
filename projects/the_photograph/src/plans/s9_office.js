// Scene 9 in the office (45.40 - 50.50 s, frames 2724-3030): "I went back to the photograph, examining every detail. That's when I noticed
// a reflection in the clock's glass."  TENSION light (lamp stutters, blue up). Pion with the magnifier over the photo; a magnifying glass slides
// over the clock in the photo and the camera dives straight down through its lens (dissolve into apartment A's clock at ~50.4).
const { cam, key, L3 } = require("./lib.js");
const DZ = -0.95, PZ = DZ - 0.42, PH = 0.831, F0 = 2724, CK = [0.083, PH, -0.685];   // the clock inside the photo
const K = [
  { t: 45.4, pos: [0.1, 1.24, 0.62], tgt: [0, 1.05, -1.4], fov: 42, focus: 2.0 },
  { t: 46.15, pos: [0.08, 1.23, 0.5], tgt: [0, 1.05, -1.4], fov: 42, focus: 1.9, ease: "lin" },
  { t: 46.8, pos: [0.06, 1.36, 0.1], tgt: [-0.04, 0.95, -0.95], fov: 50, focus: 0.9, ease: "io" },      // "the photograph": photo + Pion
  { t: 48.6, pos: [0.05, 1.33, -0.02], tgt: [-0.02, 0.94, -0.95], fov: 50, focus: 0.82, ease: "lin" },
  { t: 49.75, pos: [CK[0], PH + 0.3, CK[2] + 0.004], tgt: CK, fov: 40, focus: 0.3, ease: "io" },        // "a reflection": over the magnifier
  { t: 50.5, pos: [CK[0], PH + 0.1, CK[2] + 0.004], tgt: CK, fov: 40, focus: 0.1, ease: "in" },          // through the lens
];
module.exports = { N: 3031, F0, set: "office", K, frame(f) { const t = f / 60;
  const mp = key([[48.45, [0.5, 0.97, -0.55]], [49.2, [CK[0] + 0.0, 0.9, CK[2]], "out"]], t);
  return { t, cam: cam(K, t), mood: "normal", mood2: "tension", moodK: key([[45.4, 0.6], [46.5, 1, "io"]], t), mag: t > 48.45 ? { p: mp, rx: 0 } : undefined,
    pion: { eng: process.env.ENG || "s9", ef: f - F0, anchor: [0, 0.48, PZ], height: 1.15, tint: [0.85, 0.86, 1.0] } }; } };
