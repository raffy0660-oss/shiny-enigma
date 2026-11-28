// Scene 1 (0-5 s): "I solved a murder three days before the victim was even killed."
const BACK = -2.6, DZ = -0.95;
const K = [   // camera keys: ease "io" = a fly move (sine in-out, ~0.6 s), "lin" = slow drift between moves. The case data sits on the desk under the lamp.
  { t: 0.0, pos: [0.05, 1.38, 1.05], tgt: [0, 1.4, -1.4], fov: 40, focus: 2.4 },
  { t: 1.0, pos: [0.04, 1.37, 0.88], tgt: [0, 1.39, -1.4], fov: 40, focus: 2.25, ease: "lin" },
  { t: 1.62, pos: [0.66, 1.0, 0.08], tgt: [0.34, 0.96, -0.95], fov: 46, focus: 0.82, ease: "io" },     // "three days" -> desk calendar FRIDAY 14, Pion behind it
  { t: 2.4, pos: [0.64, 0.99, -0.02], tgt: [0.34, 0.96, -0.95], fov: 45, focus: 0.74, ease: "lin" },
  { t: 3.0, pos: [0.0, 1.17, 0.12], tgt: [0.0, 0.92, -0.9], fov: 50, focus: 0.8, ease: "io" },      // "victim ... killed" -> the photo on the desk, Pion looking down at it
  { t: 4.3, pos: [0.0, 1.15, 0.0], tgt: [0.0, 0.92, -0.9], fov: 50, focus: 0.72, ease: "lin" },
  { t: 5.0, pos: [0.12, 1.42, 1.15], tgt: [0, 1.4, -1.4], fov: 42, focus: 2.5, ease: "io" },          // "It all started" -> back on Pion
];
const lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function cam(t) { let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const a = K[i], b = K[i + 1]; let k = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  if (b.ease === "io") k = 0.5 - 0.5 * Math.cos(Math.PI * k); return { pos: L3(a.pos, b.pos, k), tgt: L3(a.tgt, b.tgt, k), fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus, b.focus, k) }; }
function lamp(t) { if (t < 0.12) return 0; if (t < 0.16) return 1; if (t < 0.22) return 0.08; if (t < 0.27) return 1; if (t < 0.31) return 0.3; return 1; }   // click, stutter, on
module.exports = { N: 300, frame(f) { const t = f / 60, L = lamp(t);
  return { t, cam: cam(t), mood: "normal", lampK: L, pion: { eng: process.env.ENG || "t5b", anchor: [0, 0.48, DZ - 0.42], height: 1.15, tint: L3([0.22, 0.27, 0.42], [1.0, 0.94, 0.84], L) } }; } };
