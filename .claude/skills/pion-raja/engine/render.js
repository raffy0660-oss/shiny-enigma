'use strict';
/* Scene: places the pion in each video frame, physics, lighting from footage, fx overlay. */
let PLAN = null, THUMBS = null;
const TW = 36, THH = 64;
let TPEV = [];
window.setData = (plan, b64) => { PLAN = plan; TPEV = [];
  for (let i = 0; i < plan.length; i++) { const o = plan[i], p = plan[i - 1], n = plan[i + 1];
    if (o.vis && o.tpIn && (!p || !p.vis || p.arr !== o.arr)) TPEV.push({ t: o.arr, x: o.x, y: o.y, h: o.h, kind: 'in' });
    if (o.vis && o.van !== null && (!n || !n.vis || n.arr !== o.arr)) TPEV.push({ t: o.van, x: o.x, y: o.y, h: o.h, kind: 'out' }); }
  const bin = atob(b64); THUMBS = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) THUMBS[i] = bin.charCodeAt(i);
  AUTODIR = {}; return PLAN.length; };
/* SHOTCAM entry with autoDir: true -> the key light comes from the brighter side of the shot (left/right thirds of the
   footage, averaged over the shot), so the shadow falls toward the darker side. Manual dir stays the default. */
let AUTODIR = {};
function lightDir(sc, s) {
  if (!sc.autoDir) return sc.dir;
  if (AUTODIR[s] === undefined) {
    let l = 0, r = 0, n = 0;
    for (let f = 0; f < PLAN.length; f++) { if (PLAN[f].s !== s || f * TW * THH * 3 >= THUMBS.length) continue;
      l += luma(sampleBox(f, 0, H * .2, W / 3, H * .8)); r += luma(sampleBox(f, W * 2 / 3, H * .2, W, H * .8)); n++; }
    const k = n ? (r - l) / n : 0, x = clamp(k * 6, -.75, .75), y = .75, z = .4, len = Math.hypot(x, y, z);
    AUTODIR[s] = [x / len, y / len, z / len];
  }
  return AUTODIR[s];
}
const fx = document.getElementById('fx').getContext('2d');

function sampleBox(f, x0, y0, x1, y1) {
  const base = f * TW * THH * 3; let r = 0, g = 0, b = 0, n = 0;
  const cx0 = clamp(Math.floor(x0 / (W / TW)), 0, TW - 1), cx1 = clamp(Math.floor(x1 / (W / TW)), 0, TW - 1), cy0 = clamp(Math.floor(y0 / (H / THH)), 0, THH - 1), cy1 = clamp(Math.floor(y1 / (H / THH)), 0, THH - 1);
  for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) { const i = base + (y * TW + x) * 3; r += THUMBS[i]; g += THUMBS[i + 1]; b += THUMBS[i + 2]; n++; }
  return [r / n / 255, g / n / 255, b / n / 255];
}
const luma = c => .299 * c[0] + .587 * c[1] + .114 * c[2];

/* ---------- camera ---------- */
const HC = 10;
function makeCam(pitchDeg, fovDeg) {
  const a = pitchDeg * Math.PI / 180, fov = fovDeg * Math.PI / 180, th = Math.tan(fov / 2);
  const V = mat.mul(mat.RX(a), mat.T(0, -HC, 0)), Pm = mat.persp(fov, ASPECT, .5, 2000), VP = mat.mul(Pm, V);
  const toPix = p => { const c = mat.xform(VP, [p[0], p[1], p[2], 1]); return [(c[0] / c[3] * .5 + .5) * W, (1 - (c[1] / c[3] * .5 + .5)) * H]; };
  const ground = (px, py) => {
    const nx = px / W * 2 - 1, ny = 1 - py / H * 2; const dc = [nx * th * ASPECT, ny * th, -1];
    const c = Math.cos(a), s = Math.sin(a); const dy = c * dc[1] + s * dc[2], dz = -s * dc[1] + c * dc[2];
    const t = -HC / Math.min(dy, -1e-4); return [t * dc[0], 0, t * dz];
  };
  const unitPx = P => { const p0 = toPix(P), p1 = toPix([P[0], P[1] + 1, P[2]]); return Math.abs(p0[1] - p1[1]); };
  return { VP, toPix, ground, unitPx, pitch: a };
}

/* ---------- timeline helpers ---------- */
const SWAP = .14; // expression change: features squash, swap at the midpoint, pop back with a little overshoot
function exprAt(t) {
  const L = TL.expr; let i = 0; while (i < L.length - 1 && t >= L[i + 1][0]) i++;
  const prev = i > 0 ? L[i - 1][1] : L[0][1], cur = L[i][1], e = t - L[i][0];
  if (prev === cur || e < 0) return { a: cur, b: cur, m: 1, sq: 0, since: 9 };
  const u = clamp(e / SWAP, 0, 1), k = e - SWAP;
  const sq = u < 1 ? Math.sin(Math.PI * u) : -.22 * Math.exp(-12 * k) * Math.sin(28 * k);
  return { a: prev, b: cur, m: u, sq, since: e };
}
const BLINKS = (() => { const r = rng(11), out = []; let t = .55; while (t < 900) { out.push(t); if (r() < .2) out.push(t + .27); t += 2.0 + r() * 2.4; } return out; })();
function blinking(t) { for (const b of BLINKS) { const e = t - b; if (e >= 0 && e < .1) return true; } return false; }
function startleAt(t) { // returns {yOff (heights), a (squash)}
  let y = 0, a = 0;
  for (const ts of TL.startle) {
    const e = t - ts; if (e < -0.12 || e > 1.4) continue;
    if (e < 0) { a += -.12 * smooth(-.12, 0, e); continue; } // anticipation squash
    const q = clamp(e / .3, 0, 1); y += .16 * 4 * q * (1 - q); if (e < .3) a += .22 * Math.sin(q * Math.PI);
    else { const k = e - .3; a += -.3 * Math.exp(-3 * k) * Math.cos(11 * k); }
  }
  return { y, a };
}
function fallAt(t, o) { // returns tip angle (rad), hop (heights)
  if (o.fallT === null || o.fallT === undefined) return { ang: 0, y: 0 };
  const F = TL.fall, e = t - F.hit; if (e < 0) return { ang: 0, y: 0 };
  let ang;
  if (e < .3) ang = F.ang * easeIO(e / .3) * 1.06;
  else ang = F.ang - .18 * Math.exp(-6 * (e - .3)) * Math.abs(Math.cos(13 * (e - .3)));
  const eu = t - F.up; if (eu > 0) ang = F.ang * (1 - easeIO(clamp(eu / .28, 0, 1))) + (eu > .28 ? -.12 * Math.exp(-5 * (eu - .28)) * Math.sin(12 * (eu - .28)) : 0);
  const q = clamp(e / .28, 0, 1); const y = .1 * 4 * q * (1 - q);
  return { ang, y };
}
function runAmt(o) { return smooth(.25, 1.2, o.spd || 0); }
let SUBU = 0, NOSIM = false; // motion blur: render u frames before f (PLAN[f] temporarily interpolated)
function motion(f) {
  const o = PLAN[f], t = (f - SUBU) / 30;
  const st = startleAt(t), fa = fallAt(t, o);
  let a = st.a + .016 * Math.sin(t * 3.3), flash = 0, op = 1, y = st.y + fa.y;
  const e = t - o.arr;
  if (e >= 0 && e < 1.5) {
    if (o.tpIn) { const u = clamp(e / .32, 0, 1); op = smooth(0, .16, e); flash = 1 - easeIO(u); a += .3 * (1 - u) * (1 - u) + (e > .2 ? .12 * Math.exp(-4.5 * (e - .2)) * Math.sin(11 * (e - .2)) : 0); y += .06 * (1 - u); }
    else a += -.08 * Math.exp(-4 * e) * Math.cos(12 * e);
  }
  if (o.van !== null) { const r = o.van - t; if (r < .3) { const u = 1 - r / .3; flash = Math.max(flash, easeIO(u)); a += .3 * u * u; y += .06 * u; op = Math.min(op, smooth(0, .14, r)); } }
  // run cycle: bobbing steps
  const ra = runAmt(o); if (ra > 0) { const ph = (o.dist || 0) * Math.PI * 2.4; y += .07 * ra * Math.abs(Math.sin(ph)); a += .07 * ra * Math.cos(ph * 2); }
  // riding a falling object: slight lag (gravity), landing squash
  if (o.physy) { const R = TL.ride.find(r => Math.abs(r.t0 - o.arr) < .2) || TL.ride[0]; const q = clamp((t - R.t0) / (R.land - R.t0), 0, 1); y += .1 * Math.sin(Math.PI * Math.pow(q, .8)); const el = t - R.land; if (el > 0) a += -.2 * Math.exp(-4 * el) * Math.cos(11 * el); }
  if (o.lift) y += o.lift / o.h;
  if (o.sq) a += o.sq; // airborne (hops / slides): feet above the ground point, shadow stays on the ground
  a += takeoffLand(f, o);
  return { yOff: y, a, sAll: 1, flash: clamp(flash, 0, 1), fall: fa.ang, op };
}
/* anticipation + landing, read from the plan itself (works for any hop / jump / drop / launch helper):
   a short crouch right before the take-off, and a squash that springs back right after touching down. */
