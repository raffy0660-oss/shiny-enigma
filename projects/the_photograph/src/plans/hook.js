// Scene 1 (0-5 s): "I solved a murder three days before the victim was even killed."
const BACK = -2.6, DZ = -0.95;
const K = [   // camera keys: ease "io" = a fly move (sine in-out, ~0.6 s), "lin" = slow drift between moves
  { t: 0.0, pos: [0.06, 1.42, 1.25], tgt: [0, 1.52, -1.4], fov: 40, focus: 2.6 },
  { t: 1.0, pos: [0.05, 1.41, 1.05], tgt: [0, 1.5, -1.4], fov: 40, focus: 2.4, ease: "lin" },
  { t: 1.62, pos: [-0.6, 1.72, -1.15], tgt: [-0.68, 1.74, BACK], fov: 40, focus: 1.45, ease: "io" },   // "three days" -> calendar FRIDAY
  { t: 2.4, pos: [-0.62, 1.73, -1.3], tgt: [-0.68, 1.74, BACK], fov: 40, focus: 1.3, ease: "lin" },
  { t: 3.0, pos: [-0.78, 2.25, -1.75], tgt: [-0.81, 2.32, BACK], fov: 40, focus: 0.85, ease: "io" },  // "victim ... killed" -> the photo
  { t: 4.3, pos: [-0.79, 2.27, -1.95], tgt: [-0.81, 2.32, BACK], fov: 40, focus: 0.65, ease: "lin" },
  { t: 5.0, pos: [0.15, 1.5, 1.35], tgt: [0, 1.42, -1.5], fov: 44, focus: 2.8, ease: "io" },            // "It all started" -> back to the room
];
const lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function cam(t) { let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const a = K[i], b = K[i + 1]; let k = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  if (b.ease === "io") k = 0.5 - 0.5 * Math.cos(Math.PI * k); return { pos: L3(a.pos, b.pos, k), tgt: L3(a.tgt, b.tgt, k), fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus, b.focus, k) }; }
function lamp(t) { if (t < 0.12) return 0; if (t < 0.16) return 1; if (t < 0.22) return 0.08; if (t < 0.27) return 1; if (t < 0.31) return 0.3; return 1; }   // click, stutter, on
module.exports = { N: 300, frame(f) { const t = f / 60, L = lamp(t);
  return { t, cam: cam(t), mood: "normal", lampK: L, pion: { eng: "t5", anchor: [0, 0.48, DZ - 0.42], height: 1.15, tint: L3([0.22, 0.27, 0.42], [1.0, 0.94, 0.84], L) } }; } };
