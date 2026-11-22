// SAMPLE (~16.6 s) for approval: hook (shots 1A-1B) | rising tension (3C-3F) | payoff (7C-7G). Times = SAMPLE seconds.
// VO cut list (original VO times): 0.00-4.80 -> 0.00 | 22.10-27.62 -> 4.80 | 58.00-60.25 -> 10.32 | (0.60 s silence) | 63.40-66.19 -> 13.17
//   words (sample time): "dead" 3.34, "apartment" 4.04 | "liked" 6.06, "Again" 7.74, "Again" 8.64, "And AGAIN" 9.50 / 9.60 | "locked" 11.50 | "exactly" 14.01
const { cam, key, lerp, clamp } = require("./lib.js");
const N = 996, FPS = 60;
const look = (t, pos, tgt, fov, ease, extra) => Object.assign({ t, pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), ease }, extra || {});
// ---- phones (positions as in mlike.js): profile picture point in world space
const PH = [[30, -0.35], [33, 0.5], [36, 0.2], [39, -0.8]].map(([x, ry]) => { const lx = -0.0338, lz = 0.0577; return { c: [x, 0.013, 0], pfp: [x + lx * Math.cos(ry) + lz * Math.sin(ry), 0.014, -lx * Math.sin(ry) + lz * Math.cos(ry)], ry }; });
const P = (i, dx, dy, dz) => [PH[i].pfp[0] + dx, PH[i].pfp[1] + dy, PH[i].pfp[2] + dz];
const SH = [   // shots: [t0, loc, camera keys]
  [0.0, "apt", [look(0.0, [-1.7, 1.55, 1.05], [1.15, 0.22, 0.2], 46), look(3.3, [-1.2, 1.38, 0.9], [1.15, 0.25, 0.2], 46, "lin"),   // behind her head, looking down her body to Pion at the wall
                look(4.8, [-0.45, 1.05, 1.45], [1.15, 0.3, 0.05], 46, "io")]],                                                    // he pushes off: side angle as he hops in
  [4.8, "phones", [look(4.8, [PH[0].c[0] - 0.04, 0.36, 0.2], PH[0].c, 40), look(6.0, [PH[0].c[0] - 0.035, 0.31, 0.17], PH[0].c, 40, "lin"),
                   look(7.74, P(0, -0.01, 0.13, 0.05), P(0, 0, 0, 0), 40, "io")]],
  [7.74, "phones", [look(7.74, P(1, 0.07, 0.15, 0.08), P(1, 0, 0, 0), 40, "io", { roll: 0.28 }), look(8.64, P(1, 0.05, 0.12, 0.06), P(1, 0, 0, 0), 40, "lin", { roll: 0.24 })]],
  [8.64, "phones", [look(8.64, P(2, 0, 0.24, 0.001), P(2, 0, 0, 0), 40, "io", { roll: 0.5 }), look(8.85, P(2, 0, 0.17, 0.001), P(2, 0, 0, 0), 40, "out", { roll: 0.0 }),
                    look(9.5, P(2, 0, 0.15, 0.001), P(2, 0, 0, 0), 40, "lin", { roll: -0.04 })]],
  [9.5, "phones", [look(9.5, P(3, -0.06, 0.1, 0.07), P(3, 0, 0, 0), 40, "io", { roll: -0.2 }), look(10.32, P(3, -0.03, 0.06, 0.035), P(3, 0, 0, 0), 40, "in", { roll: -0.24 })]],
  [10.32, "house", [look(10.32, [60.0, 0.72, 1.95], [60.0, 0.58, -0.6], 44), look(12.0, [60.0, 0.72, 1.7], [60.0, 0.6, -0.6], 44, "lin")]],
  [12.0, "house", [look(12.0, [60.02, 0.86, 0.72], [60.0, 0.82, -0.35], 34), look(13.17, [60.01, 0.86, 0.58], [60.0, 0.83, -0.35], 34, "lin")]],
  [13.17, "house", [look(13.17, [60.0, 0.75, 1.65], [60.0, 0.62, -1.45], 42), look(16.6, [60.0, 0.73, 1.2], [60.0, 0.64, -1.45], 42, "lin")]],
];
// impacts: [time, strength] -> decaying camera shake
const SHAKE = [[4.8, 0.5], [7.74, 1.0], [8.64, 1.0], [9.5, 1.2], [9.6, 1.4], [11.5, 1.6], [14.01, 0.5]];
function shake(t) { let x = 0, y = 0, r = 0; for (const [t0, s] of SHAKE) { const d = t - t0; if (d < 0 || d > 0.45) continue; const a = s * Math.exp(-d * 9);
  x += a * 0.012 * Math.sin(d * 97); y += a * 0.01 * Math.sin(d * 71 + 1); r += a * 0.02 * Math.sin(d * 53 + 2); } return { x, y, r }; }
