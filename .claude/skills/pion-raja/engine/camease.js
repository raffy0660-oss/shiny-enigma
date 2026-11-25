'use strict';
/* camease.js: 3D camera moves for plan files, with the curves measured on the 14 detective references
   (PANDUAN_KUALITAS.md). 216 zooms longer than 0.45 s were tracked frame by frame:
   - the average curve fits easeInOutSine best (RMS 0.026; cubic in-out, our old default, 0.089);
   - long moves last 0.8-1.6 s (median 1.0-1.5 s) and change the framing a lot (median 46%, up to 4x);
   - 1 in 3 is a pull-OUT, and 15% end with a small settle (overshoot of about 3%);
   - short punches (< 0.45 s) are small (median 10%);
   - the camera is moving 67-96% of the time: between keys it keeps a slow drift.
   A zoom is done in 3D (the camera travels, so it has parallax), not as a crop of the rendered frame.

   Usage in a plan:
     const { track, EASE } = require('<skill>/engine/camease.js');
     const cam = track([
       { t: 0,   pos: [0, 1.6, 6],   tgt: [0, 1.2, 0], fov: 50 },                // start (wide)
       { t: 1.2, dur: 1.3, pos: [0.4, 1.4, 2.2], tgt: [0, 1.25, 0] },             // push in, easeInOutSine
       { t: 4.0, dur: 1.5, pos: [0, 2.4, 9], tgt: [0, 1.2, 0], settle: 0.03 },     // pull out + settle
       { t: 6.5, dur: 0.3, fov: 45, ease: 'sine' },                               // short punch (~10%)
     ], { drift: 0.02, bank: 2.5, jitter: 0.0015 });   // bank: deg of roll per rad/s of turn; jitter: handheld
     const c = cam(t);   // -> { pos, tgt, fov, roll }  (roll in radians: the museum renderer reads F.cam.roll)
   A key may also carry `roll` (deg) for a deliberate dutch angle, eased like the move.

   Each key moves from wherever the camera is at key.t to the key's values over key.dur, then holds
   (plus drift). Fields left out of a key keep their current value. The distance to the target is eased
   in log space, so a 4x push feels even all the way (a linear lerp rushes the start and crawls at the end).
*/
const EASE = {
  linear: u => u,
  sine: u => 0.5 - 0.5 * Math.cos(Math.PI * u),                         // default: the references' curve
  quad: u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
  cubic: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outCubic: u => 1 - Math.pow(1 - u, 3),                                 // for physical arrivals only
};
function bezier(x1, y1, x2, y2) {   // CSS cubic-bezier, solved by Newton steps on x
  const bx = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return u => { let t = u; for (let i = 0; i < 8; i++) { const x = bx(t, x1, x2) - u, d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2); if (Math.abs(d) < 1e-6) break; t -= x / d; } return bx(Math.min(1, Math.max(0, t)), y1, y2); };
}
EASE.material = bezier(0.4, 0, 0.2, 1);                                  // second most common per-zoom winner
const easeOf = e => typeof e === 'function' ? e : (EASE[e] || EASE.sine);
// settle: after arriving, drift past the target by `a` (fraction of the move) and come back, in 0.35 s.
// sin^2 bump: zero speed at both ends, so position and speed stay continuous
const SETTLE = 0.35;
const settleOf = (a, tAfter) => a && tAfter > 0 && tAfter < SETTLE ? a * Math.pow(Math.sin(Math.PI * tAfter / SETTLE), 2) : 0;

