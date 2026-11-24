// the opening heist (sample 0-4.6 s): physics thief (heist_sim.js) + spring-smoothed cameras, warm golden light (brief), the frame left empty.
// exports { T, frame(t) } so the film plan can embed it; run alone with heist_test_phys.js
const { simulate, track, clamp, sm } = require("./heist_sim.js");
const PI = Math.PI, HOOK = [0, 4.25, -2.65], T = 4.6, T_SMASH = 1.92;
const SIM = simulate({ hook: HOOK, T, L0: 0.35, release: 0.32, catchL: 2.0,
  winch: [[1.2, 2.0], [1.85, 2.33], [2.9, 2.33]], yankAt: 3.02, yankV: 4.8,
  pitch: [[0, 0], [1.12, 0], [1.38, -PI], [2.58, -PI], [2.8, 0]],
  yaw: [[0, PI + 0.55], [0.95, PI], [1.25, PI], [1.6, -0.85], [2.6, -0.75], [2.95, -0.2]],
  swingZ: [[0, 0], [1.7, 0], [1.88, -0.06], [2.65, -0.06], [2.85, 0]],
  arms: [[0, 0], [1.6, 0], [1.66, 1], [4.6, 1]],
  hands: [[0, [[-0.18, 0.28, 0.2], [0.18, 0.28, 0.2]]], [1.66, [[-0.18, 0.28, 0.2], [0.18, 0.28, 0.2]]], [1.8, [[-0.2, 0.3, 0.22], [0.1, 0.3, 0.1]]],
    [1.9, [[-0.2, 0.3, 0.22], [0.03, 0.36, 0.52]]], [2.04, [[-0.2, 0.3, 0.25], [0.12, 0.3, 0.28]]], [2.16, [[-0.16, 0.36, 0.44], [0.16, 0.36, 0.44]]]],
  punch: { t: T_SMASH, kick: 0.15 }, grip: [2.16, 2.26], panel: [2.26, 2.66], massAt: 2.5 });
// camera: raw path per shot, then a critically damped follow (no snaps inside a shot; hard cuts between shots)
const SHOTS = [
  { t0: 0, t1: 1.75, pos: t => { const k = sm(t / 1.75); return [1.7 - 0.25 * k, 0.72 + 0.25 * k, -0.15 - 0.65 * k]; }, tgt: t => { const s = SIM.at(t + 0.08); return [s.pos[0] * 0.6, Math.max(1.9, s.pos[1] + 0.05), -2.95]; }, fov: 54 },
  { t0: 1.75, t1: 3.0, pos: t => { const k = sm((t - 1.75) / 1.25); return [1.6 - 0.14 * k, 1.08 + 0.1 * k, -2.96 + 0.04 * k]; }, tgt: t => [0, 1.62, -2.88], fov: 52, aperture: 0.0018, noMonaBeam: true },
  { t0: 3.0, t1: T, pos: t => { const k = sm((t - 3.0) / 1.6); return [0.95 - 0.35 * k, 0.85 + 0.45 * k, -1.2 - 0.35 * k]; },
    tgt: t => { const s = SIM.at(t), k = sm(clamp((t - 3.55) / 0.8)); return [s.pos[0] * (1 - k), (s.pos[1] + 0.3) * (1 - k) + 1.45 * k, -2.75 * (1 - k) - 3.4 * k]; }, fov: 56 },
];
const CAM = SHOTS.map(S => { const dt = 1 / 240, n = Math.ceil((S.t1 - S.t0) / dt) + 2, P = [], Q = []; let p = S.pos(S.t0), q = S.tgt(S.t0), pv = [0, 0, 0], qv = [0, 0, 0]; const w = 9;
  for (let i = 0; i < n; i++) { const t = S.t0 + i * dt, pr = S.pos(t), qr = S.tgt(t);
    for (let j = 0; j < 3; j++) { pv[j] += (w * w * (pr[j] - p[j]) - 2 * w * pv[j]) * dt; p[j] += pv[j] * dt; qv[j] += (w * w * (qr[j] - q[j]) - 2 * w * qv[j]) * dt; q[j] += qv[j] * dt; }
    P.push(p.slice()); Q.push(q.slice()); } return { S, P, Q }; });
function cam(t) { const C = CAM.find(c => t >= c.S.t0 && t < c.S.t1) || CAM[CAM.length - 1], i = Math.min(C.P.length - 1, Math.round((t - C.S.t0) * 240)), pos = C.P[i], tgt = C.Q[i];
  return { pos, tgt, fov: C.S.fov, aperture: C.S.aperture ?? 0.0016, focus: Math.hypot(...pos.map((v, j) => v - tgt[j])), noMonaBeam: !!C.S.noMonaBeam }; }
function frame(t) { const s = SIM.at(t), sh = t >= T_SMASH ? t - T_SMASH : null;
  const c = cam(t); return { t, set: "museum", loc: "gallery", mood: "heistWarm", monaBeamK: c.noMonaBeam ? 0 : 1, glass: t >= T_SMASH ? "broken" : "ok", shatter: sh,
    thief: { pos: s.pos, q: s.q, arms: s.arms, handL: s.handL, handR: s.handR, grip: s.grip, panelK: s.panelK },
    key: t >= 1.7 && t < 3.0 ? { at: [0, 1.5, -2.8], from: [0.9, -0.2, -0.55], col: 0xffd2a0, k: 6, angle: 0.5 } : null, cam: c }; }
module.exports = { T, frame, SIM };