function takeoffLand(f, o) {
  const same = g => { const q = PLAN[g]; return !!(q && q.vis && q.s === o.s && q.arr === o.arr); };
  const feet = g => PLAN[g].y - (PLAN[g].lift || 0);
  const goes = g => same(g) && same(g - 1) && (((PLAN[g].lift || 0) - (PLAN[g - 1].lift || 0)) > .02 * PLAN[g].h || PLAN[g].h / PLAN[g - 1].h > 1.06 || feet(g) - feet(g - 1) < -.06 * PLAN[g].h);
  const down = g => same(g) && same(g - 1) ? (feet(g) - feet(g - 1)) / PLAN[g].h : 0; // pion heights per frame, + = falling
  let a = 0;
  const grounded = !goes(f) && !((o.lift || 0) > .01 * o.h);
  if (grounded) for (let k = 1; k <= 5; k++) { // take-off coming: crouch, deepest just before leaving the ground
    if (!same(f + k)) break;
    if (goes(f + k)) { const e = (k - 1 + SUBU) / 30; a -= .15 * smooth(.17, 0, e); break; }
  }
  if (grounded) for (let k = 0; k <= 14; k++) { // touched down k frames ago: squash, then a damped rebound
    const g = f - k; if (!same(g) || !same(g - 1)) break;
    const v = down(g);
    if (v > .05) { if (k === 0) break; const e = (k - SUBU) / 30, amp = clamp(v * .6, .04, .1); a += -amp * Math.exp(-6 * e) * Math.cos(15 * e); break; }
    if (Math.abs(v) > .015) break;
  }
  return a;
}
function axisAngle(k, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), C = 1 - c, [x, y, z] = k;
  return Float32Array.of(c + x * x * C, y * x * C + z * s, z * x * C - y * s, 0, x * y * C - z * s, c + y * y * C, z * y * C + x * s, 0, x * z * C + y * s, y * z * C - x * s, c + z * z * C, 0, 0, 0, 0, 1);
}
let lastF = -10; const RL = { p: 0, v: 0 };
const SNAP = new Map(); // frame -> spring state right after that frame was simulated (motion-blur sub-frames read neighbours)
const snapPhys = () => { const s = { RL: [RL.p, RL.v] }; for (const k in PH) s[k] = [PH[k].p, PH[k].v]; return s; };
const setPhys = (A, B, k) => { RL.p = lerp(A.RL[0], B.RL[0], k); RL.v = lerp(A.RL[1], B.RL[1], k); for (const n in PH) { PH[n].p = lerp(A[n][0], B[n][0], k); PH[n].v = lerp(A[n][1], B[n][1], k); } };
function simulate(f) {
  if (NOSIM) return;
  if (SNAP.has(f)) { const S = SNAP.get(f); setPhys(S, S, 1); return; }
  // sequential physics; reset at shot start / arrival
  const step = (g) => {
    const o = PLAN[g], p = PLAN[g - 1];
    if (!p || p.s !== o.s || !o.vis || !p.vis || p.arr !== o.arr) { resetPhysics(); RL.p = o.roll || 0; RL.v = 0; return; }
    const m0 = motion(g - 1), m1 = motion(g);
    const sc = SHOTCAM[o.s], pf = 1 / Math.max(.25, Math.sin((o.pitch || sc.pitch) * Math.PI / 180));
    // surface-relative velocity in pion heights / s (screen x right, y down -> toward camera)
    let vxs = (o.rx - p.rx) / o.rh * 30, vzs = (o.ry - p.ry) / o.rh * 30 * pf;
    if (Math.abs(vxs) > 20 || Math.abs(vzs) > 20) { vxs = 0; vzs = 0; }
    if (o.still) { vxs = 0; vzs = 0; } // anchor motion comes from a camera zoom, not from the pion moving
    vxs *= .5; vzs *= .5;
    const yaw = o.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
    const vx = vxs * c - vzs * s, vz = vxs * s + vzs * c; // world -> local
    let vy = (m1.yOff - m0.yOff) * 30;
    if (o.physy) vy += -(o.y - p.y) / o.h * 30 * .8;
    vy = clamp(vy, -5, 5); // big drops / hops: keep the cape flare sane
    physStep(vx * 2, vy * 2, vz * 2, 1 / 30);
    for (let i = 0; i < 4; i++) stepSpring(RL, o.roll || 0, 140, 8, 1 / 120); // surface tilt follow with slight lag + wobble
    // inertia: object accelerating sideways tips the pion opposite
    if (!o.track) { const pp = PLAN[g - 2]; if (pp && pp.arr === o.arr) { const ax = ((o.x - p.x) - (p.x - pp.x)) / o.h * 900; RL.v += clamp(-ax * .02, -.6, .6); } }
  };
  if (f > lastF && f - lastF <= 2 && SNAP.has(lastF)) { const S = SNAP.get(lastF); setPhys(S, S, 1); for (let k = lastF + 1; k <= f; k++) { step(k); SNAP.set(k, snapPhys()); } }
  else { resetPhysics(); SNAP.clear(); let g = f; while (g > 0 && PLAN[g - 1].s === PLAN[f].s) g--; for (let k = g; k <= f; k++) { step(k); if (k >= f - 3) SNAP.set(k, snapPhys()); } }
  lastF = f; for (const k of [...SNAP.keys()]) if (k < f - 4) SNAP.delete(k);
}