// Pion in the apartment: leaning on the right wall, pushes off at "dead" (3.34), two hops toward the victim
function pionA(t) { const A0 = [1.72, 0, 0.12], A1 = [1.3, 0, -0.32]; let roll = -0.13, p = A0.slice(), lift = 0, squash = 1;
  if (t > 3.34) roll = -0.13 * (1 - clamp((t - 3.34) / 0.3));
  const h0 = 3.66, T = 0.46, n = 2;
  if (t > h0) { const k = Math.min(n, (t - h0) / T), q = Math.floor(Math.min(k, n - 1e-6)), h = (t - h0) - q * T;
    const u = clamp((t - h0) / (n * T)); p = [lerp(A0[0], A1[0], u), 0, lerp(A0[2], A1[2], u)];
    if (k < n) { lift = 0.5 * 9.81 * 0.55 * h * (T - h); squash = h < 0.05 ? 0.9 : 1; } else squash = (t - h0 - n * T) < 0.08 ? 0.88 : 1; }
  if (t > 3.34 && t < 3.5) squash = 0.92;   // the little push off the wall
  return { p: [p[0], lift, p[2]], lift, roll, squash }; }
function flash(t) { const f1 = t >= 14.01 ? Math.exp(-(t - 14.01) * 22) : 0, f2 = t >= 14.22 ? 0.55 * Math.exp(-(t - 14.22) * 26) : 0; return Math.min(1, f1 + f2); }
function door(t) { if (t < 11.42) return -1.2; const k = clamp((t - 11.42) / 0.1); return -1.2 * (1 - k * k); }   // swung open inward -> slams shut on "locked"
module.exports = { N, set: "mlike", SH, frame(f) {
  const t = f / FPS; let s = 0; while (s < SH.length - 1 && t >= SH[s + 1][0]) s++;
  const [t0, loc, K] = SH[s], c = cam(K, t), sk = shake(t);
  c.pos = [c.pos[0] + sk.x, c.pos[1] + sk.y, c.pos[2]]; c.roll = (c.roll || 0) + sk.r; c.aperture = loc === "phones" ? 0.004 : 0.0016;
  const F = { t, loc, cam: c, pions: [] };
  if (loc === "apt") { const A = pionA(t);
    F.pions = [{ eng: "pionA", ef: f, anchor: A.p, lift: A.lift, roll: A.roll, squash: A.squash, height: 1.15, preset: "detective", tint: [1, 0.97, 0.92] },
               { eng: "victim", ef: f, anchor: [0.78, 0, 0.36], ground: 0, height: 1.1, preset: "victim", facing: "faceCam", bodyDir: [0, -1], push: 0.35, tint: [1, 0.95, 0.95] }];   // victim: drawn LYING by the engine (`lie`) from this camera, body along -z
    F.puffs = t > 3.66 ? [0, 1, 2].map(q => ({ p: [lerp(1.72, 1.3, Math.min(1, q / 2)), 0, lerp(0.12, -0.32, Math.min(1, q / 2))], age: t - (3.66 + q * 0.46) })) : []; }
  if (loc === "house") { F.door = door(t); F.figure = s === 7; F.flash = flash(t); F.pkey = s < 7 ? 1 : 0;
    if (s < 7) F.pions = [{ eng: "pionC", ef: Math.round((t - 10.32) * FPS), anchor: [60, 0, -0.35], height: 1.15, preset: "detective", tint: [0.92, 0.95, 1.05] }]; }
  return F; } };
