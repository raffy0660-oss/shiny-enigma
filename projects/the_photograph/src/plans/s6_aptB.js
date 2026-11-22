// Scene 6 in apartment B (27.90 - 34.05 s, frames 1674-2043): "I searched the entire apartment but found nothing.
// No body, no blood, not even a single fingerprint."  Pion hops in from the door with his magnifier through the god rays; three fast moves,
// one per "no": the empty floor where the body lay, the clean rug, the door knob. Tension: the blue rises, the sun weakens.
const { cam, key, L3 } = require("./lib.js");
const F0 = 1674;
const K = [
  { t: 27.9, pos: [-0.9, 1.55, 1.65], tgt: [0.7, 0.55, -0.8], fov: 64, focus: 2.6 },
  { t: 29.2, pos: [-0.75, 1.45, 1.45], tgt: [0.6, 0.55, -0.8], fov: 62, focus: 2.4, ease: "lin" },          // "searched the entire apartment"
  { t: 29.85, pos: [1.2, 0.85, 0.95], tgt: [0.2, 0.62, -0.6], fov: 50, focus: 1.85, ease: "io" },          // "but found nothing": Pion in the god rays
  { t: 30.75, pos: [1.12, 0.84, 0.86], tgt: [0.2, 0.62, -0.6], fov: 50, focus: 1.75, ease: "lin" },
  { t: 31.15, pos: [-0.15, 0.92, 0.55], tgt: [-0.3, 0.4, -0.7], fov: 56, focus: 1.35, ease: "io" },         // "No body": the empty floor
  { t: 31.6, pos: [-0.15, 0.91, 0.5], tgt: [-0.3, 0.4, -0.7], fov: 56, focus: 1.3, ease: "lin" },
  { t: 32.0, pos: [0.05, 0.95, 0.65], tgt: [-0.75, 0.4, -0.6], fov: 56, focus: 1.5, ease: "io" },          // "no blood": the clean rug
  { t: 32.4, pos: [0.03, 0.94, 0.6], tgt: [-0.75, 0.4, -0.6], fov: 56, focus: 1.45, ease: "lin" },
  { t: 33.0, pos: [0.5, 0.88, 0.55], tgt: [1.15, 0.62, -0.62], fov: 48, focus: 1.35, ease: "io" },          // "a single fingerprint": the door knob
  { t: 34.05, pos: [0.56, 0.87, 0.45], tgt: [1.15, 0.62, -0.62], fov: 48, focus: 1.25, ease: "lin" },
];
// Pion's path (hops between stops)
const P = [[27.9, [1.95, 0, -0.3]], [29.1, [0.3, 0, -0.45]], [30.85, [0.3, 0, -0.45]], [31.2, [-0.25, 0, -1.05]], [31.65, [-0.25, 0, -1.05]], [32.05, [-0.85, 0, -0.95]], [32.45, [-0.85, 0, -0.95]], [33.0, [1.0, 0, -0.92]]];
// physical hops: n parabolic hops per move (gravity g, apex from the flight time), crouch before take-off, squash on every landing, dust puffs
const G = 9.8, HOP = 0.6;   // real gravity; one hop per ~0.6 m (apex = g T^2 / 8, ~0.2 m for a 0.4 s hop)
function pion(t) { let i = 0; while (i < P.length - 2 && t > P[i + 1][0]) i++; const [t0, a] = P[i], [t1, b] = P[i + 1];
  const dist = Math.hypot(b[0] - a[0], b[2] - a[2]), moving = dist > 1e-3, n = Math.max(1, Math.round(dist / HOP)), T = (t1 - t0) / n;
  let p = a.slice(), lift = 0, squash = 1; const puffs = [];
  if (moving && t >= t0 && t <= t1) { const u = (t - t0) / (t1 - t0); p = [a[0] + (b[0] - a[0]) * u, 0, a[2] + (b[2] - a[2]) * u];
    const h = (t - t0) % T; lift = 0.5 * G * h * (T - h); p[1] = lift;                       // y = g/2 * h (T - h): apex g T^2 / 8
    const near = Math.min(h, T - h); if (near < 0.05) squash = 0.86 + 0.14 * near / 0.05; }   // squash at each contact
  if (!moving && t >= t0) p = a.slice();
  // landings so far (for puffs + the after-landing squash)
  for (let j = 0; j < P.length - 1; j++) { const [s0, A0] = P[j], [s1, B0] = P[j + 1], d = Math.hypot(B0[0] - A0[0], B0[2] - A0[2]); if (d < 1e-3) continue;
    const m = Math.max(1, Math.round(d / HOP)), TT = (s1 - s0) / m; for (let q = 1; q <= m; q++) { const tl = s0 + q * TT, age = t - tl; if (age >= 0 && age < 0.7) { const v = q / m; puffs.push({ p: [A0[0] + (B0[0] - A0[0]) * v, 0, A0[2] + (B0[2] - A0[2]) * v], age }); }
      if (age >= 0 && age < 0.12) squash = Math.min(squash, 0.84 + 0.16 * age / 0.12); } }
  const next = P.find(x => x[0] > t); if (next && moving === false) { const dt = next[0] - t; const i2 = P.indexOf(next); if (i2 > 0 && Math.hypot(next[1][0] - p[0], next[1][2] - p[2]) > 1e-3 && dt < 0.12) squash = Math.min(squash, 0.9 + 0.1 * dt / 0.12); }   // crouch before take-off
  return { p, lift, squash, puffs }; }
module.exports = { N: 2044, F0, set: "apartment", K, frame(f) { const t = f / 60, k = key([[27.9, 0], [34.05, 1, "lin"]], t), H = pion(t);
  return { t, ver: "B", cam: cam(K, t), pts: { floor: [-0.3, 0.05, -0.55], rug: [-0.72, 0.05, -0.45], knob: [1.34, 0.72, -0.5] }, blueK: 0.65 * k, sunK: 1 - 0.45 * k, beamK: 1 - 0.4 * k, tint: L3([-0.01, 0, 0.03], [-0.03, 0, 0.09], k), vig: 0.48 + 0.14 * k,
    puffs: H.puffs, pions: [{ eng: process.env.ENG || "s6", ef: f - F0, anchor: H.p, lift: H.lift, squash: H.squash, height: 1.15, tint: L3([1, 0.96, 0.88], [0.82, 0.88, 1.0], k), shadow: [0.9, 0.45] }] }; } };