function deathnoteTimes(G) { const d = G.t1 - G.t0; return { tear0: G.t0 + .42 * d, tear1: G.t0 + .62 * d, drop0: G.t0 + .7 * d, drop1: G.t0 + .9 * d }; }
const DOC_POCKET = [.3, 1.5, .44], SUB_BTN = [1.22, 2.6, 1.05]; // doctor's chest pocket, floating subscribe button (body space)
/* ---------- crown lift: a hand takes the crown off (shows the bald head) and puts it back ---------- */
// timeline inside the gesture: reach .28 s (hand to the rim), lift .32 s, hold, lower over the last .45 s, hand leaves .2 s
function crownLiftAt(t) {
  for (const G of TL.gest) { if (G.type !== 'crownlift' || t < G.t0 || t > G.t1) continue;
    const a = G.t0 + .28, b = a + .32, d = G.t1 - .2, c = d - .45;
    const up = t < a ? 0 : t < b ? easeOutBack(clamp((t - a) / (b - a), 0, 1)) : t < c ? 1 : t < d ? 1 - easeIO((t - c) / (d - c)) : 0;
    return { u: up, side: G.side || 1, G }; }
  return { u: 0, side: 1, G: null };
}
// crown offset in the body frame: up and out to the hand's side, tipped toward that hand
function crownLiftM(u, sd) { return mat.chain(mat.T(sd * .55 * u, 1.15 * u, .25 * u), mat.T(0, 3.55, 0), mat.RZ(-sd * .5 * u), mat.T(0, -3.55, 0)); }
function crownRimPt(u, sd) { // where the hand holds the crown: just outside its band on the hand's side
  const th = -sd * .5 * u, x = sd * 1.02, y = .12, c = Math.cos(th), s = Math.sin(th);
  return [x * c - y * s + sd * .55 * u, 3.55 + x * s + y * c + 1.15 * u, .3 + .25 * u];
}
/* ---------- arms ---------- */
function gEnv(G, t) { const r = Math.min(.16, (G.t1 - G.t0) / 3); return smooth(G.t0, G.t0 + r, t) * (1 - smooth(G.t1 - r, G.t1, t)); }
const SHOULDER = side => [side * .27, 1.6, .1]; // ball (r .15) stays inside the body, caps the arm tube
function gestureState(t, o) {
  const res = [null, null]; // [left, right]
  for (const G of TL.gest) {
    if (t < G.t0 || t > G.t1) continue;
    const env = gEnv(G, t); if (env < .02) continue;
    const ph = (t - G.t0), sd0 = G.side || 1, k0 = sd0 > 0 ? 1 : 0, HIP = sd => ({ env, h: [sd * .95, 1.3, .5] });
    const ppu = o.h / 4.65;
    const local = (tx, ty) => { // screen target -> model-space (ignoring squash)
      const dx = (tx - o.x) / ppu, dy = (o.y - ty) / ppu, dz = .8; const c = Math.cos(-o.yaw), s = Math.sin(-o.yaw);
      return [dx * c + dz * s, dy, -dx * s + dz * c];
    };
    if (G.type === 'up' || G.type === 'cheer') {
      const w = G.type === 'cheer' ? Math.sin(ph * 9) * .24 : Math.sin(ph * 10) * .06;
      res[0] = { env, h: [-1.15, 2.75 + w, .5], point: false }; res[1] = { env, h: [1.15, 2.75 - w, .5], point: false };
    } else if (G.type === 'present') { res[0] = { env, h: [-1.4, 1.95, .6] }; res[1] = { env, h: [1.4, 1.95, .6] }; }
    else if (G.type === 'shrug') { res[0] = { env, h: [-1.25, 1.75, .45] }; res[1] = { env, h: [1.25, 1.75, .45] }; }
    else if (G.type === 'wave') { const k = G.side > 0 ? 1 : 0; res[k] = { env, h: [G.side * (1.25 + .22 * Math.sin(ph * 8)), 2.65, .5] }; }
    else if (G.type === 'point' || G.type === 'press') {
      const k = G.side > 0 ? 1 : 0; const S = SHOULDER(G.side);
      let h = local(G.tgt[0], G.tgt[1]);
      let d = [h[0] - S[0], h[1] - S[1], h[2] - S[2]]; let L = Math.hypot(...d); const dn = d.map(v => v / L);
      let reach = G.type === 'point' ? Math.min(L - .2, 1.9) : Math.min(L, 3.4);
      if (G.type === 'press') { const hit = G.hit; const push = smooth(hit - .22, hit, t) * (1 - smooth(hit + .18, hit + .32, t)); reach = L * (.62 + .38 * push) + .05 * push; }
      h = [S[0] + dn[0] * reach, S[1] + dn[1] * reach, S[2] + dn[2] * reach];
      res[k] = { env, h, point: true, dir: dn };
    }
    else if (G.type === 'clap') { // ~4 claps per second, hands meet in front of the chest
      const open = .5 + .5 * Math.cos(ph * Math.PI * 2 * 4);
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; res[k] = { env, h: [sd * (.25 + .5 * open), 1.95 + .05 * open, 1.05 - .1 * open] }; }
      if (env > .5) res.clap = { k: 1 - smooth(0, .18, open), p: [0, 1.95, 1.05] };
    }
    else if (G.type === 'lookout') { res[k0] = { env, h: [sd0 * .42, 3.75, .8], head: true }; res[1 - k0] = HIP(-sd0); } // hand-visor + hand on hip
    else if (G.type === 'dance') { const w = Math.sin(ph * 7); res[0] = { env, h: [-1.2, 2.3 + .55 * w, .45] }; res[1] = { env, h: [1.2, 2.3 - .55 * w, .45] }; }
    else if (G.type === 'facepalm') { res[k0] = { env, h: [sd0 * .18, 3.05, 1.12], head: true }; res[1 - k0] = HIP(-sd0); }
    else if (G.type === 'knock') { const k = G.side > 0 ? 1 : 0; res[k] = { env, h: [G.side * .75, 2.25, 1.05 + .28 * Math.max(0, Math.sin(ph * Math.PI * 2 * 3.5))] }; }
    else if (G.type === 'think') { // hand on the chin (tapping), other arm folded under it
      res[k0] = { env, h: [sd0 * .3, 2.12 + .035 * Math.max(0, Math.sin(ph * 9)), 1.02], head: true }; res[1 - k0] = { env, h: [sd0 * .15, 1.62, .98] };
    }
    else if (G.type === 'nerd') { // "well, actually": his right index finger up beside the head, a book in his left hand
      const tap = .05 * Math.max(0, Math.sin(ph * 5)), d = [-.08, 1, .22], dl = Math.hypot(...d);
      res[0] = { env, h: [-1.0, 2.95 + tap, .75], point: true, dir: d.map(v => v / dl) };
      res[1] = { env, h: [.62, 1.45 + .02 * Math.sin(ph * 2.3), 1.12] };
    }
    else if (G.type === 'toss') { // flipping a coin: the hand dips on each catch, lifts on each throw (period .62 s)
      const u = ((t - G.t0) % .62) / .62, bob = -.09 * Math.max(0, 1 - u / .14) + .06 * smooth(.86, 1, u);
      res[k0] = { env, h: [sd0 * .92, 1.78 + bob, 1.08] };
    }
    else if (G.type === 'cointhrow') { // wind up, throw at the camera (release at t0 + .3), follow through
      const u = clamp((t - G.t0) / Math.max(.1, G.t1 - G.t0), 0, 1), e = (t - G.t0), A = [sd0 * .92, 1.78, 1.08], B = [sd0 * 1.05, 2.75, .25], C = [sd0 * .35, 2.25, 1.85], D = [sd0 * .7, 1.7, 1.35];
      const L3 = (p, q, w) => p.map((v, i) => lerp(v, q[i], w)), h = e < .22 ? L3(A, B, easeIO(e / .22)) : e < .34 ? L3(B, C, easeIO((e - .22) / .12)) : L3(C, D, easeIO(clamp((e - .34) / .4, 0, 1)));
      res[k0] = { env, h };
    }
    else if (G.type === 'pouch') { // holding a little coin purse up at the chest and peeking in
      const op = smooth(G.t0 + .3, G.t0 + .5, t); res[k0] = { env, h: [sd0 * .75, 1.92 + .1 * op, 1.22] };
    }
    else if (G.type === 'deathnote') { // both hands: hold the book, tear it from the middle, throw the halves down
      const T = deathnoteTimes(G), sep = smooth(T.tear0, T.tear1, t), dn = smooth(T.drop0, T.drop1, t);
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; res[k] = { env, h: [sd * (.48 + .55 * sep - .2 * dn), 1.92 + .12 * sep - .5 * dn, 1.2 + .25 * dn] }; }
    }
    else if (G.type === 'salam') { // handshake: hand out low to the side, pumping up and down once the hands meet
      const b = .07 * Math.sin((t - G.t0) * 30) * smooth(G.t0 + .3, G.t0 + .45, t) * (1 - smooth(G.t1 - .3, G.t1 - .15, t));
      res[k0] = { env, h: [sd0 * 1.42, 1.02 + b, .95] }; res[1 - k0] = HIP(-sd0);
    }
    else if (G.type === 'pocket') { // the hand carries the closed book to the chest pocket, then drops away
      const u = clamp((t - G.t0) / Math.max(.1, G.t1 - G.t0), 0, 1), A = [.62, 1.45, 1.12], B = [DOC_POCKET[0] + .02, DOC_POCKET[1] + .3, DOC_POCKET[2] + .42];
      const e = easeIO(clamp(u / .55, 0, 1)); res[k0] = { env, h: A.map((v, i) => lerp(v, B[i], e)) };
    }
    else if (G.type === 'click') { // reach to the floating button and press it at G.hit
      const push = smooth(G.hit - .16, G.hit, t) * (1 - smooth(G.hit + .1, G.hit + .3, t)), d = [-.25, .15, -1], dl = Math.hypot(...d);
      res[k0] = { env, h: [SUB_BTN[0] - .18, SUB_BTN[1] - .12, SUB_BTN[2] + .5 - .2 * push], point: true, dir: d.map(v => v / dl) };
    }
    else if (G.type === 'crownlift') { // one hand lifts the crown off, the other points at the bald head
      const CL = crownLiftAt(t), h = crownRimPt(CL.u, sd0); h[1] += .02 * Math.sin(ph * 6) * CL.u;
      res[k0] = { env, h };
      const show = smooth(G.t0 + .45, G.t0 + .75, t) * (1 - smooth(G.t1 - .65, G.t1 - .4, t));
      if (show > .02) { const hp = [-sd0 * 1.42, 3.3, .75], tg = [-sd0 * .1, 4.05, .3], dd = tg.map((v, i) => v - hp[i]), dl = Math.hypot(...dd);
        res[1 - k0] = { env: env * show, h: hp, point: true, dir: dd.map(v => v / dl) }; }
    }
    else if (G.type === 'phone') { res[k0] = { env, h: [sd0 * .95, 2.95 + .03 * Math.sin(ph * 5), .85] }; }      // holding a phone up beside the head (visible from front and back)
    else if (G.type === 'paper') { const b = .03 * Math.sin(ph * 4); res[0] = { env, h: [-.92, 2.0 + b, 1.0] }; res[1] = { env, h: [.92, 2.0 + b, 1.0] }; } // showing a sheet with both hands
    else if (G.type === 'throw') { // wind up behind the head, fling forward, follow through
      const u = clamp((t - G.t0) / (G.t1 - G.t0), 0, 1), A = [sd0 * 1.0, 2.0, .45], B = [sd0 * 1.15, 2.95, -.5], C = [sd0 * .35, 2.45, 1.5], D = [sd0 * .25, 1.75, 1.2];
      const L3 = (p, q, w) => p.map((v, i) => lerp(v, q[i], w)), h = u < .45 ? L3(A, B, easeIO(u / .45)) : u < .58 ? L3(B, C, easeIO((u - .45) / .13)) : L3(C, D, easeIO((u - .58) / .42));
      res[k0] = { env, h }; res[1 - k0] = HIP(-sd0);
    }
    else if (G.type === 'magnify') { // holding a magnifying glass up in front, scanning side to side
      const sc = Math.sin(ph * 3.2) * .28; res[k0] = { env, h: [sd0 * .5 + sc, 2.55 + .06 * Math.sin(ph * 6.4), 1.3] }; res[1 - k0] = { env, h: [-sd0 * .55, 1.72, .95] };
    }
    else if (G.type === 'hang') { const w = .04 * Math.sin(ph * 7); res[0] = { env, h: [-.3, 4.15 + w, .2] }; res[1] = { env, h: [.3, 4.15 - w, .2] }; } // gripping something above the head
    else if (G.type === 'fist') { // shaking angry fists
      const a = Math.sin(ph * 26), b = Math.sin(ph * 26 + 2); res[0] = { env, h: [-.85, 2.45 + .14 * a, .85] }; res[1] = { env, h: [.85, 2.45 + .14 * b, .85] };
    }
    else if (G.type === 'write') { // left hand holds the sheet, right hand scribbles across it
      const u = clamp((t - G.t0) / Math.max(.1, (G.t1 - G.t0) * .8), 0, 1), line = Math.floor(u * 2), lu = (u * 2) % 1;
      res[0] = { env, h: [-.72, 1.38, 1.2] }; res[1] = { env, h: [-.3 + .6 * lu, 1.6 - line * .16 + .03 * Math.sin(ph * 45), 1.42] };
    }
    else if (G.type === 'spank') { // wind up high behind, slap down to the side (period .24 s)
      const per = .24, u = ((t - G.t0) % per) / per, HIT = [sd0 * 1.75, 2.45, .55], UP = [sd0 * .55, 3.25, -.25];
      const L3 = (p, q, w) => p.map((v, i) => lerp(v, q[i], w)), h = u < .62 ? L3(HIT, UP, easeIO(u / .62)) : L3(UP, HIT, Math.pow((u - .62) / .38, 2));
      res[k0] = { env, h }; res[1 - k0] = HIP(-sd0);
    }
    else if (G.type === 'flyarms') { const w = Math.sin(ph * 6) * .12; res[0] = { env, h: [-1.35, 1.95 + w, -.15] }; res[1] = { env, h: [1.35, 1.95 - w, -.15] }; } // arms spread while flying
    else if (G.type === 'cross') { res[0] = { env, h: [.45, 1.62, .82] }; res[1] = { env, h: [-.45, 1.74, .9] }; }
    else if (G.type === 'flail') { // panicking in water: both arms thrash up and down out of phase, reaching above the head
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, w = Math.sin(ph * 11 + k * 2.2), w2 = Math.sin(ph * 7.3 + k); res[k] = { env, h: [sd * (1.3 + .25 * w2), 2.7 + .85 * w, .35 + .4 * Math.cos(ph * 11 + k * 2.2)] }; }
    }
    else if (G.type === 'tread') { // treading water calmly: hands sweep small circles beside the body
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, a = ph * 4.2 + k * Math.PI; res[k] = { env, h: [sd * (1.3 + .16 * Math.cos(a)), 1.75 + .14 * Math.sin(a), .55 + .22 * Math.cos(a)] }; }
    }
    else if (G.type === 'cough') { // clearing the throat: fist in front of the mouth, little bumps; other hand on the belly
      const b = .05 * Math.max(0, Math.sin(ph * 14)); res[k0] = { env, h: [sd0 * .18, 2.4 + b, 1.15 - b], head: true }; res[1 - k0] = { env, h: [-sd0 * .55, 1.45, .95] };
    }
    else if (G.type === 'windup') { // getting ready: elbows back and fists low at the hips, then a quick forward push at the end
      const u = clamp((t - G.t0) / Math.max(.1, G.t1 - G.t0), 0, 1), go = smooth(.78, 1, u);
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; res[k] = { env, h: [sd * lerp(1.15, .55, go), lerp(1.5, 2.25, go), lerp(-.25, 1.25, go)] }; }
    }
    else if (G.type === 'blow') { // both hands frame the mouth as he pushes the air out
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1, o = smooth(G.t0 + .12, G.t0 + .3, t); res[k] = { env, h: [sd * (.5 + .55 * o), 2.35 + .1 * o, 1.15 - .25 * o], head: true }; }
    }
    else if (G.type === 'kantong') { // hands in the front pockets (The Notebook pose): hands sink into the body at the hips, elbows a little out
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; res[k] = { env, h: [sd * .62, .98 + .01 * Math.sin(ph * 1.3 + k), .3], hs: .6 }; }
    }
    else if (G.type === 'gaya') { // showing off: finger gun at the camera, other hand on the hip
      const d = [-.18, .06, 1], dl = Math.hypot(...d); res[k0] = { env, h: [sd0 * .85, 2.35, 1.35], point: true, dir: d.map(v => v / dl) }; res[1 - k0] = HIP(-sd0);
    }
  }
  // swinging arms while running (if hands are free)
  const ra = runAmt(o);
  if (ra > .05) { const ph = (o.dist || 0) * Math.PI * 2.4; for (let k = 0; k < 2; k++) if (!res[k]) { const sd = k ? 1 : -1, sw = Math.sin(ph + k * Math.PI); res[k] = { env: ra, h: [sd * 1.05, 1.5 + .25 * Math.abs(sw), .35 + .55 * sw] }; } }
  return res;
}
function bodyPose(t) { // extra sway from gestures
  let roll = 0, lean = 0, yaw = 0;
  for (const G of TL.gest) { if (t < G.t0 || t > G.t1) continue; const env = gEnv(G, t), ph = t - G.t0;
    if (G.type === 'dance') roll += .14 * Math.sin(ph * 7) * env;
    if (G.type === 'cheer') roll += .06 * Math.sin(ph * 9) * env;
    if (G.type === 'push') roll += -G.side * .2 * env;
    if (G.type === 'lookout') { lean += .1 * env; yaw += .32 * Math.sin(ph * 5) * env; }
    if (G.type === 'facepalm') lean += .12 * env;
    if (G.type === 'think') { roll += .08 * env; lean += .05 * env; }
    if (G.type === 'spank') { const u = ((t - G.t0) % .24) / .24; roll += -(G.side || 1) * (.1 + .08 * Math.sin(u * Math.PI * 2)) * env; }
    if (G.type === 'throw') { const u = (t - G.t0) / (G.t1 - G.t0); lean += (u < .45 ? -.12 * Math.sin(u / .45 * Math.PI / 2) : .16 * Math.sin(clamp((u - .45) / .4, 0, 1) * Math.PI)) * env; }
    if (G.type === 'cross') roll += -.05 * env;
    if (G.type === 'flail') { roll += .12 * Math.sin(ph * 9) * env; lean += .06 * Math.sin(ph * 6.5) * env; }
    if (G.type === 'cough') lean += (.08 + .05 * Math.max(0, Math.sin(ph * 14))) * env;
    if (G.type === 'windup') { const u = clamp((t - G.t0) / Math.max(.1, G.t1 - G.t0), 0, 1); lean += (-.14 * smooth(0, .4, u) + .3 * smooth(.78, 1, u)) * env; }
    if (G.type === 'blow') lean += .1 * env;
    if (G.type === 'kantong') { lean += -.05 * env; roll += .035 * env; }
    if (G.type === 'gaya') { roll += -(G.side || 1) * .1 * env; yaw += (G.side || 1) * .18 * env; }
    if (G.type === 'crownlift') { roll += -(G.side || 1) * .05 * env; lean += -.05 * env; }
    if (G.type === 'knock') lean += .06 * env * Math.max(0, Math.sin((t - G.t0) * Math.PI * 2 * 3.5));
    if (G.type === 'shrug' || G.type === 'facepalm') roll += .07 * env; }
  return { roll, lean, yaw };
}
function rotFromY(d) { // rotation matrix taking +Y to d
  const y = [0, 1, 0]; const ax = [y[1] * d[2] - y[2] * d[1], y[2] * d[0] - y[0] * d[2], y[0] * d[1] - y[1] * d[0]]; const sn = Math.hypot(...ax), cs = d[1];
  if (sn < 1e-6) return mat.id(); const k = ax.map(v => v / sn), ang = Math.atan2(sn, cs), c = Math.cos(ang), s = Math.sin(ang), C = 1 - c, [x, yy, z] = k;
  return Float32Array.of(c + x * x * C, yy * x * C + z * s, z * x * C - yy * s, 0, x * yy * C - z * s, c + yy * yy * C, z * yy * C + x * s, 0, x * z * C + yy * s, yy * z * C - x * s, c + z * z * C, 0, 0, 0, 0, 1);
}

