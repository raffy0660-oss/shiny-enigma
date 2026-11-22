// Scene 10 inside the photo again, apartment A (50.30 - 54.40 s, frames 3018-3264): "Someone was standing behind the camera."
// The clock face, very slow push; the reflection in the cracked glass fades up: a silhouette with a crown holding a camera; flash on "the camera".
const { cam, key } = require("./lib.js");
const F0 = 3018, C = [0.6124, 0.1578, -0.2831], N = [-0.3894, 0.7492, 0.5358], at = (d) => C.map((v, i) => v + N[i] * d);
const ROLL = +(process.env.ROLL || 0.66);
const K = [
  { t: 50.3, pos: at(0.75), tgt: C, fov: 40, focus: 0.75, roll: ROLL, aperture: 0.0008 },
  { t: 51.9, pos: at(0.62), tgt: C, fov: 40, focus: 0.62, roll: ROLL, aperture: 0.0008, ease: "lin" },
  { t: 54.4, pos: at(0.45), tgt: C, fov: 40, focus: 0.45, roll: ROLL, aperture: 0.0008, ease: "lin" },   // very slow push into the reflection
];
const daniel = (f) => ({ eng: "dan_ko", ef: f % 120, anchor: [0.2, 0.1, -0.5], height: 1.15, face: true, roll: Math.PI / 2, shadow: [1.2, 0.5, -0.45, 0], tint: [1, 0.96, 0.88] });
module.exports = { N: 3265, F0, set: "apartment", K, frame(f) { const t = f / 60, fl = t > 53.48 && t < 53.9;
  return { t, ver: "A", cam: cam(K, t), clockGlow: 0.35, bulbK: 0.8, refl: { url: fl ? "/scene/tex/refl_flash.png" : "/scene/tex/refl.png", k: key([[50.5, 0], [51.3, 0.55], [53.4, 0.9, "lin"]], t) },
    flash: key([[53.48, 0], [53.56, 0.75, "lin"], [53.95, 0, "out"]], t), pions: [daniel(f)] }; } };
