// heist_sim.js: the thief's move as PHYSICS (user: "not smooth enough, use more physics"), not keyframe lerps.
// Integrated once at 1200 Hz, sampled per frame:
//   rope    length L: released -> free fall (g, rope friction) -> the rope catches him (stiff spring + damper: a little bounce),
//           later a winch drives L toward targets (PD with an acceleration limit), finally yanks him up
//   swing   2-axis pendulum on the rope: a'' = -(g/L) sin a - 2 (L'/L) a' - c a' + F/L   (Coriolis term pumps the swing as the rope shortens)
//   body    pitch / yaw = inertia + PD torque toward a target, under-damped (overshoot, settle); the body tilts with the rope;
//           turning over pushes back on the rope (reaction), the punch kicks him away from the glass (impulse)
//   arms    appear only when needed (user rule): an under-damped spring 0..1 (pop + overshoot); hands follow their targets on springs
// usage: const sim = simulate(SCRIPT); sim.at(t) -> { pos, q, arms, handL, handR, grip, panelK, pitch, yaw, L }
const G = 9.81;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sm = k => k * k * (3 - 2 * k);
// quaternions [x, y, z, w]
const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qAxis = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
function qFromTo(u, v) { const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const q = [c[0], c[1], c[2], 1 + d], n = Math.hypot(...q); return q.map(x => x / n); }
// piecewise target: [[t, value], ...] -> value at t (smoothstep between keys); used only as TARGETS for the springs, never as the motion itself
function track(K) { return t => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, a] = K[i - 1], [t1, b] = K[i], k = sm((t - t0) / (t1 - t0)); return Array.isArray(a) ? a.map((v, j) => v + (b[j] - v) * k) : a + (b - a) * k; } return K[K.length - 1][1]; }; }
/* SCRIPT: {
     hook: [x, y, z]              eye of the bolt (rope top)
     T: duration, L0: start length, release: t (free fall starts), catchL: length where the rope catches him,
     winch: [[t, L], ...]         winch targets after the catch (null = keep the caught length),  yankAt: t (pulled up hard), yankV: m/s
     pitch: [[t, rad]], yaw: [[t, rad]]     body targets (PD), swingZ: [[t, rad]] pendulum bias toward/away from the painting (he pulls himself in)
     arms: [[t, 0|1]], hands: [[t, [[lx,ly,lz],[rx,ry,rz]]]], punch: { t, kick } , grip: [t0, t1], panel: [t0, t1], massAt: t (painting weight dip)
   } */