/* ---------- character (shared by video mode and reaction mode) ---------- */
// look: optional extra head rotation {rx: nod, ry: turn, rz: tilt} about the neck
function posePion(base, t, gs, look, hurt) {
  const hy = PH.hy.p, hz = PH.hz.p, hx = PH.hx.p, hs = 1 + hy * .5;
  const HR = look && (look.rx || look.ry || look.rz) ? mat.chain(mat.T(0, 2.25, 0), mat.RY(look.ry || 0), mat.RX(look.rx || 0), mat.RZ(look.rz || 0), mat.T(0, -2.25, 0)) : null;
  const hb = HR ? mat.mul(base, HR) : base;
  const headM = mat.chain(hb, mat.T(hx * .8, 2.95 + hy * .9, hz * .8), mat.RX(hz * .7), mat.RZ(-hx * .7 + .03 * Math.sin(t * 2.1)), mat.S(1 / Math.sqrt(hs), .96 * hs, 1 / Math.sqrt(hs)));
  const cw = PH.cx ? [PH.cx.p, PH.cz.p, PH.cy.p] : [0, 0, 0]; // crown lags behind the head and wobbles on it (follow-through)
  const CLf = crownLiftAt(t), hu = (typeof window !== 'undefined' && window.HAIR_UP) || 0;
  let hbC = CLf.u ? mat.mul(hb, crownLiftM(CLf.u, CLf.side)) : hb; if (hu) hbC = mat.mul(hbC, mat.T(0, .62 * hu, 0)); // magic hair lifts the crown
  const crownM = mat.chain(hbC, mat.T(hx * .9, 3.55 + hy * .9 + .96 * (hs - 1) + cw[2], hz * .9), mat.RX(hz * .7), mat.RZ(-.1 - hx * .7 + .03 * Math.sin(t * 2.1)), mat.T(0, -.35, 0), mat.RZ(cw[0] + .7 * hx), mat.RX(cw[1] - .7 * hz), mat.T(0, .35, 0));
  const crownH = hurt ? mat.chain(crownM, mat.T(.2 * hurt, -.12 * hurt, .05), mat.RZ(-.42 * hurt), mat.RX(.12 * hurt)) : crownM; // knocked askew
  const collarM = mat.chain(base, mat.T(0, 2.05, 0), mat.S(1, 1, .8));
  deformCape(t);
  const arms = [], hands = [null, null];
  for (let k = 0; k < 2; k++) {
    const g = gs[k]; if (!g) continue; const side = k ? 1 : -1; const S = SHOULDER(side);
    const e = easeOutBack(clamp(g.env, 0, 1)); const start = [S[0] + side * .15, S[1], S[2] + .15];
    const gh = g.head && HR ? mat.xform(HR, [...g.h, 1]) : g.h; // hands on the head follow its turn
    const Hh = [lerp(start[0], gh[0], e), lerp(start[1], gh[1], e), lerp(start[2], gh[2], e)];
    const mid = [(S[0] + Hh[0]) / 2 + side * .3, (S[1] + Hh[1]) / 2 - .25, (S[2] + Hh[2]) / 2 + .2];
    buildArm(M.arm[k], S, mid, Hh, .15 * g.env, .13 * g.env);
    const hsz = clamp(g.env * 1.1, 0, 1) * (g.hs ?? 1); // hs < 1: a hand half hidden (hands in pockets)
    const handM = mat.chain(base, mat.T(...Hh), mat.S(hsz, hsz, hsz));
    let fing = null, tip = null;
    if (g.point) { const d = g.dir; const R = rotFromY(d); fing = mat.chain(base, mat.T(Hh[0] + d[0] * .32, Hh[1] + d[1] * .32, Hh[2] + d[2] * .32), R, mat.S(hsz, hsz, hsz)); tip = mat.chain(base, mat.T(Hh[0] + d[0] * .53, Hh[1] + d[1] * .53, Hh[2] + d[2] * .53), mat.S(hsz, hsz, hsz)); }
    const shM = mat.chain(base, mat.T(...S), mat.S(g.env, g.env, g.env));
    arms.push({ mesh: M.arm[k], handM, fing, tip, shM }); hands[k] = { M: handM, env: g.env, p: Hh };
  }
  return { headM, crownM: crownH, collarM, arms, hands, crownLift: CLf.u };
}
// face: {ex: exprAt(), blink, talk: 0..3, exp, tint}
function drawPion(PP, base, VP, L, face) {
  const { headM, crownM, collarM, arms } = PP, { ex, blink, talk, exp, tint, backView } = face, hurt = face.hurt || 0, glasses = face.glasses || 0, det = face.det || 0, doc = face.doc || 0, hair = face.hair || 0, swim = face.swim || 0;
  SOOT = .7 * hurt;
  const BAND = [.98, .97, .93], PLST = [.97, .8, .6], NS = { noSoot: true };
  const bandM = mat.chain(headM, mat.RZ(.5), mat.RX(-.3), mat.T(0, .12, 0), mat.S(1.0, 1.0, 1.0)), knotM = mat.chain(headM, mat.RZ(.5), mat.RX(-.3), mat.T(1.0, .12, .15));
  const pl = (x, y, z, rz) => mat.chain(base, mat.T(x, y, z), mat.RY(Math.atan2(x, z)), mat.RX(-.32), mat.RZ(rz));
  const plasters = hurt ? [pl(-.24, 1.2, .53, .6), pl(-.24, 1.2, .55, -.6)] : [];
  // ---- character
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT);
  const TH = .09, TS = .05;
  // outlines
  drawOutline(M.body, base, VP, TH); drawOutline(M.collar, collarM, VP, TH * .8); drawOutline(M.head, headM, VP, TH);
  const hatM = mat.chain(headM, mat.T(0, .62, -.08), mat.RX(-.32), mat.S(.86, .52, .86)), brimM = mat.chain(headM, mat.T(0, .58, -.02), mat.RX(-.32), mat.S(.98, .05, 1.2)), bowM = mat.chain(headM, mat.T(0, 1.13, -.32), mat.RX(-.32), mat.S(1.4, .6, .9));
  if (det) { drawOutline(M.hatDome, hatM, VP, .05); drawOutline(M.hatBrim, brimM, VP, .05); drawOutline(M.hatBow, bowM, VP, .04); }
  if (!det && !doc) drawOutline(M.crownBand, crownM, VP, TS, false, true); if (!det && !doc) drawOutline(M.crownRing, mat.mul(crownM, mat.T(0, .19, 0)), VP, TS);
  if (!det && !doc) for (const sp of M.spikes) { const mm = mat.chain(crownM, mat.RY(sp.a), mat.T(0, .17, .8), mat.RX(.12)); drawOutline(sp.cone, mm, VP, TS); drawOutline(sp.ball, mat.mul(mm, mat.T(0, sp.h, 0)), VP, TS); }
  if (!swim) { drawOutline(M.cape, base, VP, TH, true, !backView); // seen from behind, a two-sided shell would sit in front of the cape
  for (const tm of [M.edgeL, M.edgeR, M.hem]) drawOutline(tm, base, VP, .06);
  drawOutline(M.ermColl, mat.mul(base, mat.T(0, 2.12, 0)), VP, .06); }
  if (hurt) { drawOutline(M.bandRing, bandM, VP, .05); drawOutline(M.bandKnot, knotM, VP, .05); for (const m of plasters) drawOutline(M.plaster, m, VP, .035); }
  for (const A of arms) { drawOutline(A.mesh, base, VP, .06); drawOutline(M.shoulder, A.shM, VP, .06); drawOutline(M.hand, A.handM, VP, .07); if (A.fing) { drawOutline(M.finger, A.fing, VP, .05); drawOutline(M.fingerTip, A.tip, VP, .05); } }
  // fills
  drawToon(M.body, base, VP, L, swim ? { tex: TEX.swim, ao: [1.55, 2.02, 9, 10, .2] } : doc ? { color: SCRUB, ao: [1.55, 2.02, 9, 10, .32] } : { vc: true, ao: [1.55, 2.02, 9, 10, .32] });     // body darkens under the fur collar
  for (const r of M.rings) drawToon(r.mesh, mat.mul(base, mat.T(0, r.y, 0)), VP, L, { color: RINGC });
  drawToon(M.collar, collarM, VP, L, swim ? { color: SWIM_NAVY } : doc ? { color: SCRUB } : { vc: true });
  drawToon(M.head, headM, VP, L, { vc: true, ao: [-.5, -.86, .36, .64, .26 * (1 - clamp(PP.crownLift || 0, 0, 1))] }); // chin over the collar, forehead under the crown
  const GS = .85; // toon specular + fresnel glint on gold
  if (det) { drawToon(M.hatDome, hatM, VP, L, { tex: TEX.tweed, noSoot: true }); drawToon(M.hatBrim, brimM, VP, L, { tex: TEX.tweed, noSoot: true }); drawToon(M.hatBow, bowM, VP, L, { color: [.3, .18, .09], noSoot: true }); }
  if (!det && !doc) drawToon(M.crownBand, crownM, VP, L, { color: GOLD, dbl: true, spec: GS });
  if (!det && !doc) drawToon(M.crownRing, mat.mul(crownM, mat.T(0, .19, 0)), VP, L, { color: GOLD, spec: GS });
  if (!det && !doc) for (const sp of M.spikes) { const mm = mat.chain(crownM, mat.RY(sp.a), mat.T(0, .17, .8), mat.RX(.12)); drawToon(sp.cone, mm, VP, L, { color: GOLD, spec: GS }); drawToon(sp.ball, mat.mul(mm, mat.T(0, sp.h, 0)), VP, L, { color: GOLD, spec: GS }); }
  if (!swim) { drawToon(M.cape, base, VP, L, det ? { tex: TEX.plaid, dbl: true } : doc ? { color: COAT, dbl: true } : { color: CRIMSON, dbl: true });   // detective: tan plaid Inverness cape
  for (const tm of [M.edgeL, M.edgeR, M.hem]) drawToon(tm, base, VP, L, det ? { tex: TEX.tweed } : doc ? { color: COAT2 } : { tex: TEX.erm });
  drawToon(M.ermColl, mat.mul(base, mat.T(0, 2.12, 0)), VP, L, det ? { tex: TEX.tweed } : doc ? { color: COAT2 } : { tex: TEX.erm }); }
  if (doc) drawDoctorKit(PP, base, VP, L, face);
  if (hair > .001) drawHair(headM, VP, L, hair);
  if (hurt) { drawToon(M.bandRing, bandM, VP, L, Object.assign({ color: BAND }, NS)); drawToon(M.bandKnot, knotM, VP, L, Object.assign({ color: BAND }, NS)); for (const m of plasters) drawToon(M.plaster, m, VP, L, Object.assign({ color: PLST }, NS)); }
  arms.forEach((A, i) => { A.col = hurt && arms.length && A.mesh === M.arm[1] ? BAND : doc ? COAT : swim ? SKIN : ARMC; });
  for (const A of arms) { drawToon(A.mesh, base, VP, L, { color: A.col, noSoot: A.col !== ARMC && A.col !== SKIN }); drawToon(M.shoulder, A.shM, VP, L, { color: A.col, noSoot: A.col !== ARMC }); drawToon(M.hand, A.handM, VP, L, { color: GLOVE }); if (A.fing) { drawToon(M.finger, A.fing, VP, L, { color: GLOVE }); drawToon(M.fingerTip, A.tip, VP, L, { color: GLOVE }); } }
  // magnifying glass in the hand of an active 'magnify' gesture
  if (face.t !== undefined && PP.hands) for (const G of TL.gest) {
    if (G.type !== 'magnify' || face.t < G.t0 || face.t > G.t1) continue; const Hd = PP.hands[(G.side || 1) > 0 ? 1 : 0]; if (!Hd) continue;
    const s0 = clamp(Hd.env * 1.2, 0, 1), up = mat.chain(Hd.M, mat.S(s0, s0, s0)), ring = mat.chain(up, mat.T(0, .55, .12), mat.RX(Math.PI / 2 - .25));
    drawOutline(M.magHandle, mat.mul(up, mat.T(0, .1, 0)), VP, .04); drawOutline(M.magRing, ring, VP, .04);
    drawToon(M.magHandle, mat.mul(up, mat.T(0, .1, 0)), VP, L, { color: [.45, .22, .1] }); drawToon(M.magRing, ring, VP, L, { color: GOLD, spec: .85 });
    drawToon(M.magLens, ring, VP, L, { color: [.72, .9, 1], spec: 1.2, noSoot: true });
  }
  // face
  const faceTex = k => faceTexture(k, blink, talk);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
  gl.useProgram(faceP.p); gl.uniformMatrix4fv(faceP.u.uVP, false, VP); gl.uniformMatrix4fv(faceP.u.uM, false, headM); gl.uniformMatrix3fv(faceP.u.uNM, false, normalMat(headM));
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, faceTex(ex.a)); gl.uniform1i(faceP.u.uA, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, faceTex(ex.b)); gl.uniform1i(faceP.u.uB, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, GLOSS); gl.uniform1i(faceP.u.uGloss, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, det ? MONOCLE : glasses === 3 ? GOGGLES : glasses === 2 ? NERD : glasses ? GLASSES : HURT); gl.uniform1i(faceP.u.uHurt, 3); gl.uniform1f(faceP.u.uHurtA, det ? 1 : glasses ? Math.min(1, glasses) : hurt);
  gl.uniform1f(faceP.u.uMix, ex.m); gl.uniform1f(faceP.u.uSq, ex.sq); gl.uniform1f(faceP.u.uFlash, FLASH); gl.uniform1f(faceP.u.uExp, clamp(exp * 1.05, .5, 1)); gl.uniform3fv(faceP.u.uTint, tint.map(v => lerp(1, v, .3)));
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); M.face.draw();
  gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(true); gl.disable(gl.BLEND); SOOT = 0;
}

