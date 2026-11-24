// heist test clip (6 s @ 30 fps): the thief comes down the rope into the top light, leans back flat, turns over head-down (reference video),
// punches the glass, lifts the painting out, rights himself and is pulled back up. Dark hall, beams on.
const FPS = 30, N = 6 * FPS, PI = Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sm = k => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function keys(K, t) { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, a] = K[i - 1], [t1, b] = K[i], k = sm((t - t0) / (t1 - t0)); return Array.isArray(a) ? (Array.isArray(a[0]) ? a.map((v, j) => L3(v, b[j], k)) : L3(a, b, k)) : lerp(a, b, k); } return K[K.length - 1][1]; }
const POS = [[0, [0, 4.9, -2.68]], [1.4, [0, 2.6, -2.66]], [2.2, [0, 2.3, -2.62]], [2.9, [0, 1.92, -2.78]], [4.2, [0, 1.92, -2.78]], [5.0, [0, 2.15, -2.7]], [6.0, [0, 5.2, -2.68]]];
const PITCH = [[1.4, 0], [2.2, -1.5], [2.9, -PI], [4.2, -PI], [5.0, 0]], YAW = [[0, PI + 0.6], [1.4, PI], [2.2, PI], [2.9, -0.9], [4.2, -0.8], [5.0, -0.25]];
const HANDS = [[0, [[-0.06, 0.55, 0.13], [0.06, 0.78, 0.13]]], [1.4, [[-0.06, 0.55, 0.13], [0.06, 0.78, 0.13]]], [2.2, [[-0.05, 0.12, 0.42], [0.05, 0.12, 0.62]]], [2.9, [[-0.18, 0.28, 0.2], [0.18, 0.28, 0.2]]],
  [3.08, [[-0.18, 0.3, 0.2], [0.06, 0.32, 0.18]]], [3.18, [[-0.18, 0.3, 0.2], [0.04, 0.36, 0.46]]], [3.45, [[-0.2, 0.3, 0.25], [0.12, 0.3, 0.28]]], [3.7, [[-0.16, 0.36, 0.44], [0.16, 0.36, 0.44]]]];
function cam(t) {
  if (t < 2.9) { const k = sm(t / 2.9), tg = keys(POS, Math.min(t + 0.2, 2.9)); return { pos: L3([1.7, 0.7, -0.3], [1.45, 1.0, -0.9], k), tgt: [tg[0] * 0.5, lerp(2.9, 2.0, k), -2.9], fov: 54 }; }
  if (t < 4.4) { const k = sm((t - 2.9) / 1.5); return { pos: L3([1.3, 1.0, -3.3], [1.15, 1.1, -3.25], k), tgt: [0, 1.6, -2.85], fov: 60, aperture: 0.0018 }; }
  const k = sm((t - 4.4) / 1.6); return { pos: L3([0.9, 0.55, -1.1], [0.8, 0.5, -0.9], k), tgt: [0, lerp(2.4, 3.6, k), -2.72], fov: 58 }; }
module.exports = { N, set: "museum", frame(f) {
  const t = f / FPS, c = cam(t), hs = keys(HANDS, t), shat = t >= 3.15 ? t - 3.15 : null;
  const grip = t < 3.55 ? 0 : clamp((t - 3.55) / 0.2), panelK = t < 3.7 ? 0 : clamp((t - 3.7) / 0.5);
  return { t, set: "museum", loc: "gallery", mood: "heist", glass: t >= 3.15 ? "broken" : "ok", shatter: shat,
    thief: { pos: keys(POS, t), pitch: keys(PITCH, t), yaw: keys(YAW, t) + 0.06 * Math.sin(t * 2.1), handL: hs[0], handR: hs[1], grip, panelK, sway: t * 2 },
    key: t >= 2.85 && t < 4.4 ? { at: [0, 1.5, -2.8], from: [0.9, -0.25, -0.55], col: 0xbcd0ff, k: 7, angle: 0.5 } : null,
    cam: Object.assign({ focus: Math.hypot(...c.pos.map((v, i) => v - c.tgt[i])) }, c) };
} };