function simulate(S) {
  const dt = 1 / 1200, N = Math.ceil(S.T / dt) + 2, out = new Array(Math.ceil(S.T * 240) + 2);
  const pitchT = track(S.pitch), yawT = track(S.yaw), swingT = track(S.swingZ || [[0, 0]]), armsT = track(S.arms), handsT = track(S.hands), winchT = S.winch ? track(S.winch) : null;
  let L = S.L0, Lv = 0, caught = false, ax = 0, axv = 0, az = 0, azv = 0, p = S.pitch[0][1], pv = 0, y = S.yaw[0][1], yv = 0, A = 0, Av = 0;
  let hd = handsT(0).map(h => h.slice()), hv = [[0, 0, 0], [0, 0, 0]], punched = false, massed = false;
  for (let i = 0; i < N; i++) { const t = i * dt;
    // ---- rope length
    let La = 0;
    if (S.yankAt != null && t >= S.yankAt) { const vT = -S.yankV * clamp((t - S.yankAt) / 0.18); La = (vT - Lv) * 30; caught = true; }          // winch yank: reach -yankV fast
    else if (t < S.release) { La = (S.L0 - L) * 200 - Lv * 30; }
    else if (!caught) { La = G * 0.82 - Lv * 0.15; if (L >= S.catchL) caught = true; }                                                       // free fall (rope friction)
    if (caught && !(S.yankAt != null && t >= S.yankAt)) { const tgt = winchT ? winchT(t) : S.catchL, k = t < S.release + 1.2 ? 520 : 160, c = t < S.release + 1.2 ? 9 : 22;
      La = clamp(-k * (L - tgt) - c * Lv, t < S.release + 1.2 ? -90 : -14, t < S.release + 1.2 ? 90 : 14); }   // the catch may decelerate hard                                                                                        // stiff catch -> a bounce; then the winch (PD, accel limit)
    if (S.massAt != null && !massed && t >= S.massAt) { Lv += 0.35; massed = true; }                                                          // the painting's weight: a dip
    Lv += La * dt; L += Lv * dt; if (L < 0.15) { L = 0.15; Lv = Math.max(0, Lv); }   // at the top: the winch stops
    // ---- body rotation (inertia + PD torque), reaction on the swing
    const pa = 48 * (pitchT(t) - p) - 2 * 0.62 * Math.sqrt(48) * pv; pv += pa * dt; p += pv * dt;
    const ya = 16 * (yawT(t) - y) - 2 * 0.55 * Math.sqrt(16) * yv; yv += ya * dt; y += yv * dt;                                                 // rope twist: springy, overshoots
    // ---- pendulum (2 axes); he pulls himself toward swingZ bias; the turn-over pushes back
    const bias = swingT(t), Fz = 14 * (bias - az) - 0.12 * pa * Math.cos(y), Fx = -0.05 * pa * Math.sin(y);
    const Lc = Math.max(L, 0.6), cd = S.yankAt != null && t > S.yankAt ? 2.5 : 0.6;   // short rope: keep the pendulum stable
    const azA = -(G / Lc) * Math.sin(az) - 2 * (Lv / Lc) * azv - cd * azv + Fz / Lc, axA = -(G / Lc) * Math.sin(ax) - 2 * (Lv / Lc) * axv - cd * axv + Fx / Lc;
    azv += azA * dt; az += azv * dt; axv += axA * dt; ax += axv * dt;
    if (S.punch && !punched && t >= S.punch.t) { azv += S.punch.kick; pv += 0.8; punched = true; }                                           // recoil of the punch
    // ---- arms envelope + hands on springs (in the harness frame)
    const Aa = 260 * (armsT(t) - A) - 2 * 0.45 * Math.sqrt(260) * Av; Av += Aa * dt; A += Av * dt;
    const ht = handsT(t); for (let k = 0; k < 2; k++) for (let j = 0; j < 3; j++) { const a2 = 420 * (ht[k][j] - hd[k][j]) - 2 * 0.7 * Math.sqrt(420) * hv[k][j]; hv[k][j] += a2 * dt; hd[k][j] += hv[k][j] * dt; }
    // ---- sample at 240 Hz
    if (i % 5 === 0) { const H = S.hook, cx = H[0] + L * Math.sin(ax), cz = H[2] + L * Math.sin(az), cy = H[1] - L * Math.cos(ax) * Math.cos(az);
      const up = [H[0] - cx, H[1] - cy, H[2] - cz], ul = Math.hypot(...up), qR = qFromTo([0, 1, 0], up.map(v => v / ul));
      const q = qMul(qR, qMul(qAxis([0, 1, 0], y), qAxis([1, 0, 0], p)));                                                                     // rope tilt * yaw * pitch
      const g = S.grip ? clamp((t - S.grip[0]) / (S.grip[1] - S.grip[0])) : 0, pk = S.panel ? sm(clamp((t - S.panel[0]) / (S.panel[1] - S.panel[0]))) : 0;
      out[i / 5] = { pos: [cx, cy, cz], q, arms: Math.max(0, A), handL: hd[0].slice(), handR: hd[1].slice(), grip: g, panelK: pk, pitch: p, yaw: y, L, swing: az }; } }
  return { at(t) { const k = clamp(t, 0, S.T) * 240, i = Math.floor(k), f = k - i, a = out[i] || out[out.length - 2], b = out[i + 1] || a; if (!b) return a;
    const mix = (u, v) => Array.isArray(u) ? u.map((x, j) => Array.isArray(x) ? mix(x, v[j]) : x + (v[j] - x) * f) : u + (v - u) * f; const r = {}; for (const key in a) r[key] = mix(a[key], b[key]); return r; } };
}
module.exports = { simulate, track, clamp, sm };