/* ---------- doctor kit: head mirror, stethoscope, chest pocket with a pen (costume doc) ---------- */
let DOCM = null;
function docMeshes() {
  if (DOCM) return DOCM;
  const L = [[-.36, 2.2, .5], [-.4, 2.0, .62], [-.34, 1.78, .7], [-.22, 1.56, .74], [-.12, 1.38, .76]];   // over the collar, down the chest
  const R = [[.36, 2.2, .5], [.4, 2.0, .6], [.3, 1.8, .66], [.12, 1.62, .72], [-.06, 1.42, .78], [-.12, 1.38, .78]];
  DOCM = { tubeL: new Mesh(tubeGeo(spline3(L, 6), .045, 8, 1)), tubeR: new Mesh(tubeGeo(spline3(R, 6), .045, 8, 1)) };
  return DOCM;
}
function spline3(P, div) { // Catmull-Rom through 3D points
  const out = [];
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let k = 0; k < div; k++) { const t = k / div, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(P[P.length - 1]); return out;
}
function drawDoctorKit(PP, base, VP, L, face) {
  const D = docMeshes(), headM = PP.headM;
  // head mirror: white band around the head, round silver mirror with a hole on the forehead
  const band = mat.chain(headM, mat.T(0, .36, 0), mat.S(.96, .9, .96)), mir = mat.chain(headM, mat.T(0, .56, 1.0), mat.RX(Math.PI / 2 - .55));
  drawOutline(M.bandRing, band, VP, .04); drawToon(M.bandRing, band, VP, L, { color: [.95, .95, .96], noSoot: true });
  drawOutline(M.magLens, mat.mul(mir, mat.S(1.0, 2.2, 1.0)), VP, .035); drawToon(M.magLens, mat.mul(mir, mat.S(1.0, 2.2, 1.0)), VP, L, { color: SILVER, spec: 1.4, noSoot: true });
  drawToon(M.magRing, mat.mul(mir, mat.S(.9, .9, .9)), VP, L, { color: [.58, .61, .66], spec: 1 });
  drawToon(M.magLens, mat.chain(mir, mat.T(0, .05, 0), mat.S(.24, 1, .24)), VP, L, { color: [.16, .18, .22] });
  // stethoscope around the neck, chest piece on the scrubs
  for (const tb of [D.tubeL, D.tubeR]) { drawOutline(tb, base, VP, .025); drawToon(tb, base, VP, L, { color: [.18, .19, .22], spec: .5 }); }
  const cp = mat.chain(base, mat.T(-.12, 1.36, .8), mat.RX(Math.PI / 2 - .25), mat.S(.62, 1.4, .62));
  drawOutline(M.magLens, cp, VP, .03); drawToon(M.magLens, cp, VP, L, { color: SILVER, spec: 1.2, noSoot: true });
  // chest pocket (on the scrubs, his left) with a pen clipped in it
  const p = DOC_POCKET, pk = mat.chain(base, mat.T(...p), mat.RY(Math.atan2(p[0], p[2])), mat.RX(-.18), mat.S(.62, 1.75, 1.2));
  drawOutline(M.plaster, pk, VP, .03); drawToon(M.plaster, pk, VP, L, { color: [.24, .45, .62] });
  const pen = mat.chain(base, mat.T(p[0] - .07, p[1] + .16, p[2] + .02), mat.RY(Math.atan2(p[0], p[2])), mat.S(.55, .8, .55));
  drawOutline(M.finger, pen, VP, .025); drawToon(M.finger, pen, VP, L, { color: [.12, .2, .55] });
}
/* ---------- magic hair: spiky cartoon hair that grows out from under the crown and pushes it up (amt 0..1) */
const HAIR_SPIKES = [ // [root normal on the head], [spike direction], base radius, length
  [[0, .5, .86], [0, .95, .55], .34, 1.05], [[.36, .55, .75], [.45, .9, .35], .28, .85], [[-.36, .55, .75], [-.45, .9, .3], .28, .82],
  [[.2, .85, .45], [.15, 1, .1], .3, .95], [[-.2, .85, .45], [-.2, 1, .05], .3, .9], [[0, .9, -.2], [0, 1, -.45], .32, .85],
  [[-.82, .5, .2], [-1, .5, -.05], .26, .62], [[.82, .5, .2], [1, .5, -.05], .26, .62], [[-.55, .6, -.55], [-.7, .55, -.7], .28, .66],
  [[.55, .6, -.55], [.7, .55, -.7], .28, .66], [[0, .55, -.85], [0, .45, -1], .3, .7]];
let HAIRCONE = null;
function drawHair(headM, VP, L, amt) {
  if (!HAIRCONE) HAIRCONE = new Mesh(cone(1, 1, 18));
  const k = Math.max(0, amt), HC = [.36, .19, .09], HL = [.55, .32, .16];
  HAIR_SPIKES.forEach(([n, d, r, h], i) => {
    const nl = Math.hypot(...n), dl = Math.hypot(...d), p = n.map(v => v / nl * .9), dir = d.map(v => v / dl);
    const Mh = mat.chain(headM, mat.T(...p), rotFromY(dir), mat.S(r * Math.min(1, k * 1.3), h * k, r * Math.min(1, k * 1.3)));
    drawOutline(HAIRCONE, Mh, VP, .045); drawToon(HAIRCONE, Mh, VP, L, { color: i % 3 === 0 ? HL : HC, spec: .6, noSoot: true });
  });
}