const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map(v => v * k);
const len = a => Math.hypot(...a), norm = a => { const l = len(a) || 1; return a.map(v => v / l); };
function blend(A, B, u, uRaw) {   // A, B: { pos, tgt, fov }; distance in log space, direction normalised lerp
  const tgt = add(A.tgt, mul(sub(B.tgt, A.tgt), u));
  const oa = sub(A.pos, A.tgt), ob = sub(B.pos, B.tgt), da = len(oa), db = len(ob);
  const dir = norm(add(mul(norm(oa), 1 - u), mul(norm(ob), u)));
  const dist = da * Math.pow(db / da, u);
  const fov = A.fov * Math.pow(B.fov / A.fov, u);                        // fov also in log space
  return { pos: add(tgt, mul(dir, dist)), tgt, fov };
}
function track(keys, opts = {}) {
  const drift = opts.drift ?? 0.02;                                       // +2%/s push while holding
  const K = keys.slice().sort((a, b) => a.t - b.t);
  const S = [{ pos: K[0].pos, tgt: K[0].tgt, fov: K[0].fov ?? 50 }];     // camera state at the start of each key
  const B = [S[0]];                                                       // each key's destination
  function at(j, t) {                     // camera at time t while key j is the latest one
    const k = K[j], e = t - k.t, d = k.dur || 1e-6, st = k.settle ? SETTLE : 0;
    const u = j === 0 ? 1 : easeOf(k.ease)(Math.min(1, Math.max(0, e / d))) + settleOf(k.settle || 0, e - d);
    const c = j === 0 ? S[0] : blend(S[j], B[j], u);
    const hold = Math.max(0, e - (j === 0 ? 0 : d + st));                 // drift only once the move has finished
    if (!drift || !hold) return c;
    const o = sub(c.pos, c.tgt); return { pos: add(c.tgt, mul(o, Math.pow(1 - drift, hold))), tgt: c.tgt, fov: c.fov };
  }
  for (let j = 1; j < K.length; j++) {    // the camera may still be moving (or drifting) when the next key starts
    S[j] = at(j - 1, K[j].t);
    B[j] = { pos: K[j].pos || S[j].pos, tgt: K[j].tgt || S[j].tgt, fov: K[j].fov ?? S[j].fov };
  }
  const base = t => { let j = 0; while (j + 1 < K.length && K[j + 1].t <= t) j++; return at(j, t); };
  // banking roll: the references roll ~32 times a minute while the camera turns (median 3.8 deg, p90 12.9 deg,
  // ~0.33 s each). Roll follows the yaw rate of the view (deg per rad/s), smoothed over +-0.12 s, capped.
  const bank = opts.bank ?? 0, bankMax = (opts.bankMax ?? 13) * Math.PI / 180;
  const yaw = t => { const c = base(t), o = sub(c.tgt, c.pos); return Math.atan2(o[0], -o[2]); };
  const yawRate = t => { let d = yaw(t + 0.02) - yaw(t - 0.02); d = Math.atan2(Math.sin(d), Math.cos(d)); return d / 0.04; };
  // handheld micro-jitter on the target, in metres at the target distance: refs ~0.76 px per frame at 360 px wide
  const jit = opts.jitter ?? 0;
  return function cam(t) {
    const c = base(t); let roll = 0;
    if (bank) { let r = 0; for (let i = -3; i <= 3; i++) r += yawRate(t + i * 0.04); roll = Math.max(-bankMax, Math.min(bankMax, -bank * (Math.PI / 180) * r / 7)); }
    let j = 0; while (j + 1 < K.length && K[j + 1].t <= t) j++;           // a deliberate dutch angle: key.roll (deg), eased like the move
    const rk = (i) => (K[i] && K[i].roll != null ? K[i].roll : null);
    let dutch = 0, prev = 0;
    for (let i = 0; i <= j; i++) { if (rk(i) == null) continue; const u = i === 0 ? 1 : easeOf(K[i].ease)(Math.min(1, Math.max(0, (t - K[i].t) / (K[i].dur || 1e-6)))); dutch = prev + (rk(i) - prev) * u; prev = rk(i); }
    roll += dutch * Math.PI / 180;
    let tgt = c.tgt;
    if (jit) { const d = len(sub(c.tgt, c.pos)), f = (a, b, q, p) => Math.sin(t * a + p) * 0.5 + Math.sin(t * b + p * 1.7) * 0.3 + Math.sin(t * q + p * 2.3) * 0.2;
      tgt = add(c.tgt, [jit * d * f(7.1, 12.9, 19.3, 0.4), jit * d * f(6.3, 11.7, 17.9, 2.1), 0]); }
    return { pos: c.pos, tgt, fov: c.fov, roll };
  };
}
// short punch on the fov (multiplier < 1 = punch in), eased with sine and held until `until`
function punch(t, t0, amt = 0.10, dur = 0.3, until = Infinity) {
  if (t < t0 || t >= until) return 1;
  return 1 / (1 + amt * EASE.sine(Math.min(1, (t - t0) / dur)));
}
const API = { EASE, bezier, track, punch, blend };
if (typeof module !== 'undefined') module.exports = API; else window.CamEase = API;

if (typeof require !== 'undefined' && require.main === module) {   // self-test: node camease.js
  const cam = track([{ t: 0, pos: [0, 1, 8], tgt: [0, 1, 0], fov: 50 }, { t: 1, dur: 1, pos: [0, 1, 2] }, { t: 3, dur: 1.5, pos: [0, 2, 10], settle: 0.03 }], { drift: 0 });
  const d = t => len(sub(cam(t).pos, cam(t).tgt));
  const row = [0, .25, .5, .75, 1].map(u => (Math.log(d(1 + u) / 8) / Math.log(2 / 8)).toFixed(3));
  console.log('push 8m -> 2m, log progress at u=0,.25,.5,.75,1:', row.join(' '), '(sine: 0.000 0.146 0.500 0.854 1.000)');
  console.log('pull out to 10.05 m with settle 3%: distance at end / +0.175 s / +0.35 s / +1 s:', [4.5, 4.675, 4.85, 5.5].map(t => d(t).toFixed(3)).join(' '));
  const orb = track([{ t: 0, pos: [5, 1, 0], tgt: [0, 1, 0], fov: 50 }, { t: 0.5, dur: 1.2, pos: [0, 1, 5] }, { t: 3, dur: 1, roll: 6 }], { drift: 0, bank: 2.5 });
  console.log('bank during a 90 deg orbit (deg) at 0.4 / 1.1 / 1.9 s:', [0.4, 1.1, 1.9].map(t => (orb(t).roll * 180 / Math.PI).toFixed(2)).join(' '), '| dutch key 6 deg at 3.5 / 4.2 s:', [3.5, 4.2].map(t => (orb(t).roll * 180 / Math.PI).toFixed(2)).join(' '));
  const pc = track([{ t: 0, pos: [0, 0, 5], tgt: [0, 0, 0], fov: 50 }, { t: 2, dur: 1, pos: [0, 0, 3] }], { drift: 0.02 }); console.log('drift (continuous into the next key): distance at 0 / 1 / 1.999 / 2.001 / 3 s:', [0, 1, 1.999, 2.001, 3].map(t => len(pc(t).pos).toFixed(3)).join(' '), '| fov punch 10% at 0.3 s:', punch(0.3, 0, 0.1).toFixed(3));
}
