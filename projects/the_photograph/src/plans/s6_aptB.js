// Scene 6 in apartment B (27.90 - 34.05 s, frames 1674-2043): "I searched the entire apartment but found nothing.
// No body, no blood, not even a single fingerprint."  Pion hops in from the door with his magnifier through the god rays; three fast moves,
// one per "no": the empty floor where the body lay, the clean rug, the door knob. Tension: the blue rises, the sun weakens.
const { cam, key, L3 } = require("./lib.js");
const F0 = 1674;
const K = [
  { t: 27.9, pos: [1.6, 1.55, 1.65], tgt: [0.0, 0.55, -0.9], fov: 64, focus: 2.4 },
  { t: 29.2, pos: [1.35, 1.45, 1.45], tgt: [0.0, 0.55, -0.9], fov: 62, focus: 2.2, ease: "lin" },          // "searched the entire apartment"
  { t: 29.85, pos: [0.95, 0.72, 0.55], tgt: [0.15, 0.72, -0.6], fov: 48, focus: 1.35, ease: "io" },          // "but found nothing": Pion in the god rays
  { t: 30.75, pos: [0.9, 0.72, 0.5], tgt: [0.15, 0.7, -0.6], fov: 48, focus: 1.3, ease: "lin" },
  { t: 31.15, pos: [-0.15, 0.95, 0.4], tgt: [-0.35, 0.05, -0.55], fov: 48, focus: 1.1, ease: "io" },         // "No body": the empty floor
  { t: 31.6, pos: [-0.15, 0.93, 0.36], tgt: [-0.35, 0.05, -0.56], fov: 48, focus: 1.05, ease: "lin" },
  { t: 32.0, pos: [0.25, 0.95, 0.15], tgt: [-0.75, 0.1, -0.95], fov: 48, focus: 1.35, ease: "io" },          // "no blood": the clean rug
  { t: 32.4, pos: [0.22, 0.93, 0.12], tgt: [-0.75, 0.1, -0.95], fov: 48, focus: 1.3, ease: "lin" },
  { t: 33.0, pos: [0.72, 0.9, 0.55], tgt: [1.2, 0.7, -0.55], fov: 42, focus: 1.2, ease: "io" },          // "a single fingerprint": the door knob
  { t: 34.05, pos: [0.8, 0.88, 0.42], tgt: [1.22, 0.7, -0.55], fov: 42, focus: 1.08, ease: "lin" },
];
// Pion's path (hops between stops)
const P = [[27.9, [1.95, 0, -0.3]], [29.1, [0.3, 0, -0.45]], [30.85, [0.3, 0, -0.45]], [31.2, [-0.05, 0, -0.35]], [31.65, [-0.05, 0, -0.35]], [32.05, [-0.45, 0, -0.65]], [32.45, [-0.45, 0, -0.65]], [33.0, [0.95, 0, -0.7]]];
function pion(t) { let i = 0; while (i < P.length - 2 && t > P[i + 1][0]) i++; const [t0, a] = P[i], [t1, b] = P[i + 1]; const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const moving = u > 0 && u < 1 && (a[0] !== b[0] || a[2] !== b[2]), n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.35));
  const p = L3(a, b, u); if (moving) p[1] = Math.abs(Math.sin(Math.PI * n * u)) * 0.16; return p; }
module.exports = { N: 2044, F0, set: "apartment", K, frame(f) { const t = f / 60, k = key([[27.9, 0], [34.05, 1, "lin"]], t);
  return { t, ver: "B", cam: cam(K, t), blueK: 0.65 * k, sunK: 1 - 0.45 * k, beamK: 1 - 0.4 * k, tint: L3([-0.01, 0, 0.03], [-0.03, 0, 0.09], k), vig: 0.48 + 0.14 * k,
    pions: [{ eng: process.env.ENG || "s6", ef: f - F0, anchor: pion(t), height: 1.15, tint: L3([1, 0.96, 0.88], [0.82, 0.88, 1.0], k), shadow: [0.9, 0.45] }] }; } };