/* ---------- shared 2D fx: smoke from a burnt pion, anger mark, sweat drop ---------- */
function drawSmoke(g, head, t, amt) {
  if (!head || amt <= 0) return; const R = head.r;
  for (let i = 0; i < 7; i++) { const ph = (t * .55 + i / 7) % 1, x = head.p[0] + R * (.25 * Math.sin(i * 2.7) + .35 * Math.sin(ph * 6 + i)) , y = head.p[1] - R * (1.1 + 2.2 * ph);
    const r = R * (.16 + .35 * ph), a = amt * .45 * Math.sin(Math.PI * ph);
    const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(70,62,58,${a})`); q.addColorStop(1, 'rgba(70,62,58,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
}
function drawAnger(g, head, t, k) { // pulsing anger mark + steam jets from the head
  if (!head || k <= 0) return; const R = head.r, pulse = 1 + .18 * Math.max(0, Math.sin(t * 16)), x = head.p[0] + R * .85, y = head.p[1] - R * 1.05, s = R * .32 * pulse * k;
  g.save(); g.translate(x, y); g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2 + .78); g.beginPath(); g.moveTo(s * .25, s * .9); g.quadraticCurveTo(s * .3, s * .3, s * .9, s * .25);
    g.strokeStyle = '#2a0f08'; g.lineWidth = s * .55; g.stroke(); g.strokeStyle = '#ff2b2b'; g.lineWidth = s * .32; g.stroke(); g.restore(); }
  g.restore();
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const ph = (t * 2.2 + i / 3 + (sd > 0 ? .5 : 0)) % 1, px = head.p[0] + sd * R * (.9 + .5 * ph), py = head.p[1] - R * (.6 + .9 * ph), r = R * (.12 + .22 * ph) * k;
    g.fillStyle = `rgba(255,255,255,${.85 * (1 - ph) * k})`; g.strokeStyle = `rgba(90,90,90,${.5 * (1 - ph) * k})`; g.lineWidth = r * .15; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.stroke(); }
}
function drawSweat(g, head, t, k, t0) { // big anime sweat drop sliding down the temple
  if (!head || k <= 0) return; const R = head.r, e = t - t0, slide = Math.min(1, e * .6), x = head.p[0] - R * .78, y = head.p[1] - R * .55 + R * .35 * slide, s = R * .26 * Math.min(1, e * 6) * k;
  g.save(); g.translate(x, y); g.beginPath(); g.moveTo(0, -s * 1.3); g.bezierCurveTo(s * .9, -s * .2, s * .8, s, 0, s); g.bezierCurveTo(-s * .8, s, -s * .9, -s * .2, 0, -s * 1.3);
  g.fillStyle = '#9fdcff'; g.fill(); g.lineWidth = s * .18; g.strokeStyle = '#2a6f9a'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-s * .3, 0, s * .15, s * .3, .3, 0, 7); g.fill(); g.restore();
}

function drawQuestionV(g, t, head, E) { if (!head) return; const R = head.r; for (const [ox, oy, sc, dl] of [[0, 0, 1, 0], [-.85, .25, .62, .18], [.85, .2, .55, .32]]) { const e = t - E.t0 - dl; if (e < 0) continue; const k = springPop(e * 1.3) * (1 - smooth(E.t1 - .15, E.t1, t)); if (k <= 0) continue;
  g.save(); g.translate(head.p[0] + ox * R, head.p[1] - R * 1.55 + oy * R); g.rotate(.15 * Math.sin(t * 5 + dl * 9)); g.scale(k, k); g.font = `900 ${Math.round(R * .95 * sc)}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = R * .15 * sc; g.strokeStyle = '#2a0f08'; g.strokeText('?', 0, 0); g.fillStyle = '#ffd23a'; g.fillText('?', 0, 0); g.restore(); } }
function drawAha(g, head, t, E) { // eureka: big "!" + glowing light bulb popping above the head
  if (!head) return; const e = t - E.t0, k = springPop(e * 1.3) * (1 - smooth(E.t1 - .15, E.t1, t)); if (k <= .01) return;
  const R = head.r, x = head.p[0] + R * .15, y = head.p[1] - R * 1.75;
  g.save(); g.translate(x, y); g.scale(k, k); g.rotate(.1 * Math.sin(e * 9));
  g.globalCompositeOperation = 'lighter'; const q = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.1); q.addColorStop(0, 'rgba(255,240,150,.8)'); q.addColorStop(1, 'rgba(255,220,80,0)'); g.fillStyle = q; g.beginPath(); g.arc(0, 0, R * 1.1, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#2a0f08'; g.lineWidth = R * .07; g.fillStyle = '#fff07a';
  g.beginPath(); g.arc(0, -R * .1, R * .42, Math.PI * .8, Math.PI * 2.2); g.lineTo(R * .18, R * .42); g.lineTo(-R * .18, R * .42); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#9aa6ab'; g.fillRect(-R * .2, R * .42, R * .4, R * .2); g.strokeRect(-R * .2, R * .42, R * .4, R * .2);
  g.strokeStyle = '#ffd23a'; g.lineCap = 'round'; g.lineWidth = R * .07; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .45, r0 = R * .62, r1 = R * (.82 + .08 * Math.sin(e * 20 + i)); g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 - R * .1); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 - R * .1); g.stroke(); }
  g.restore();
  g.save(); g.translate(head.p[0] + R * 1.05, head.p[1] - R * 1.1); g.scale(k, k); g.rotate(.18); g.font = `900 ${Math.round(R * 1.0)}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = R * .16; g.strokeStyle = '#2a0f08'; g.strokeText('!', 0, 0); g.fillStyle = '#ff3b30'; g.fillText('!', 0, 0); g.restore();
}
function drawPoof(g, cx, cy, R, t, E) { // cartoon smoke puff: grows fast, holds, dissolves
  const u = (t - E.t0) / (E.t1 - E.t0); if (u < 0 || u > 1) return; const grow = 1 - Math.pow(1 - Math.min(1, u * 2.5), 3), fade = 1 - smooth(.55, 1, u);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + i * .37, d = R * (.15 + .55 * grow) * (.7 + .3 * ((i * 7) % 5) / 5), r = R * (.28 + .22 * grow) * (.75 + .25 * ((i * 3) % 4) / 4);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .85 - u * R * .15;
    g.fillStyle = `rgba(250,248,240,${.97 * fade})`; g.strokeStyle = `rgba(60,50,45,${.55 * fade})`; g.lineWidth = R * .02; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = `rgba(255,255,250,${fade})`; g.beginPath(); g.arc(cx, cy, R * (.3 + .4 * grow), 0, 7); g.fill();
  g.strokeStyle = `rgba(255,210,60,${fade})`; g.lineCap = 'round'; g.lineWidth = R * .03; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r0 = R * (.6 + .6 * grow), r1 = r0 + R * .2 * (1 - u); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
}
function drawStamp(g, t, E, cx, cy, size) { // slammed rubber stamp text
  const es = t - E.t0; if (es < 0) return; const lines = E.text.split('|');
  const sIn = es < .12 ? lerp(2.6, 1, easeIO(es / .12)) : 1 + .06 * Math.exp(-8 * (es - .12)) * Math.sin(30 * (es - .12)), shake = es < .3 ? Math.sin(es * 90) * 12 * (1 - es / .3) : 0;
  g.save(); g.globalAlpha = clamp(es / .05, 0, 1) * (1 - smooth(E.t1 - .15, E.t1, t)); g.translate(cx + shake, cy); g.rotate(-.18); g.scale(sIn, sIn);
  const w = size * 3.9, h = size * (1.35 * lines.length + .4); g.lineWidth = size * .13; g.strokeStyle = '#d4232c'; g.fillStyle = 'rgba(212,35,44,.12)';
  rr(g, -w / 2, -h / 2, w, h, size * .3); g.fill(); g.stroke(); g.lineWidth = size * .05; rr(g, -w / 2 + size * .2, -h / 2 + size * .2, w - size * .4, h - size * .4, size * .2); g.stroke();
  g.fillStyle = '#d4232c'; g.font = `900 ${size}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.3 + size * .05)); g.restore();
}

/* ---------- main draw ---------- */
const COAT = [.95, .96, .98], COAT2 = [.86, .9, .96], SCRUB = [.45, .72, .86], SILVER = [.82, .85, .9];
const GOLD = [1, .773, .192], CRIMSON = [.784, .078, .227], RINGC = [.14, .05, .05], GLOVE = [1, .95, .88], ARMC = [.96, .32, .22];
const SWIM_NAVY = [.07, .2, .52], SKIN = [1, .5, .22]; // costume swim: striped swimsuit, bare (orange) arms
function renderFrame(f) {
  const o = PLAN[f], t = (f - SUBU) / 30; window.__curF = f; window.__probe = [];
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.depthMask(true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fx.canvas.width, fx.canvas.height); fx.setTransform(fx.canvas.width / W, 0, 0, fx.canvas.height / H, 0, 0); window.__head = null;
  cv.style.opacity = '1';
  if (!o.vis) { drawFX(f, t, o); return; }
  simulate(f);
  const sc = SHOTCAM[o.s], cam = makeCam(o.pitch || sc.pitch, sc.fov), VP = cam.VP; window.EYE = [0, HC, 0];
  const m = motion(f); FLASH = m.flash; cv.style.opacity = String(m.op);
  const P = cam.ground(o.x, o.y), s = o.h / cam.unitPx(P) * m.sAll;
  const a = m.a, sy = 1 + a, sxz = 1 / Math.sqrt(1 + a);
  // body lean from springs (follow-through)
  const leanX = PH.hz.p * -.6, leanZ = PH.hx.p * .6;
  let fallM = mat.id();
  if (m.fall > 1e-4) { const th = TL.fall.dirDeg * Math.PI / 180, d = [Math.cos(th), 0, -Math.sin(th)], rim = 1.3 * U * s; const k = [-d[2], 0, d[0]]; const kl = Math.hypot(...k); fallM = mat.chain(mat.T(d[0] * rim, 0, d[2] * rim), axisAngle(k.map(v => -v / kl), m.fall), mat.T(-d[0] * rim, 0, -d[2] * rim)); }
  const ra = runAmt(o), bp = bodyPose(t);
  let yaw = o.yaw, runM = mat.id();
  if (ra > 0) { const pf = 1 / Math.max(.25, Math.sin((o.pitch || sc.pitch) * Math.PI / 180)); let dx = o.dx, dz = o.dy * pf; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    yaw = lerp(o.yaw, clamp(dx * 1.1, -.95, .95), .75 * ra); runM = axisAngle([dz, 0, -dx], .2 * ra); }
  const base = mat.chain(mat.T(P[0], m.yOff * s, P[2]), fallM, runM, mat.RZ(-(o.track ? o.roll : RL.p) - bp.roll), mat.RY(yaw + bp.yaw), mat.RX(bp.lean), mat.RX(leanX), mat.RZ(leanZ), mat.S(sxz * s * U, sy * s * U, sxz * s * U));
  // ---- lighting from footage
  const bg = sampleBox(f, o.x - .5 * o.h, o.y - o.h, o.x + .5 * o.h, o.y + .05 * o.h);
  const fl = sampleBox(f, o.x - .4 * o.h, o.y - .04 * o.h, o.x + .4 * o.h, o.y + .14 * o.h);
  const lum = luma(bg), lf = Math.max(.04, luma(fl));
  const tint = bg.map(v => lerp(1, clamp(v / Math.max(lum, .05), .45, 1.8), .55));
  const exp = clamp(.4 + .95 * lum, .32, 1.1) * sc.exp;
  const L = {
    dir: lightDir(sc, o.s), exp,
    key: sc.key.map((v, i) => v * sc.keyI * lerp(1, tint[i], .35)),
    amb: tint.map(v => v * .36), sky: tint.map(v => v * .2),
    gnd: fl.map(v => clamp(v / lf, .5, 1.6) * .12),
    rim: tint.map(v => v * .1 * lum),
  };
  const gs = gestureState(t, o), PP = posePion(base, t, gs, null, o.hurt || 0), arms = PP.arms;
  window.__clap = null;
  if (gs.clap && gs.clap.k > .01) { const w = mat.xform(base, [...gs.clap.p, 1]); window.__clap = { p: cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]), k: gs.clap.k, r: s * U * cam.unitPx(P) }; }
  // ---- ground: contact blob + soft projected shadow
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);
  const air = clamp(m.yOff / .3, 0, 1);
  const shadowCol = fl.map(v => v * .22);
  const blob = (r, al) => { const bm = mat.chain(mat.T(P[0], .001, P[2]), mat.S(r, 1, r)); gl.useProgram(blobP.p); gl.uniformMatrix4fv(blobP.u.uVP, false, VP); gl.uniformMatrix4fv(blobP.u.uM, false, bm); gl.uniform4fv(blobP.u.uCol, [...shadowCol, al]); blobMesh.draw(); };
  blob(s * .34 * (1 - .35 * air), .55 * (1 - .6 * air) * m.sAll);              // soft ambient pool
  blob(s * .2 * (1 - .2 * air), .42 * Math.pow(1 - air, 2) * m.sAll);           // contact shadow: tight and dark where the base touches the ground
  if (!o.noshadow) gl.enable(gl.STENCIL_TEST);
  const NS = o.noshadow ? 0 : 16, shA = sc.shA * (1 - .5 * air) * clamp(.6 + .8 * lum, .7, 1.1) * m.sAll;
  const lray = lightDir(sc, o.s).map(v => -v), fadeH = 4.65 * s * U;
  const casters = [[M.body, base], [M.head, PP.headM], [M.crownBand, PP.crownM], [M.cape, base], [M.collar, PP.collarM]];
  for (const A of arms) casters.push([A.mesh, base], [M.hand, A.handM], [M.shoulder, A.shM]);
  for (let i = 0; i < NS; i++) { // area light: 16 light directions on a Vogel disk -> smooth penumbra that widens with height
    gl.clear(gl.STENCIL_BUFFER_BIT); gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    const ang = i * 2.39996, rr = .13 * Math.sqrt((i + .5) / NS), jit = [Math.cos(ang) * rr, Math.sin(ang) * rr];
    for (const [ms, mm] of casters) drawShadowMesh(ms, mm, VP, lray, jit, [...shadowCol, shA / NS * 1.85], fadeH);
  }
  gl.disable(gl.STENCIL_TEST);
  const ex = exprAt(t), blink = blinking(t) && ex.since > .25 && !m.flash;
  drawPion(PP, base, VP, L, { ex, blink, talk: 0, exp, tint, hurt: o.hurt || 0, glasses: o.glasses || 0, det: o.det || 0, t });
  { const hw = mat.xform(PP.headM, [0, 0, 0, 1]); window.__head = { p: cam.toPix([hw[0] / hw[3], hw[1] / hw[3], hw[2] / hw[3]]), r: s * U * cam.unitPx(P) }; }
  const pix = (M, v) => { const w = mat.xform(M, [...v, 1]); return cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]); };
  window.__probe = [window.__head.p, cam.toPix(P), pix(PP.crownM, [0, 1.0, 0]), pix(base, [1, 0, 0]), pix(base, [-1, 0, 0]), ...PP.hands.filter(Boolean).map(Hd => { const w = mat.xform(Hd.M, [0, 0, 0, 1]); return cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]); })];
  FLASH = 0; drawFX(f, t, o);
  if (o.hurt) drawSmoke(fx, window.__head, t, o.hurt * (o.smoke ?? .6));
  for (const E of (TL.fx || [])) { if (t < E.t0 || t > E.t1) continue; const k = smooth(E.t0, E.t0 + .15, t) * (1 - smooth(E.t1 - .15, E.t1, t));
    if (E.type === 'anger') drawAnger(fx, window.__head, t, k); if (E.type === 'sweat') drawSweat(fx, window.__head, t, k, E.t0);
    if (E.type === 'aha') drawAha(fx, window.__head, t, E); if (E.type === 'ask') drawQuestionV(fx, t, window.__head, E); }
}

/* ---------- 2D overlay effects ---------- */
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function springPop(e) { if (e <= 0) return 0; return 1 - Math.exp(-7 * e) * Math.cos(13 * e); }
function miniPion(g, cx, cy, R, col) {
  g.save(); g.translate(cx, cy);
  g.fillStyle = col.bg; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip();
  g.fillStyle = col.fg; g.strokeStyle = '#2a0d08'; g.lineWidth = R * .07;
  g.beginPath(); g.ellipse(0, R * .8, R * .62, R * .2, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-R * .5, R * .78); g.quadraticCurveTo(-R * .18, R * .2, -R * .2, -R * .05); g.lineTo(R * .2, -R * .05); g.quadraticCurveTo(R * .18, R * .2, R * .5, R * .78); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -R * .3, R * .34, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffc531'; g.beginPath(); g.moveTo(-R * .26, -R * .58); g.lineTo(-R * .3, -R * .86); g.lineTo(-R * .12, -R * .7); g.lineTo(0, -R * .92); g.lineTo(R * .12, -R * .7); g.lineTo(R * .3, -R * .86); g.lineTo(R * .26, -R * .58); g.closePath(); g.fill(); g.stroke();
  // tiny suspicious face
  g.strokeStyle = '#2a0d08'; g.lineWidth = R * .06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-R * .2, -R * .32); g.lineTo(-R * .06, -R * .3); g.moveTo(R * .06, -R * .3); g.lineTo(R * .2, -R * .32); g.moveTo(-R * .1, -R * .16); g.lineTo(R * .1, -R * .19); g.stroke();
  g.restore();
  g.lineWidth = R * .09; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
  g.restore();
}
const FAKE_CARDS = [
  { t: 10.0, x: 70, y: 430, rot: -3, name: '@pawn_blue', msg: 'FAKE!!', col: { bg: '#cfe6ff', fg: '#2f6fd6' } },
  { t: 10.22, x: 250, y: 600, rot: 2.5, name: '@rook.black', msg: "it's CGI bro", col: { bg: '#e2e2e2', fg: '#2b2b2b' } },
  { t: 10.44, x: 60, y: 770, rot: -2, name: '@knight_green', msg: 'so edited lol', col: { bg: '#d8f5d0', fg: '#2f9a3a' } },
  { t: 10.66, x: 220, y: 940, rot: 3, name: '@bishop.purple', msg: '100% FAKE', col: { bg: '#eedcff', fg: '#7b3fc4' } },
];
function drawFX(f, t, o) {
  const g = fx;
  // ---- "people think it's fake" comment cards + stamp
  const F = TL.fake;
  if (t >= F.t0 && t <= F.t1 + .05) {
    const out = smooth(F.t1 - .16, F.t1, t);
    for (const c of FAKE_CARDS) {
      const e = t - c.t; if (e < 0) continue;
      const k = springPop(e) * (1 - out), al = clamp(e / .08, 0, 1) * (1 - out);
      const w = 560, h = 148;
      g.save(); g.globalAlpha = al; g.translate(c.x + w / 2, c.y + h / 2 + (1 - Math.min(1, k)) * 40); g.rotate(c.rot * Math.PI / 180); g.scale(k, k);
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
      g.fillStyle = '#ffffff'; rr(g, -w / 2, -h / 2, w, h, 34); g.fill();
      g.shadowColor = 'transparent';
      miniPion(g, -w / 2 + 78, 0, 52, c.col);
      g.fillStyle = '#7a7a7a'; g.font = '600 26px Inter, Arial Black, sans-serif'; g.textBaseline = 'middle'; g.fillText(c.name, -w / 2 + 150, -30);
      g.fillStyle = '#e0242c'; g.font = '900 54px Inter, Arial Black, sans-serif'; g.fillText(c.msg, -w / 2 + 148, 22);
      g.restore();
    }
    // stamp
    const es = t - 10.95;
    if (es > 0) {
      const sIn = es < .12 ? lerp(2.4, 1, easeIO(es / .12)) : 1 + .06 * Math.exp(-8 * (es - .12)) * Math.sin(30 * (es - .12));
      const shake = es < .3 ? (Math.sin(es * 90) * 10 * (1 - es / .3)) : 0;
      g.save(); g.globalAlpha = clamp(es / .06, 0, 1) * (1 - out); g.translate(540 + shake, 700); g.rotate(-.2); g.scale(sIn, sIn);
      g.lineWidth = 16; g.strokeStyle = '#e0242c'; g.fillStyle = 'rgba(224,36,44,.12)';
      rr(g, -250, -95, 500, 190, 30); g.fill(); g.stroke();
      g.lineWidth = 6; rr(g, -228, -73, 456, 146, 20); g.stroke();
      g.fillStyle = '#e0242c'; g.font = '900 150px Inter, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FAKE', 0, 8);
      g.restore();
    }
  }
  // ---- subscribe press: button press shade + ripple
  for (const G of TL.gest) if (G.type === 'press') {
    const e = t - G.hit; const B = TL.button;
    if (e > -0.02 && e < .3) { const k = 1 - clamp(e / .3, 0, 1); g.save(); g.globalAlpha = .28 * k; g.fillStyle = '#300'; rr(g, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, (B.y1 - B.y0) / 2); g.fill(); g.restore(); }
    if (e > 0 && e < .55) { const q = e / .55; for (let i = 0; i < 2; i++) { const qq = clamp(q - i * .18, 0, 1); if (qq <= 0) continue; g.save(); g.globalAlpha = (1 - qq) * .9; g.strokeStyle = '#fff'; g.lineWidth = 10 * (1 - qq) + 2; g.beginPath(); g.arc(G.tgt[0], G.tgt[1], 20 + qq * 110, 0, 7); g.stroke(); g.restore(); } }
  }
  // ---- teleport: soft glow + rising light motes (smooth, no hard shapes)
  for (const ev of TPEV) {
    const st = ev.kind === 'out' ? ev.t - .3 : ev.t - .05, e = t - st, dur = .7; if (e < 0 || e > dur) continue;
    const q = e / dur, cx = ev.x, cy = ev.y - ev.h * .5, h = ev.h;
    const peak = ev.kind === 'out' ? smooth(0, .4, q) * (1 - smooth(.45, 1, q)) : (1 - smooth(.1, 1, q)) * smooth(0, .06, q);
    g.save(); g.globalCompositeOperation = 'lighter';
    const R = h * (.55 + .25 * q);
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    rg.addColorStop(0, `rgba(255,236,190,${.55 * peak})`); rg.addColorStop(.45, `rgba(255,200,120,${.22 * peak})`); rg.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = rg; g.beginPath(); g.ellipse(cx, cy, R * .8, R * 1.05, 0, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) {
      const sd = Math.sin(i * 12.9898 + ev.t * 7.1) * 43758.5453, rnd = sd - Math.floor(sd), rnd2 = (rnd * 7.31) % 1;
      const ang = i / 16 * Math.PI * 2 + rnd, rad0 = h * (.12 + .3 * rnd2), rise = h * (.15 + .5 * rnd) * easeIO(q);
      const x = cx + Math.cos(ang) * rad0 * (1 + .6 * q), y = cy + Math.sin(ang) * rad0 * .9 - rise;
      const r = h * (.028 + .03 * rnd), al = peak * (.7 + .3 * Math.sin(e * 18 + i));
      const pg = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
      pg.addColorStop(0, `rgba(255,252,235,${al})`); pg.addColorStop(.4, `rgba(255,214,120,${al * .6})`); pg.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = pg; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
    }
    g.restore();
  }
  // ---- running dust puffs
  if (o.vis && runAmt(o) > .2) {
    for (let k = 0; k < 8; k++) {
      const g2 = PLAN[f - k * 2]; if (!g2 || !g2.vis || g2.arr !== o.arr || runAmt(g2) < .2) continue;
      const age = k * 2 / 30, q = age / .5; if (q >= 1) continue;
      const r = g2.h * (.05 + .07 * q), al = .32 * (1 - q) * runAmt(g2);
      const bx = g2.x - (g2.dx || 0) * g2.h * .12, by = g2.y - g2.h * .02 - q * g2.h * .05;
      const dg = g.createRadialGradient(bx, by, 0, bx, by, r);
      dg.addColorStop(0, `rgba(235,220,200,${al})`); dg.addColorStop(1, 'rgba(235,220,200,0)');
      g.fillStyle = dg; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
    }
  }
  // ---- clap: little impact strokes where the hands meet
  if (o.vis && window.__clap) {
    const C = window.__clap, R = C.r;
    g.save(); g.globalAlpha = C.k; g.strokeStyle = '#fff6d8'; g.lineCap = 'round'; g.lineWidth = Math.max(3, R * .07);
    for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) { const a = (sd > 0 ? 0 : Math.PI) + i * .55 * sd, r0 = R * (.42 + .15 * (1 - C.k)), r1 = r0 + R * .32 * C.k;
      g.beginPath(); g.moveTo(C.p[0] + Math.cos(a) * r0, C.p[1] - Math.sin(a) * r0); g.lineTo(C.p[0] + Math.cos(a) * r1, C.p[1] - Math.sin(a) * r1); g.stroke(); }
    g.restore();
  }
  // ---- burning hole: flames + smoke pouring out of the tandir, comic yell
  if (o.holeFx) { const [hx, hy, hr] = o.holeFx;
    for (const E of (TL.fx || [])) {
      if (E.type === 'flame' && t >= E.t0 && t <= E.t1) { const k = smooth(E.t0, E.t0 + .1, t) * (1 - smooth(E.t1 - .3, E.t1, t));
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { const ph = (t * 1.8 + i / 14) % 1, sx = hx - hr * .7 + (i * 37 % 100) / 100 * hr * 1.0 + Math.sin(t * 9 + i) * hr * .06, sy = hy - ph * hr * 1.1, r = hr * (.22 - .14 * ph) * k;
          const q = g.createRadialGradient(sx, sy, 0, sx, sy, r); q.addColorStop(0, `rgba(255,240,170,${.9 * (1 - ph)})`); q.addColorStop(.4, `rgba(255,130,30,${.7 * (1 - ph)})`); q.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = q; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); }
        g.restore();
        for (let i = 0; i < 8; i++) { const ph = (t * .7 + i / 8) % 1, sx = hx - hr * .4 + Math.sin(i * 2.3 + t) * hr * .35, sy = hy - hr * (.3 + 2.2 * ph), r = hr * (.15 + .3 * ph);
          const q = g.createRadialGradient(sx, sy, 0, sx, sy, r); q.addColorStop(0, `rgba(60,55,52,${.5 * Math.sin(Math.PI * ph) * k})`); q.addColorStop(1, 'rgba(60,55,52,0)'); g.fillStyle = q; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); } }
      if (E.type === 'yell' && t >= E.t0 && t <= E.t1) { const e = t - E.t0, k = springPop(e * 1.4) * (1 - smooth(E.t1 - .15, E.t1, t)), sh = Math.sin(e * 70) * hr * .025;
        g.save(); g.translate(hx - hr * .55 + sh, hy - hr * .95 - e * hr * .25); g.rotate(-.18); g.scale(k, k);
        g.font = `900 ${Math.round(hr * .42)}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = hr * .07; g.strokeStyle = '#2a0f08'; g.strokeText(E.text, 0, 0); g.fillStyle = '#ffd23a'; g.fillText(E.text, 0, 0); g.restore(); }
    }
  }
  // ---- extra timeline effects: electric zap around the pion, "ting" twinkle where it vanished
  for (const E of (TL.fx || [])) {
    if (E.type === 'zap' && t >= E.t0 && t <= E.t1 && o.vis) {
      const q = (t - E.t0) / (E.t1 - E.t0), cx = o.x, cy = o.y - o.h * .5, R = o.h * .6, sd = Math.floor(t * 30);
      g.save(); g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      rg.addColorStop(0, `rgba(255,80,60,${.55 * (1 - q)})`); rg.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, R * 1.4, 0, 7); g.fill(); g.restore();
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) { let a = i / 7 * Math.PI * 2 + sd * 1.3, x = cx + Math.cos(a) * R * .35, y = cy + Math.sin(a) * R * .45; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { const rnd = Math.sin(i * 17.1 + k * 7.7 + sd * 3.3) * .7; x += Math.cos(a + rnd) * R * .2; y += Math.sin(a + rnd) * R * .2; g.lineTo(x, y); }
        g.strokeStyle = '#ff2a2a'; g.lineWidth = o.h * .045; g.stroke(); g.strokeStyle = '#fff6f0'; g.lineWidth = o.h * .016; g.stroke(); }
      g.restore();
    }
    if (E.type === 'hit' && t >= E.t && t <= E.t + .32 && !(E.cut && t >= E.cut)) { // comic impact burst + word
      const q = (t - E.t) / .32, k = springPop(q * .6 + .05), R = E.r * (.6 + .4 * k);
      g.save(); g.translate(E.x, E.y); g.rotate(E.rot || -.15); g.globalAlpha = 1 - smooth(.6, 1, q);
      g.fillStyle = '#fff3a8'; g.strokeStyle = '#2a0f08'; g.lineWidth = R * .07; g.beginPath();
      for (let k2 = 0; k2 < 16; k2++) { const rr2 = k2 % 2 ? R * .55 : R, aa = k2 / 16 * Math.PI * 2; g.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2 * .8); } g.closePath(); g.fill(); g.stroke();
      g.font = `900 ${Math.round(R * .52)}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = R * .1; g.strokeText(E.text, 0, 2); g.fillStyle = '#e8243a'; g.fillText(E.text, 0, 2); g.restore();
    }
    if (E.type === 'twinkle' && t >= E.t && t <= E.t + .6) {
      const q = (t - E.t) / .6, k = Math.sin(Math.PI * Math.min(1, q * 1.6)) * (1 - q * .4), r = E.r * k;
      g.save(); g.translate(E.x, E.y); g.rotate(q * 2.5); g.fillStyle = '#fffbe0'; g.strokeStyle = '#ffd23a'; g.lineWidth = r * .12;
      g.beginPath(); for (let i = 0; i < 8; i++) { const rr2 = i % 2 ? r * .22 : r, a = i / 8 * Math.PI * 2; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill(); g.stroke();
      g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); rg.addColorStop(0, `rgba(255,240,180,${.8 * k})`); rg.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r * 1.6, 0, 7); g.fill(); g.restore();
    }
  }
  // ---- impact burst when the gear hits
  if (o.fallT !== null && o.fallT !== undefined) {
    const e = t - TL.fall.hit;
    if (e > -0.02 && e < .3 && o.vis) {
      const q = clamp(e / .3, 0, 1), cx = o.x - o.h * .28, cy = o.y - o.h * .45, R = o.h * (.22 + .25 * q);
      g.save(); g.globalAlpha = 1 - q; g.translate(cx, cy); g.rotate(.2);
      g.fillStyle = '#fff3a8'; g.strokeStyle = '#3a1a12'; g.lineWidth = 6;
      g.beginPath(); for (let k = 0; k < 20; k++) { const rr2 = k % 2 ? R * .5 : R; const aa = k / 20 * Math.PI * 2; g.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e0242c'; g.font = `900 ${Math.round(R * .55)}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BONK', 0, 2);
      g.restore();
    }
    // dizzy stars while lying
    const ed = t - (TL.fall.hit + .3);
    if (ed > 0 && t < TL.fall.up + .1 && window.__head) {
      const hp = window.__head.p, R = window.__head.r;
      for (let i = 0; i < 3; i++) {
        const ang = ed * 5 + i * 2.09, x = hp[0] + Math.cos(ang) * R * 1.3, y = hp[1] - R * .9 + Math.sin(ang) * R * .4;
        g.save(); g.globalAlpha = clamp(ed / .1, 0, 1) * (1 - smooth(TL.fall.up - .1, TL.fall.up + .1, t)); g.fillStyle = '#ffd23a'; g.strokeStyle = '#3a1a12'; g.lineWidth = 3;
        const r = R * .28; g.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? r * .45 : r; const aa = k / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(aa) * rr2, y + Math.sin(aa) * rr2); } g.closePath(); g.fill(); g.stroke(); g.restore();
      }
    }
  }
}
// sub-frame render for motion blur. u > 0: u frames BEFORE f, u < 0: |u| frames AFTER f (centred shutter).
// Plan geometry and spring state are interpolated with the neighbouring frame on that side.
const LERPK = ['x', 'y', 'h', 'yaw', 'roll', 'rx', 'ry', 'rh', 'pitch', 'lift', 'sq', 'dist', 'spd'];
function renderFrameAt(f, u) {
  const o = PLAN[f];
  if (!u || !o.vis) return renderFrame(f);
  const g = u > 0 ? f - 1 : f + 1, q = PLAN[g], k = Math.abs(u);
  const cont = !!(q && q.vis && q.s === o.s && q.arr === o.arr);
  let oi = o, Sf = null, Sg = null;
  if (cont) { simulate(g); Sg = SNAP.get(g); simulate(f); Sf = SNAP.get(f);
    oi = Object.assign({}, o); for (const n of LERPK) if (typeof o[n] === 'number' && typeof q[n] === 'number') oi[n] = lerp(o[n], q[n], k); }
  else simulate(f);
  if (Sf && Sg) setPhys(Sf, Sg, k);
  PLAN[f] = oi; SUBU = cont ? u : 0; NOSIM = true;
  try { renderFrame(f); } finally { PLAN[f] = o; SUBU = 0; NOSIM = false; if (Sf) setPhys(Sf, Sf, 1); }
}
window.renderFrame = renderFrame;
// flatten character (with its opacity) + fx overlay into one canvas inside the page (no DOM screenshot)
function composeFrame() {
  const o = window.__grabCv || (window.__grabCv = document.createElement('canvas')); o.width = cv.width; o.height = cv.height; const g = o.getContext('2d', { willReadFrequently: true });
  const oc = PLAN && PLAN[window.__curF] && PLAN[window.__curF].occl; // character goes into a hole: visible above its centre line or inside its opening
  g.save(); if (oc) { const kx = o.width / W, ky = o.height / H; g.beginPath(); g.rect(0, 0, o.width, oc[1] * ky); g.ellipse(oc[0] * kx, oc[1] * ky, oc[2] * kx, oc[3] * ky, 0, 0, 7); g.clip(); }
  g.globalAlpha = +cv.style.opacity || 0; g.drawImage(cv, 0, 0); g.globalAlpha = 1; g.restore(); g.drawImage(fx.canvas, 0, 0);
  return o;
}
window.grabFrame = () => composeFrame().toDataURL('image/png').split(',')[1];
// render frame f with motion blur (window.MB.maxN samples at most; 1 = off) and return the PNG
window.grabFrameMB = f => mbCapture(u => renderFrameAt(f, u), composeFrame, () => window.__probe || []).toDataURL('image/png').split(',')[1];
window.__ready = true;
