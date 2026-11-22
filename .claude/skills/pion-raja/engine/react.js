'use strict';
/* Reaction mode: Pion Raja on a transparent background (or in the castle), talking / reacting.
   Every syllable kicks jelly springs (squash/stretch + wobble), the mouth opens with the loudness,
   expressions / gestures / head turns / camera moves / props / effects come from the cue file. Driven by react_render.js. */
let RX = null;
// framing presets in model units (pion: base 0, collar 2.05, head centre 2.95, crown top ~4.55):
// cy = height the camera aims at, vh = how much of the pion fits vertically on screen
const FRAMES = {
  small: { cy: 2.3, vh: 12 },     // whole pion, ~38% of the screen height
  mid: { cy: 2.4, vh: 9.5 },      // whole pion, ~48% of the screen height (default)
  big: { cy: 2.6, vh: 7 },        // whole pion, ~65% of the screen height
  full: { cy: 2.4, vh: 5.7 },     // whole pion, fills the screen
  half: { cy: 2.7, vh: 4.9 },     // most of the body, big
  close: { cy: 3.0, vh: 4.6 },    // head + collar big, body to the waist
  face: { cy: 3.2, vh: 3.6 },     // extreme close-up, head fills the width
  bottom: { cy: 4.0, vh: 8.5 },   // pion in the lower half, room for the video above
};
const frameOf = v => typeof v === 'string' ? (FRAMES[v] || FRAMES.mid) : v;
window.setReact = d => {
  RX = d; RX.bangS = new Set(d.bangF || []); RX.takeS = new Set(d.takeF || []);
  TL.expr = d.expr.length ? d.expr : [[0, 'datar']]; TL.gest = d.gest; TL.startle = d.startle;
  RX.fr = Object.assign({ cx: 0, yaw: 0, tiltDeg: 6 }, FRAMES[d.frame] || FRAMES.mid, d.frameOverride || {});
  RX.fly = (d.fly || []).slice().sort((p, q) => p.t0 - q.t0); RX.hover = d.hover || [];
  RX.cams = (d.cams || []).slice().sort((p, q) => p.t - q.t); RX.shakes = d.shakes || []; RX.turns = (d.turns || []).slice().sort((p, q) => p.t - q.t);
  RX.fxl = d.fx || []; window.STYLE2D = RX.fxl.some(e => e.type === 'style2d'); RX.bookTitle = d.bookTitle || null; RX.floatK = (d.float || []).slice().sort((p, q) => p.t - q.t); RX.panicK = (d.panic || []).slice().sort((p, q) => p.t - q.t);
  RX.imgs = {}; for (const E of RX.fxl) if (E.type === 'photo' && !RX.imgs[E.src]) { const im = new Image(); im.src = E.src; RX.imgs[E.src] = im; }
  rLast = -10; RS.clear(); return RX.n;
};

/* ---------- flying in / out (pure functions of time) ---------- */
const FLY_FROM = {
  jauh: [[.6, 2.5, -130], [-3, 6, -70]],     // straight out of the distance toward the camera
  kiri: [[-26, 7, -60], [-13, 1, -28]],      // swoops in from screen-left
  kanan: [[26, 7, -60], [13, 1, -28]],
  atas: [[2, 34, -50], [4, 14, -24]],        // drops in from above
  bawah: [[-1, -26, -45], [-3, -9, -22]],
  kamera: [[0, 1.5, 12], [0, 1.6, 8]],       // starts huge right in front of the lens (he flew into the camera in the previous clip), backs off to his spot
};
const bez = (a, b, c, d, u) => a.map((_, i) => { const v = 1 - u; return v * v * v * a[i] + 3 * v * v * u * b[i] + 3 * v * u * u * c[i] + u * u * u * d[i]; });
function flyPos(t) { // -> {p, vis, op, flying}
  const F = RX.fly; let ev = null; for (const e of F) if (t >= e.t0) ev = e;
  if (!ev) return F.length && !F[0].out ? { p: [0, 0, 0], vis: false, op: 0, flying: false } : { p: [0, 0, 0], vis: true, op: 1, flying: false };
  const u = clamp((t - ev.t0) / ev.dur, 0, 1), [S, C1] = FLY_FROM[ev.dir] || FLY_FROM.jauh, C2 = ev.dir === 'kamera' ? [0, 1, 3] : [0, .9, -9], E = [0, 0, 0];
  if (!ev.out) { if (u >= 1) return { p: E, vis: true, op: 1, flying: false }; return { p: bez(S, C1, C2, E, 1 - Math.pow(1 - u, 3)), vis: true, op: ev.dir === 'kamera' ? 1 : smooth(0, .12, u), flying: true }; }
  if (u >= 1) return { p: S, vis: false, op: 0, flying: false };
  return { p: bez(E, C2, C1, S, u * u * u), vis: true, op: 1 - smooth(.8, 1, u), flying: true };
}
function flyoutStretch(t) { // crouch before taking off, stretch while shooting away
  let a = 0;
  for (const ev of RX.fly) { if (!ev.out) continue; const e = t - ev.t0;
    if (e >= -.3 && e < 0) a -= .17 * smooth(-.3, -.04, e);
    else if (e >= 0 && e < .35) { const u = e / .35; a += -.17 * (1 - smooth(0, .25, u)) + .16 * Math.sin(Math.PI * u) * (1 - u * .5); } }
  return a;
}
function flyVel(t) { const dt = 1 / 30, a = flyPos(t - dt).p, b = flyPos(t).p; return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt, (b[2] - a[2]) / dt]; }
/* ---------- floating in water: `<t> float <level 0..1> [dur]` and `<t> panic <0..1> [dur]` (eased keys) */
function keyed(K, t) { let cur = 0; for (const k of K) { if (t < k.t) break; const u = k.dur > 0 ? easeIO3(clamp((t - k.t) / k.dur, 0, 1)) : 1; cur = lerp(cur, k.v, u); } return cur; }
function floatState(t) {
  const lv = keyed(RX.floatK || [], t), pn = keyed(RX.panicK || [], t);
  if (lv < 1e-4 && pn < 1e-4) return { x: 0, y: 0, roll: 0, pitch: 0, lv: 0, pn: 0 };
  const y = lv * (1.35 + .3 * Math.sin(t * 1.45) + .1 * Math.sin(t * 2.9 + 1.1)) + pn * .16 * Math.sin(t * 6.3);
  const x = lv * (.34 * Math.sin(t * .62 + .4) + .1 * Math.sin(t * 1.7)) + pn * .14 * Math.sin(t * 4.9 + .7);
  const roll = lv * (.17 * Math.sin(t * .93 + 1.2) + .05 * Math.sin(t * 2.1)) + pn * .2 * Math.sin(t * 5.7);
  const pitch = lv * (.1 * Math.sin(t * .71 + .3)) + pn * .09 * Math.sin(t * 4.3 + 2);
  return { x, y, roll, pitch, lv, pn };
}
function hoverAmt(t) { let on = 1, t0 = -9; for (const [ht, v] of RX.hover) if (t >= ht) { on = v; t0 = ht; } return on ? smooth(t0, t0 + .6, t) : 1 - smooth(t0, t0 + .6, t); }

/* ---------- camera moves, body turns ---------- */
const easeIO3 = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function lightAt(t, L0) { // timed light cues crossfade over 0.4 s
  const Ls = RX.lights || []; let cur = L0;
  for (const K of Ls) { if (t < K.t) break; const tgt = Object.assign({}, L0, K.L), u = smooth(K.t, K.t + .4, t);
    const o = {}; for (const k in tgt) o[k] = Array.isArray(tgt[k]) ? tgt[k].map((v, i) => lerp((cur[k] || tgt[k])[i], v, u)) : lerp(cur[k] ?? tgt[k], tgt[k], u); cur = o; }
  return cur;
}
function planAt(t) { // camera plan sampled per frame by react_render.js (camplan.js), lerped for motion-blur subframes
  const Z = RX.camz; if (!Z || !Z.length) return null;
  const x = clamp(t * RX.fps, 0, Z.length - 1), i = Math.floor(x), j = Math.min(i + 1, Z.length - 1), u = x - i;
  return Z[i].map((v, k) => lerp(v, Z[j][k], u));
}
function camAt(t) { // framing animated by "cam" keys: each eases from wherever the camera is to its target
  let cur = { cy: RX.fr.cy, vh: RX.fr.vh, cx: RX.fr.cx, roll: RX.fr.roll || 0 };
  for (let i = 0; i < RX.cams.length; i++) {
    const K = RX.cams[i]; if (t < K.t) break;
    const tgt = { cy: K.cy ?? cur.cy, vh: K.vh ?? cur.vh, cx: K.cx ?? cur.cx, roll: K.roll ?? 0 }, nx = RX.cams[i + 1], te = nx && nx.t < t ? nx.t : t;
    const u = K.dur > 0 ? easeIO3(clamp((te - K.t) / K.dur, 0, 1)) : 1;
    cur = { cy: lerp(cur.cy, tgt.cy, u), vh: lerp(cur.vh, tgt.vh, u), cx: lerp(cur.cx, tgt.cx, u), roll: lerp(cur.roll, tgt.roll, u) };
  }
  let sx = 0, sy = 0; for (const S of RX.shakes) { const e = t - S.t; if (e < 0 || e > S.dur) continue; const a = S.amp * (1 - e / S.dur); sx += a * Math.sin(e * 71) * .5; sy += a * Math.sin(e * 53 + 1) * .5; }
  const P = planAt(t); if (P && (P[0] !== 1 || P[3])) { // zoom toward the face, corner offset, dutch angle (held until the next key)
    const [zf, ox, oy, rl] = P, faceY = RX.faceCy || 3.0, a = clamp((1 - 1 / zf) / (1 - 1 / 1.5), 0, 1.2);
    cur.vh /= zf; cur.cy += (faceY - cur.cy) * .85 * a - oy * cur.vh; cur.cx += ox * cur.vh * ASPECT; cur.roll += rl; }
  return Object.assign({}, RX.fr, cur, { cx: cur.cx + sx * cur.vh * .02, cy: cur.cy + sy * cur.vh * .02 });
}
function turnAt(t) { let y = 0; for (const T of RX.turns) { if (t < T.t) break; const u = T.dur > 0 ? easeIO3(clamp((t - T.t) / T.dur, 0, 1)) : 1; y = lerp(y, T.deg * Math.PI / 180, u); } return y; }
const fxActive = (type, t) => RX.fxl.filter(e => e.type === type && t >= e.t0 && t <= e.t1);

/* ---------- jelly / talking state (simulated sequentially from frame 0, so any frame renders deterministically) */
const J = { sq: mkSpring(), wob: mkSpring(), nod: mkSpring(), rx: mkSpring(), ry: mkSpring(), rz: mkSpring(),
  sway: mkSpring(), hop: mkSpring(), tilt: mkSpring(), lean: mkSpring() }; // acting layer: weight shift, little hops, head tilts, leaning in
let rLast = -10, mouth = 0, mouthHold = 0, wobSign = 1;
function resetReact() { for (const k in J) { J[k].p = 0; J[k].v = 0; } resetPhysics(); mouth = 0; mouthHold = 0; wobSign = 1; }
function lookAt(t) { let tg = [0, 0, 0]; for (const L of RX.look) if (t >= L[0]) tg = L.slice(1); return tg; }
function rStep(f) {
  const t = f / RX.fps, dt = 1 / RX.fps, e = RX.env[f] || 0, on = RX.onset[f] || 0, J0 = RX.jelly;
  if (on > 0) { // syllable hit: squash down, wobble sideways (alternating), little nod, head jiggle
    J.sq.v -= on * 1.9 * J0; J.wob.v += wobSign * on * 1.2 * J0; wobSign = -wobSign; J.nod.v += on * 1.1 * J0; PH.hy.v -= on * 1.4 * J0;
  }
  // ---- acting layer (deterministic, from the audio and cues): makes him move like he means it
  const A = RX.acting ?? 1;
  if (A > 0) {
    if (on > .7) { J.hop.v += (on - .5) * 1.1 * A; J.nod.v += on * .45 * A; }                       // stressed syllable: tiny bounce + nod
    if (RX.bangS && RX.bangS.has(f)) { J.sq.v += .9 * A; J.hop.v += 2.4 * A; J.tilt.v += wobSign * 1.3 * A; } // "!" word: stretch up into a hop
    if (RX.takeS && RX.takeS.has(f)) { J.sq.v += .5 * A; J.hop.v += 1.3 * A; J.tilt.v -= wobSign * 1.8 * A; J.sway.v += wobSign * 1.6 * A; } // new expression: a "take"
  }
  const quiet = J.lean.p < .06, swayT = A * ((.05 + .9 * J.lean.p * .12) * Math.sin(t * 1.9) + .03 * Math.sin(t * .73 + 1.3));
  const glance = A && quiet ? .2 * Math.sin(t * .8) * smooth(.06, .02, J.lean.p) : 0;      // idle: looks around when silent
  const lk = lookAt(t), n = 4, h = dt / n, hop0 = J.hop.p, hopV0 = J.hop.v;
  for (let i = 0; i < n; i++) {
    stepSpring(J.sq, e * .035 * J0, 230, 8.5, h);   // loud = stretched a bit taller
    stepSpring(J.wob, 0, 140, 6.5, h);
    stepSpring(J.nod, e * .05, 120, 8, h);         // lean into the words
    stepSpring(J.rx, lk[1], 70, 11, h); stepSpring(J.ry, lk[0] + glance, 70, 11, h); stepSpring(J.rz, lk[2], 70, 11, h);
    stepSpring(J.sway, swayT, 28, 8, h); stepSpring(J.hop, 0, 90, 7.5, h); stepSpring(J.tilt, 0, 55, 6.5, h); stepSpring(J.lean, e * A, 6, 5, h);
  }
  if (hop0 > .004 && J.hop.p <= .004 && hopV0 < 0) { // landing from an acting hop: jelly squash, the crown pops up and settles
    const imp = Math.min(2.2, -hopV0);
    J.sq.v -= imp * .75; PH.hy.v -= imp * .45; PH.cy.v += imp * .32; J.wob.v += wobSign * imp * .25; }
  const fv = flyVel(t), fp = flyPos(t), fpPrev = flyPos(t - dt);
  physStep(fv[0] * .25, J.sq.v * 5 + fv[1] * .25 + J.hop.v * .9, -J.nod.v * 3 + Math.min(fv[2] * .12, 7), dt); // jelly + flight wind on head and cape
  if (fpPrev.flying && !fp.flying && fp.vis) { J.sq.v -= 1.1; J.wob.v += .6; PH.hy.v -= 1; } // arrival: jelly "boing"
  // mouth level from loudness, with a 2-frame hold so it never flickers
  const want = e < .1 ? 0 : e < .32 ? 1 : e < .62 ? 2 : 3;
  if (mouthHold > 0) mouthHold--; else if (want !== mouth) { mouth = want; mouthHold = Math.max(1, Math.round(RX.fps / 30)); }
}

/* portrait camera: long lens aimed at the pion, slightly above eye level */
function reactCam(fr) {
  const fov = 28 * Math.PI / 180, dist = fr.vh / 2 / Math.tan(fov / 2), tl = fr.tiltDeg * Math.PI / 180;
  const az = (fr.orbit || 0) * Math.PI / 180;   // orbit: the camera circles Pion (world-space light stays put, so the lit side changes with the view)
  const tgt = [fr.cx, fr.cy, 0], eye = [fr.cx + Math.sin(az) * Math.cos(tl) * dist, fr.cy + Math.sin(tl) * dist, Math.cos(az) * Math.cos(tl) * dist];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fw = nrm(sub(tgt, eye)), r0 = nrm(cross(fw, [0, 1, 0])), u0 = cross(r0, fw), ro = (fr.roll || 0) * Math.PI / 180, cr = Math.cos(ro), sr = Math.sin(ro);
  const r = r0.map((v, i) => v * cr + u0[i] * sr), u = u0.map((v, i) => -r0[i] * sr + v * cr); // dutch angle
  const V = Float32Array.of(r[0], u[0], -fw[0], 0, r[1], u[1], -fw[1], 0, r[2], u[2], -fw[2], 0, -dot(r, eye), -dot(u, eye), dot(fw, eye), 1);
  const VP = mat.mul(mat.persp(fov, ASPECT, .05, 300), V);
  const toPix = p => { const c = mat.xform(VP, [p[0], p[1], p[2], 1]); return [(c[0] / c[3] * .5 + .5) * W, (1 - (c[1] / c[3] * .5 + .5)) * H]; };
  return { VP, eye, toPix, ppu: H / fr.vh, fw };
}
const LIGHT = { dir: [-.5, .75, .45], exp: 1, key: [.8, .73, .63], amb: [.36, .36, .36], sky: [.2, .2, .2], gnd: [.12, .12, .12], rim: [.07, .07, .07] };
const LIGHT_CASTLE = { dir: [-.45, .75, .5], exp: 1, key: [.86, .72, .55], amb: [.36, .3, .27], sky: [.22, .18, .15], gnd: [.16, .07, .06], rim: [.22, .14, .06] };

/* ---------- props: phone, SUBSCRIBE sheet, thrown QR splat ---------- */
function boxGeo(w, h, d) {
  const g = G(), hw = w / 2, hh = h / 2, hd = d / 2;
  const F = [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]];
  for (const [n, u, v] of F) { const b = g.pos.length / 3; for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { for (let i = 0; i < 3; i++) g.pos.push(n[i] * [hw, hh, hd][i] + u[i] * su * [hw, hh, hd][i] + v[i] * sv * [hw, hh, hd][i]); g.nrm.push(...n); g.col.push(1, 1, 1); g.uv.push((su + 1) / 2, (sv + 1) / 2); } g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  return fixWinding(fin(g));
}
function planeGeo(w, h) { const g = G(); for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.pos.push(x * w / 2, y * h / 2, 0); g.nrm.push(0, 0, 1); g.col.push(1, 1, 1); g.uv.push((x + 1) / 2, (y + 1) / 2); } g.idx.push(0, 1, 2, 0, 2, 3); return fin(g); }
const PROP = {};
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return texFromCanvas(c, false); }
function initProps() {
  if (PROP.ok) return; PROP.ok = true;
  PROP.phone = new Mesh(boxGeo(.36, .66, .07)); PROP.plane = new Mesh(planeGeo(1, 1));
  PROP.bookCover = new Mesh(boxGeo(.62, .84, .035)); PROP.bookPages = new Mesh(boxGeo(.56, .78, .06)); PROP.bookSpine = new Mesh(boxGeo(.08, .84, .1));
  const goldFrame = (g, w, h) => { g.fillStyle = '#4a1530'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e6b84a'; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36); g.lineWidth = 3; g.strokeRect(32, 32, w - 64, h - 64);
    g.fillStyle = '#f2c95a'; g.textAlign = 'center'; g.textBaseline = 'middle'; };
  PROP.bookFront = canvasTex(310, 420, (g, w, h) => { // front cover of the open book (faces the camera)
    goldFrame(g, w, h); g.font = '800 34px Georgia, serif'; g.fillText('THE BOOK', w / 2, 88); g.font = 'italic 700 28px Georgia, serif'; g.fillText('of', w / 2, 128);
    g.font = '900 88px Inter, Arial Black, sans-serif'; g.fillText('LARP', w / 2, 196);
    g.beginPath(); g.arc(w / 2, 270, 18, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2 - 13, 285); g.lineTo(w / 2 + 13, 285); g.lineTo(w / 2 + 28, 338); g.lineTo(w / 2 - 28, 338); g.closePath(); g.fill(); g.fillRect(w / 2 - 36, 338, 72, 13);
    g.font = '700 18px Georgia, serif'; g.fillText('~ for true believers ~', w / 2, 378); });
  PROP.bookBack = canvasTex(310, 420, (g, w, h) => { goldFrame(g, w, h); g.font = '700 22px Georgia, serif'; g.fillText('vol. I', w / 2, h - 70);
    g.beginPath(); g.arc(w / 2, h / 2 - 10, 34, 0, 7); g.lineWidth = 6; g.strokeStyle = '#e6b84a'; g.stroke(); g.font = '900 34px Georgia, serif'; g.fillText('L', w / 2, h / 2 - 8); });
  PROP.screenScan = canvasTex(256, 470, (g, w, h) => { g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#16314d'; g.fillRect(14, 60, w - 28, h - 130);
    g.strokeStyle = '#3dff8c'; g.lineWidth = 10; const L = 46, x0 = 50, y0 = 130, s = w - 100; for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + s, y0, -1, 1], [x0, y0 + s, 1, -1], [x0 + s, y0 + s, -1, -1]]) { g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); }
    g.fillStyle = 'rgba(61,255,140,.8)'; g.fillRect(x0, y0 + s / 2 - 4, s, 8); g.fillStyle = '#fff'; g.font = '700 30px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('SCANNING...', w / 2, h - 40); });
  PROP.screenOK = canvasTex(256, 470, (g, w, h) => { g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#21c55d'; g.beginPath(); g.arc(w / 2, h / 2 - 30, 80, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 18; g.lineCap = 'round'; g.beginPath(); g.moveTo(w / 2 - 36, h / 2 - 30); g.lineTo(w / 2 - 8, h / 2); g.lineTo(w / 2 + 40, h / 2 - 62); g.stroke();
    g.fillStyle = '#ffd34d'; g.font = '900 64px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('$$$', w / 2, h - 60); });
  PROP.paper = canvasTex(600, 400, (g, w, h) => { g.fillStyle = '#2a0f08'; g.fillRect(0, 0, w, h); g.fillStyle = '#fffaf0'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#e1262c'; const bx = 60, by = 110, bw = w - 120, bh = 160; g.beginPath(); g.moveTo(bx + 30, by); g.arcTo(bx + bw, by, bx + bw, by + bh, 30); g.arcTo(bx + bw, by + bh, bx, by + bh, 30); g.arcTo(bx, by + bh, bx, by, 30); g.arcTo(bx, by, bx + bw, by, 30); g.fill();
    g.fillStyle = '#fff'; g.font = '900 78px Inter, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SUBSCRIBE', w / 2, by + bh / 2 + 4);
    g.fillStyle = '#2a0f08'; g.font = '800 34px Inter, sans-serif'; g.fillText('👑 ROYAL ORDER 👑', w / 2, 60); g.fillText('tap it. now.', w / 2, 330); });
  if (RX.paperImg) { const im = new Image(); im.onload = () => { PROP.paper = canvasTex(600, 400, (g, w, h) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
      const r = Math.max((w - 24) / im.width, (h - 24) / im.height), dw = im.width * r, dh = im.height * r; g.save(); g.beginPath(); g.rect(12, 12, w - 24, h - 24); g.clip(); g.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh); g.restore(); }); }; im.src = RX.paperImg; }   // cue `paperimg file`: a photo on the sheet
  PROP.splat = canvasTex(512, 512, (g, w, h) => { // white egg-splat sculpture with a QR in the middle (like the one in the video)
    const R = rng(5), pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 200 + R() * 46; pts.push([w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r]); }
    const path = () => { g.beginPath(); for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (!i) g.moveTo(mx, my); else g.quadraticCurveTo(p[0], p[1], mx, my); } const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); g.closePath(); };
    path(); g.lineWidth = 22; g.strokeStyle = '#2a0f08'; g.stroke(); g.fillStyle = '#fbfbf7'; g.fill();
    drawQR(g, w / 2 - 105, h / 2 - 105, 210, 909); g.lineWidth = 8; g.strokeStyle = '#ffb400'; g.strokeRect(w / 2 - 112, h / 2 - 112, 224, 224); });
}
let WILL = null;
function willTex(u) { // the last will, SUBSCRIBE revealed as it is written (u 0..1)
  if (!WILL) { WILL = { c: document.createElement('canvas'), t: null, u: -1 }; WILL.c.width = 640; WILL.c.height = 440; }
  const q = Math.round(u * 40) / 40; if (q === WILL.u && WILL.t) return WILL.t; WILL.u = q;
  const g = WILL.c.getContext('2d'), w = 640, h = 440; g.clearRect(0, 0, w, h);
  g.fillStyle = '#2a0f08'; g.fillRect(0, 0, w, h); g.fillStyle = '#fbf3df'; g.fillRect(8, 8, w - 16, h - 16);
  g.strokeStyle = 'rgba(120,90,60,.25)'; g.lineWidth = 2; for (let y = 150; y < h - 30; y += 46) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
  g.fillStyle = '#2a0f08'; g.textAlign = 'center'; g.font = '900 54px DejaVu Serif, serif'; g.fillText('LAST WILL', w / 2, 76);
  g.font = 'italic 600 24px DejaVu Serif, serif'; g.fillText('I, Pion Raja, being of burnt body & sound mind,', w / 2, 116); g.fillText('leave this final wish:', w / 2, 142);
  g.save(); g.beginPath(); g.rect(0, 150, 60 + (w - 120) * q, 200); g.clip(); g.translate(w / 2, 250); g.rotate(-.05);
  g.font = 'italic 900 92px Inter, sans-serif'; g.lineWidth = 6; g.strokeStyle = '#7a0c14'; g.strokeText('SUBSCRIBE', 0, 20); g.fillStyle = '#d0263a'; g.fillText('SUBSCRIBE', 0, 20); g.restore();
  if (q >= 1) { g.save(); g.translate(w - 110, h - 70); g.rotate(-.2); g.strokeStyle = '#d0263a'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke(); g.font = '900 20px Inter, sans-serif'; g.fillStyle = '#d0263a'; g.fillText('ROYAL', 0, -4); g.fillText('SEAL', 0, 18); g.restore();
    g.strokeStyle = '#2a0f08'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, h - 50); g.bezierCurveTo(110, h - 90, 140, h - 20, 180, h - 60); g.bezierCurveTo(200, h - 80, 220, h - 40, 260, h - 56); g.stroke(); }
  if (WILL.t) { gl.bindTexture(gl.TEXTURE_2D, WILL.t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, WILL.c); gl.generateMipmap(gl.TEXTURE_2D); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); }
  else WILL.t = texFromCanvas(WILL.c, false);
  return WILL.t;
}
// soktahu "enlightenment": the open book flares gold for ~1.5 s (light from below on his face), then dims to an ember
function nerdGlow(t) {
  let g = 0;
  for (const G of TL.gest) { if (G.type !== 'nerd' || t < G.t0 || t > G.t1) continue; const u = t - G.t0;
    g = Math.max(g, gEnv(G, t) * smooth(0, .3, u) * (1 - .85 * smooth(1.4, 2.5, u))); }
  const k = RX.fxl.filter(e => e.type === 'glow' && t >= e.t0).pop(); return g * (k ? k.amt : 1); // cue `glow <0..1>` scales the book's light
}
const GOLD_GLOW = [1.0, .8, .42];
function glowLight(L, g) { // the book becomes the key: strong gold uplight from the front, face flooded warm
  const d0 = L.dir, d1 = [.22, -.5, .84], w = .95 * g, d = d0.map((v, i) => lerp(v, d1[i], w)), dl = Math.hypot(...d);
  return Object.assign({}, L, { dir: d.map(v => v / dl), exp: (L.exp || 1) * (1 + .3 * g), key: L.key.map((v, i) => lerp(v, GOLD_GLOW[i] * 1.5, g)),
    amb: L.amb.map((v, i) => v + GOLD_GLOW[i] * .42 * g), gnd: (L.gnd || [0, 0, 0]).map((v, i) => v + GOLD_GLOW[i] * .5 * g), rim: L.rim.map((v, i) => v + GOLD_GLOW[i] * .6 * g) });
}
function drawBookGlow(t, PP, base, cam) { // "golden briefcase": light pours out of the pages onto his face
  const g = nerdGlow(t), Hd = PP.hands[1]; if (g < .02 || !Hd) return;
  const pw = mat.xform(Hd.M, [-.1, .4, .3, 1]), p = cam.toPix([pw[0] / pw[3], pw[1] / pw[3], pw[2] / pw[3]]);
  const hw = mat.xform(PP.headM, [0, -.25, .55, 1]), f = cam.toPix([hw[0] / hw[3], hw[1] / hw[3], hw[2] / hw[3]]), U = cam.ppu;
  fx.save(); fx.globalCompositeOperation = 'lighter';
  // 1) cone of light from the open pages up to the face (soft, blurred)
  const ax = f[0] - p[0], ay = f[1] - p[1], len = Math.hypot(ax, ay) || 1, nx = -ay / len, ny = ax / len, w0 = U * .22, w1 = U * 1.15;
  fx.filter = `blur(${Math.round(U * .12)}px)`;
  const lg = fx.createLinearGradient(p[0], p[1], f[0] + ax * .35, f[1] + ay * .35);
  lg.addColorStop(0, `rgba(255,246,205,${.9 * g})`); lg.addColorStop(.55, `rgba(255,214,120,${.45 * g})`); lg.addColorStop(1, 'rgba(255,190,90,0)');
  fx.fillStyle = lg; fx.beginPath();
  fx.moveTo(p[0] + nx * w0, p[1] + ny * w0); fx.lineTo(f[0] + ax * .35 + nx * w1, f[1] + ay * .35 + ny * w1);
  fx.lineTo(f[0] + ax * .35 - nx * w1, f[1] + ay * .35 - ny * w1); fx.lineTo(p[0] - nx * w0, p[1] - ny * w0); fx.closePath(); fx.fill();
  // 2) face wash: warm light pooled on the lower face
  const fw = fx.createRadialGradient(f[0], f[1], 0, f[0], f[1], U * 1.1);
  fw.addColorStop(0, `rgba(255,232,170,${.3 * g})`); fw.addColorStop(.6, `rgba(255,200,110,${.18 * g})`); fw.addColorStop(1, 'rgba(255,180,90,0)');
  fx.fillStyle = fw; fx.beginPath(); fx.arc(f[0], f[1], U * 1.1, 0, 7); fx.fill();
  fx.filter = 'none';
  // 3) bloom at the book: white-hot core, gold falloff
  const R = U * (1.35 + .4 * g), gr = fx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
  gr.addColorStop(0, `rgba(255,255,235,${g})`); gr.addColorStop(.1, `rgba(255,236,170,${.8 * g})`); gr.addColorStop(.35, `rgba(255,200,95,${.4 * g})`); gr.addColorStop(1, 'rgba(255,170,60,0)');
  fx.fillStyle = gr; fx.beginPath(); fx.arc(p[0], p[1], R, 0, 7); fx.fill();
  // 4) anamorphic streak
  const st = fx.createLinearGradient(p[0] - U * 2.6, 0, p[0] + U * 2.6, 0);
  st.addColorStop(0, 'rgba(255,210,140,0)'); st.addColorStop(.5, `rgba(255,240,200,${.7 * g})`); st.addColorStop(1, 'rgba(255,210,140,0)');
  fx.fillStyle = st; fx.beginPath(); fx.ellipse(p[0], p[1], U * 2.6, U * .045 * (1 + g), 0, 0, 7); fx.fill();
  // 5) motes drifting up out of the pages (deterministic)
  for (let k = 0; k < 26; k++) {
    const sd = Math.sin(k * 91.7) * 43758.5453, r1 = sd - Math.floor(sd), ph = (t * (.35 + r1 * .3) + r1) % 1;
    const x = p[0] + (r1 - .5) * U * .9 + ax * ph * .6 + Math.sin(t * 2 + k) * U * .06, y = p[1] + ay * ph * .6 - ph * U * .5, a = g * Math.sin(Math.PI * ph);
    fx.fillStyle = `rgba(255,236,160,${.9 * a})`; fx.beginPath(); fx.arc(x, y, U * (.03 + .03 * r1), 0, 7); fx.fill(); }
  fx.restore();
}
function drawProps(t, PP, base, VP, L, cam) {
  initProps(); const hands = PP.hands;
  const tex = (M, T, o) => drawToon(PROP.plane, M, VP, L, Object.assign({ tex: T, dbl: true }, o || {}));
  for (const G of TL.gest) {
    if (t < G.t0 || t > G.t1) continue; const env = gEnv(G, t), k = (G.side || 1) > 0 ? 1 : 0, Hd = hands[k];
    if (G.type === 'phone' && Hd) { // phone in the hand: back towards the camera, screen towards his face
      const sc = clamp(env * 1.3, 0, 1), M0 = mat.chain(Hd.M, mat.T(0, .22, .1), mat.RX(-.25), mat.S(sc, sc, sc));
      drawOutline(PROP.phone, mat.mul(M0, mat.S(1.12, 1.06, 1.5)), VP, 0); drawToon(PROP.phone, M0, VP, L, { color: [.12, .12, .16], spec: .4 });
      const scanned = RX.fxl.some(e => e.type === 'scan' && t > e.t1 - .05);
      tex(mat.chain(M0, mat.T(0, 0, -.037), mat.RY(Math.PI), mat.S(.31, .6, 1)), scanned ? PROP.screenOK : PROP.screenScan, { color: [1.15, 1.15, 1.15] });
      drawToon(PROP.phone, mat.chain(M0, mat.T(-.1, .24, .04), mat.S(.18, .1, .3)), VP, L, { color: [.3, .3, .34] }); // camera bump
    }
    if (G.type === 'call' && Hd) { // phone pressed to the ear, screen glowing toward the camera side
      const sd = (G.side || 1) > 0 ? 1 : -1, sc = clamp(env * 1.3, 0, 1), M0 = mat.chain(Hd.M, mat.T(-sd * .02, .22, .2), mat.RZ(sd * .2), mat.RY(sd * 1.15), mat.S(sc, sc, sc));
      drawOutline(PROP.phone, mat.mul(M0, mat.S(1.12, 1.06, 1.5)), VP, 0); drawToon(PROP.phone, M0, VP, L, { color: [.12, .12, .16], spec: .4 });
    }
    if (G.type === 'gun') { // cartoon assault rifle held diagonally across the chest (barrel up-left), pops in
      const sc = clamp(env * 1.25, 0, 1) * (1 + .12 * Math.max(0, Math.sin(clamp((t - G.t0) / .35, 0, 1) * Math.PI))), Gm = mat.chain(base, mat.T(.3, 2.1, 1.75), mat.RZ(-.46), mat.S(1.35 * sc, 1.35 * sc, 1.35 * sc));
      const BX = PROP.box || (PROP.box = new Mesh(boxGeo(1, 1, 1))), part = (x, y, w, h, d, col, rz) => { const M1 = mat.chain(Gm, mat.T(x, y, 0), mat.RZ(rz || 0), mat.S(w, h, d));
        drawOutline(BX, mat.mul(M1, mat.S(1 + .05 / w, 1 + .05 / h, 1 + .05 / d)), VP, 0); drawToon(BX, M1, VP, L, { color: col, spec: .25 }); };
      const DK = [.16, .16, .18], WD = [.62, .3, .12], WD2 = [.52, .24, .09];
      part(.92, -.07, .62, .2, .12, WD, .12); part(1.2, -.12, .1, .32, .14, WD2, .12);            // stock + butt
      part(.32, -.25, .12, .3, .12, WD2, .32);                                                   // pistol grip
      part(0, 0, .9, .22, .15, DK); part(.05, .13, .7, .06, .12, [.24, .24, .27]);                // receiver + cover
      part(-.1, -.29, .16, .34, .11, [.85, .38, .12], -.2); part(-.2, -.56, .16, .28, .11, [.85, .38, .12], -.5);   // curved magazine
      part(-.72, 0, .52, .2, .17, WD); part(-.72, .14, .5, .07, .09, DK);                       // handguard + gas tube
      part(-1.3, .02, .7, .07, .07, DK); part(-1.55, .11, .05, .14, .05, DK); part(-1.67, .02, .1, .1, .1, DK);   // barrel, sight, muzzle
    }
    if (G.type === 'nerd' && hands[1]) { // open book in his left hand, pages toward his face, covers (a V) toward the camera
      const sc = clamp(env * 1.3, 0, 1), B = mat.chain(hands[1].M, mat.T(-.1, .36, .28), mat.RX(-.2), mat.RY(-.12), mat.S(sc, sc, sc));
      drawToon(PROP.bookSpine, mat.chain(B, mat.T(0, 0, .02)), VP, L, { color: RX.bookTitle === 'deathnote' ? [.05, .05, .055] : [.22, .06, .13] });
      for (const sd of [-1, 1]) { // sd 1 = front cover on the camera's right (he reads it left-to-right)
        const H = mat.chain(B, mat.RY(sd * .7)), C = mat.chain(H, mat.T(sd * .33, 0, 0));
        const DN = RX.bookTitle === 'deathnote', X4 = DN ? props4() : null;   // cue `booktitle deathnote`: the black Death Note instead of THE BOOK OF LARP
        drawOutline(PROP.bookCover, mat.mul(C, mat.S(1.06, 1.05, 1.6)), VP, 0); drawToon(PROP.bookCover, C, VP, L, { color: DN ? [.07, .07, .075] : [.29, .08, .19], spec: .12 });
        const gl0 = nerdGlow(t); drawToon(PROP.bookPages, mat.chain(H, mat.T(sd * .31, 0, -.045)), VP, L, { color: [.98 + 1.4 * gl0, .93 + 1.1 * gl0, .8 + .5 * gl0] });
        tex(mat.chain(C, mat.T(0, 0, .019), mat.S(.58, .8, 1)), DN ? (sd > 0 ? X4.coverFull : X4.coverR) : sd > 0 ? PROP.bookFront : PROP.bookBack, { color: [1.1, 1.1, 1.1] });
      }
    }
    if (G.type === 'write') { // sheet held at the chest, pen in the right hand
      const u = clamp((t - G.t0) / Math.max(.1, (G.t1 - G.t0) * .8), 0, 1), sc = clamp(env * 1.2, 0, 1);
      tex(mat.chain(base, mat.T(-.05, 1.45, 1.25), mat.RX(-.55), mat.S(1.4 * sc, .97 * sc, 1)), willTex(u), { color: [1.08, 1.08, 1.08] });
      if (hands[1]) { const pen = mat.chain(hands[1].M, mat.T(.05, .18, .05), mat.RZ(-.5), mat.RX(.5), mat.S(.55, 1.1, .55)); drawOutline(M.finger, pen, VP, .03); drawToon(M.finger, pen, VP, L, { color: [.15, .12, .35] }); }
    }
    if (G.type === 'paper' && G.will && hands[0] && hands[1]) {
      const a = hands[0].p, b = hands[1].p, sc = clamp(env * 1.2, 0, 1), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - .32, (a[2] + b[2]) / 2 + .3];
      tex(mat.chain(base, mat.T(...c), mat.RZ(.04 * Math.sin(t * 3)), mat.S(1.8 * sc, 1.24 * sc, 1)), willTex(1), { color: [1.08, 1.08, 1.08] }); continue;
    }
    if (G.type === 'paper' && hands[0] && hands[1]) {
      const a = hands[0].p, b = hands[1].p, sc = clamp(env * 1.2, 0, 1), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + .08, (a[2] + b[2]) / 2 + .3];
      tex(mat.chain(base, mat.T(...c), mat.RZ(.04 * Math.sin(t * 3)), mat.S(2.1 * sc, 1.4 * sc, 1)), PROP.paper, { color: [1.1, 1.1, 1.1] }); // in front of the gloves, edges over the hands
    }
    if (G.type === 'throw' && Hd && t < G.t0 + (G.t1 - G.t0) * .56) { // the QR splat sits in the hand until release
      tex(mat.chain(Hd.M, mat.T(0, .25, .15), mat.RX(-.3), mat.S(.7, .7, 1)), PROP.splat, { cut: true, color: [1.1, 1.1, 1.1] });
    }
  }
  // thrown QR splat: spins toward the camera, small -> big until it covers the pion
  for (const G of TL.gest) {
    if (G.type !== 'throw') continue; const rel = G.t0 + (G.t1 - G.t0) * .56, dur = G.fly || 1.4; if (t < rel || t > rel + dur + 2) continue;
    const u = clamp((t - rel) / dur, 0, 1), k = (G.side || 1) > 0 ? 1 : 0, sd = k ? 1 : -1;
    const P0 = mat.xform(base, [sd * .35, 2.5, 1.5, 1]), p0 = [P0[0] / P0[3], P0[1] / P0[3], P0[2] / P0[3]];
    const D1 = 3.0, P1 = [cam.eye[0] + cam.fw[0] * D1, cam.eye[1] + cam.fw[1] * D1, cam.eye[2] + cam.fw[2] * D1]; // ends ~a screen wide, covering the pion
    const w = Math.pow(u, 1.25), p = p0.map((v, i) => lerp(v, P1[i], w)); p[1] += Math.sin(Math.PI * u) * .9;
    const spin = 4 * Math.PI * (1 - Math.pow(1 - u, 2));   // two turns, slowing down, ends facing the camera
    const M0 = mat.chain(mat.T(...p), mat.RY(spin), mat.RZ(.5 * (1 - u) * Math.sin(u * 9)), mat.RX(-.15 * (1 - u)), mat.S(1.25, 1.25, 1));
    gl.clear(gl.DEPTH_BUFFER_BIT); // always in front once thrown
    tex(M0, PROP.splat, { cut: true, color: [1.12, 1.12, 1.12] });
  }
}

/* ---------- karaoke subtitle: groups of words, active word yellow + pop ---------- */

/* ---------- photo shown on a big phone screen (pops in, swaps with a flip) ---------- */
function drawPhoto(g, t, E) {
  const im = RX.imgs[E.src]; if (!im || !im.complete) return; const e = t - E.t0;
  const k = (E.swap ? Math.min(1, .9 + .1 * springPop(e * 1.6)) : springPop(e * 1.25)) * (1 - smooth(E.t1 - .12, E.t1, t)); if (k <= .01) return;
  const w = E.w || 520, h = w * 1.25, x = E.x || 760, y = E.y || 620, flip = E.swap ? Math.abs(Math.cos(Math.min(1, e / .16) * Math.PI)) * (e < .16 ? 1 : 1) : 1;
  g.save(); g.translate(x, y); g.rotate((E.rot ?? 5) * Math.PI / 180 + .02 * Math.sin(t * 3)); g.scale(k * (e < .16 && E.swap ? Math.max(.05, flip) : 1), k);
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 40; g.shadowOffsetY = 18; g.fillStyle = '#15161a'; rr(g, -w / 2 - 22, -h / 2 - 60, w + 44, h + 120, 60); g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 6; g.strokeStyle = '#3a3c44'; rr(g, -w / 2 - 22, -h / 2 - 60, w + 44, h + 120, 60); g.stroke();
  g.save(); rr(g, -w / 2, -h / 2, w, h, 18); g.clip(); const sc = Math.max(w / im.width, h / im.height); g.drawImage(im, -im.width * sc / 2, -im.height * sc / 2 + (E.dy || 0) * h, im.width * sc, im.height * sc);
  if (e < .25) { g.fillStyle = `rgba(255,255,255,${.9 * (1 - e / .25)})`; g.fillRect(-w / 2, -h / 2, w, h); } g.restore();
  g.fillStyle = '#000'; rr(g, -60, -h / 2 - 42, 120, 22, 11); g.fill();                                  // notch
  g.fillStyle = '#fff'; g.font = '700 26px Inter, sans-serif'; g.textAlign = 'left'; g.fillText('🔍 ' + (E.q || 'hercules'), -w / 2 + 6, h / 2 + 40);
  g.restore();
}

/* ---------- 2D effects ---------- */
const bgCtx = document.getElementById('bgc').getContext('2d'), trailCtx = document.getElementById('trail').getContext('2d');
function toonText(g, txt, x, y, size, fill, stroke) { g.font = `900 ${size}px Inter, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .16; g.strokeStyle = stroke || '#2a0f08'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); }
function drawQuestion(g, t, head, E) { // ? marks popping above the head
  const R = head.r, base = [head.p[0], head.p[1] - R * 1.55];
  const items = [[0, 0, 1.0, 0], [-.85, .25, .62, .18], [.85, .2, .55, .32]];
  for (const [ox, oy, sc, dl] of items) { const e = t - E.t0 - dl; if (e < 0) continue; const out = 1 - smooth(E.t1 - .15, E.t1, t);
    const k = springPop(e * 1.3) * out; if (k <= 0) continue; const x = base[0] + ox * R, y = base[1] + oy * R + Math.sin(t * 6 + ox) * R * .05;
    g.save(); g.translate(x, y); g.rotate(.15 * Math.sin(t * 5 + dl * 9)); g.scale(k, k); toonText(g, '?', 0, 0, R * .95 * sc, '#ffd23a'); g.restore(); }
}
function drawBubble(g, t, head, E) { // comic speech bubble with type-on text
  const R = head.r, e = t - E.t0, out = 1 - smooth(E.t1 - .15, E.t1, t), k = springPop(e * 1.2) * out; if (k <= .01) return;
  const txt = E.text, n = Math.min(txt.length, Math.floor(e * 26) + 1), shown = txt.slice(0, n);
  const fs = R * .42; g.font = `900 ${fs}px Inter, Arial Black, sans-serif`; const tw = Math.max(g.measureText(txt).width, R), bw = tw + fs * 1.6, bh = fs * 2.1;
  const ax = head.p[0] + R * .55, ay = head.p[1] - R * 1.05, cx = clamp(ax + bw * .2, bw / 2 + 30, W - bw / 2 - 30), cy = ay - bh * .9;
  g.save(); g.translate(ax, ay); g.scale(k, k); g.translate(-ax, -ay);
  g.fillStyle = '#fff'; g.strokeStyle = '#2a0f08'; g.lineWidth = fs * .16; g.lineJoin = 'round';
  rr(g, cx - bw / 2, cy - bh / 2, bw, bh, bh / 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(cx - bw * .12, cy + bh / 2 - 4); g.lineTo(ax, ay); g.lineTo(cx + bw * .06, cy + bh / 2 - 4); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(cx - bw * .12 + 6, cy + bh / 2 - fs * .2, bw * .18 - 12, fs * .2);
  g.fillStyle = '#2a0f08'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(shown, cx, cy + fs * .05);
  g.restore();
}
let BILL = null;
function billImg() { if (BILL) return BILL; const c = document.createElement('canvas'); c.width = 220; c.height = 110; const g = c.getContext('2d');
  g.fillStyle = '#1f6b34'; g.fillRect(0, 0, 220, 110); g.fillStyle = '#7fd47a'; g.fillRect(7, 7, 206, 96); g.strokeStyle = '#1f6b34'; g.lineWidth = 4; g.strokeRect(16, 16, 188, 78);
  g.fillStyle = '#e9ffe2'; g.beginPath(); g.ellipse(110, 55, 30, 34, 0, 0, 7); g.fill(); g.stroke(); toonText(g, '$', 110, 57, 50, '#1f8a3f', '#0f3d1d');
  for (const [x, y] of [[34, 30], [186, 30], [34, 80], [186, 80]]) toonText(g, '$', x, y, 22, '#1f8a3f', '#0f3d1d'); return BILL = c; }
function drawMoney(gB, gF, t, E, cam) { // bills orbiting the pion (behind / in front) + money rain + coin glints
  const e = t - E.t0, inA = smooth(0, .35, e) * (1 - smooth(E.t1 - .2, E.t1, t)); if (inA <= 0) return;
  const img = billImg();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + e * 2.2, rad = 2.0 + .3 * Math.sin(i * 2.3), y = (i % 4 === 0 ? 4.5 + .3 * ((i * .37) % 1) : .5 + 1.5 * ((i * .37) % 1)) + .2 * Math.sin(e * 3 + i); // below the face / above the crown
    const P = [Math.cos(a) * rad * inA, y, Math.sin(a) * rad * inA], q = cam.toPix(P), sz = cam.ppu * .75 * (1 + Math.sin(a) * .12);
    const g = Math.sin(a) > 0 ? gF : gB; g.save(); g.translate(q[0], q[1]); g.rotate(.4 * Math.sin(e * 4 + i)); g.scale(Math.cos(e * 5 + i * 1.3), 1); g.globalAlpha = inA;
    g.drawImage(img, -sz / 2, -sz / 4, sz, sz / 2); g.restore(); }
  for (let i = 0; i < 16; i++) { const sd = Math.sin(i * 41.3) * 9375.13, r = sd - Math.floor(sd), x = (r * W * 1.1 + Math.sin(e * 2 + i) * 40) % W, y = -100 + ((e * (260 + 160 * r) + r * 1800) % 2000);
    const g = i % 3 ? gB : gF, sz = 110 + 60 * r; g.save(); g.translate(x, y); g.rotate(e * (1 + r) + i); g.scale(Math.cos(e * 6 + i), 1); g.globalAlpha = inA * .95; g.drawImage(img, -sz / 2, -sz / 4, sz, sz / 2); g.restore(); }
  gF.save(); gF.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { const a = i * 2.4 + e * 1.3, q = cam.toPix([Math.cos(a) * 1.4, 1.6 + (i % 5) * .55, Math.sin(a) * 1.4]), tw = Math.max(0, Math.sin(e * 9 + i * 1.7));
    const r = cam.ppu * .18 * tw * inA, gr = gF.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); gr.addColorStop(0, 'rgba(255,250,200,1)'); gr.addColorStop(.3, 'rgba(255,215,80,.7)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); gF.fillStyle = gr; gF.beginPath(); gF.arc(q[0], q[1], r, 0, 7); gF.fill(); }
  gF.restore();
}
/* ---------- extras: Sebum the oil drop, book into the pocket, SUBSCRIBE button, labelled arrow ---------- */
let XM = null;
function extraMeshes() {
  if (XM) return XM;
  const prof = spline2D([[0, 0], [.45, .03], [.72, .2], [.82, .5], [.76, .86], [.6, 1.16], [.38, 1.46], [.17, 1.74], [0, 1.98]], 40);
  XM = { drop: new Mesh(lathe(prof, 48, 0, Math.PI * 2)), ball: new Mesh(sphere(1, 24, 16)), armL: new Mesh(armGeo(), true), armR: new Mesh(armGeo(), true),
         btn: new Mesh(boxGeo(1.3, .44, .2)), book: new Mesh(boxGeo(.6, .8, .14)), plane: new Mesh(planeGeo(1, 1)) };
  XM.btnOn = canvasTex(520, 176, (g, w, h) => { g.fillStyle = '#e8232a'; g.fillRect(0, 0, w, h); toonText(g, 'SUBSCRIBE', w / 2, h / 2 + 4, 92, '#ffffff', '#7a0b0f'); });
  XM.btnOff = canvasTex(520, 176, (g, w, h) => { g.fillStyle = '#8d8f96'; g.fillRect(0, 0, w, h); toonText(g, 'SUBSCRIBED', w / 2, h / 2 + 4, 80, '#ffffff', '#3a3b40'); });
  return XM;
}
const SEBUM = { x0: 4.1, x1: 1.78, z: .5, sc: .7, col: [1, .74, .16] };
function sebumState(t) { // position, walk phase, yaw; null before it enters
  const E = RX.fxl.find(e => e.type === 'sebum'); if (!E || t < E.t0) return null;
  const u = clamp((t - E.t0) / Math.max(.1, E.t1 - E.t0), 0, 1), e = 1 - Math.pow(1 - u, 2.2), x = lerp(SEBUM.x0, SEBUM.x1, e);
  const walking = u < 1, ph = (SEBUM.x0 - x) * 5.2;
  return { x, z: SEBUM.z, ph, walking, yaw: lerp(-.75, -.28, smooth(.75, 1, u)), bob: walking ? .07 * Math.abs(Math.sin(ph)) : .025 * Math.sin(t * 3.1) };
}
function drawExtras(t, PP, base, VP, L, cam) {
  const X = extraMeshes(), hands = PP.hands;
  // --- book goes into the chest pocket (gest pocket)
  for (const G of TL.gest) { if (G.type !== 'pocket' || t < G.t0 || t > G.t1) continue;
    const u = clamp((t - G.t0) / (G.t1 - G.t0), 0, 1), Hd = hands[(G.side || 1) > 0 ? 1 : 0], P = DOC_POCKET, ry = Math.atan2(P[0], P[2]);
    let Mb;
    if (u < .55 && Hd) { const r = smooth(.1, .55, u); Mb = mat.chain(Hd.M, mat.T(0, .3, .12), mat.RX(-.3 * (1 - r)), mat.RZ(.0), mat.S(.75, .75, .75)); }
    else { const d = smooth(.55, .85, u); Mb = mat.chain(base, mat.T(P[0], P[1] + .34 - .5 * d, P[2] + .07), mat.RY(ry), mat.S(.42, .42 * (1 - .15 * d), .4)); }
    if (u < .86) { drawOutline(X.book, Mb, VP, .03); drawToon(X.book, Mb, VP, L, { color: [.29, .08, .19], spec: .15 });
      drawToon(X.plane, mat.chain(Mb, mat.T(0, 0, .072), mat.S(.5, .7, 1)), VP, L, { tex: PROP.bookFront || XM.btnOff, dbl: true, color: [1.1, 1.1, 1.1] }); }
    // pocket front drawn again over the sliding book so it really goes inside
    const pk = mat.chain(base, mat.T(...P), mat.RY(ry), mat.RX(-.18), mat.T(0, -.04, .04), mat.S(.62, 1.3, 1.2)); drawToon(M.plaster, pk, VP, L, { color: [.24, .45, .62] });
  }
  // --- floating SUBSCRIBE button (fx subbtn), pressed by gest click
  for (const E of fxActive('subbtn', t)) {
    const C = TL.gest.find(G => G.type === 'click'), pressed = C && t >= C.hit, push = C ? smooth(C.hit - .06, C.hit, t) * (1 - smooth(C.hit + .08, C.hit + .25, t)) : 0;
    const s = easeOutBack(clamp((t - E.t0) / .3, 0, 1)) * (1 - .06 * push), Mb = mat.chain(base, mat.T(SUB_BTN[0], SUB_BTN[1] + .04 * Math.sin(t * 3), SUB_BTN[2] - .12 * push), mat.RY(-.25), mat.S(s, s, s));
    drawOutline(X.btn, Mb, VP, .05); drawToon(X.btn, Mb, VP, L, { color: pressed ? [.55, .56, .6] : [.9, .12, .14], spec: .5 });
    drawToon(X.plane, mat.chain(Mb, mat.T(0, 0, .102), mat.S(1.22, .4, 1)), VP, L, { tex: pressed ? X.btnOff : X.btnOn, dbl: true, color: [1.12, 1.12, 1.12] });
  }
  // --- Sebum the oil drop: walks in from the right, shakes Pion's hand (gest salam)
  const S = sebumState(t); if (!S) return;
  const sc = SEBUM.sc, W0 = mat.chain(mat.T(S.x, S.bob, S.z), mat.RY(S.yaw), mat.RZ(S.walking ? .06 * Math.sin(S.ph) : 0), mat.S(sc, sc * (1 + (S.walking ? .03 * Math.cos(S.ph * 2) : .02 * Math.sin(t * 3.1))), sc));
  const part = (Mx, col, o) => { drawOutline(X.ball, Mx, VP, .045 / sc); drawToon(X.ball, Mx, VP, L, Object.assign({ color: col, noSoot: true }, o || {})); };
  // feet
  for (const sd of [-1, 1]) { const st = S.walking ? Math.sin(S.ph + (sd > 0 ? 0 : Math.PI)) : 0;
    part(mat.chain(W0, mat.T(sd * .3, .08 + .1 * Math.max(0, st), .1 + .18 * st), mat.S(.22, .12, .3)), [.92, .58, .1]); }
  drawOutline(X.drop, W0, VP, .06 / sc); drawToon(X.drop, W0, VP, L, { color: SEBUM.col, spec: 1.1, noSoot: true });
  // face: eyes (whites + pupils + shine), cheeks, smile
  const shake = TL.gest.find(G => G.type === 'salam' && t >= G.t0 && t <= G.t1), grin = shake ? 1 : .55;
  for (const sd of [-1, 1]) {
    part(mat.chain(W0, mat.T(sd * .23, .98, .64), mat.S(.15, .19, .08)), [1, 1, 1]);
    drawToon(X.ball, mat.chain(W0, mat.T(sd * .21 - .03, .96, .71), mat.S(.08, .1, .04)), VP, L, { color: [.1, .05, .03], noSoot: true });
    drawToon(X.ball, mat.chain(W0, mat.T(sd * .21 - .055, 1.0, .745), mat.S(.03, .035, .02)), VP, L, { color: [1.3, 1.3, 1.3], noSoot: true });
    drawToon(X.ball, mat.chain(W0, mat.T(sd * .42, .75, .6), mat.S(.1, .06, .04)), VP, L, { color: [1, .5, .38], noSoot: true });
  }
  part(mat.chain(W0, mat.T(0, .72, .72), mat.S(.17 + .05 * grin, .06 + .05 * grin, .05)), [.45, .1, .06]);
  drawToon(X.ball, mat.chain(W0, mat.T(-.3, 1.42, .44), mat.RZ(.5), mat.S(.08, .16, .04)), VP, L, { color: [1.35, 1.32, 1.2], noSoot: true }); // glossy oil highlight
  // arms: the left one (toward Pion) reaches for his hand during the handshake
  const toLocal = w => { const dx = (w[0] - S.x) / sc, dy = (w[1] - S.bob) / sc, dz = (w[2] - S.z) / sc, c = Math.cos(-S.yaw), s = Math.sin(-S.yaw); return [dx * c + dz * s, dy, -dx * s + dz * c]; };
  for (const sd of [-1, 1]) {
    const Sh = [sd * .66, .88, .12], sw = S.walking ? .14 * Math.sin(S.ph + (sd > 0 ? Math.PI : 0)) : 0;
    let Hh = [sd * .98, .45, .28 + sw], env = 1;
    if (sd < 0 && shake && hands[1]) { const hw = mat.xform(base, [...hands[1].p, 1]), tgt = toLocal([hw[0] / hw[3] + .12, hw[1] / hw[3] - .02, hw[2] / hw[3] + .02]);
      const k = smooth(shake.t0, shake.t0 + .3, t) * (1 - smooth(shake.t1 - .25, shake.t1, t)); Hh = Hh.map((v, i) => lerp(v, tgt[i], k)); }
    const mid = [(Sh[0] + Hh[0]) / 2 + sd * .12, (Sh[1] + Hh[1]) / 2 - .08, (Sh[2] + Hh[2]) / 2 + .08], A = sd < 0 ? X.armL : X.armR;
    buildArm(A, Sh, mid, Hh, .1, .09); drawOutline(A, W0, VP, .05 / sc); drawToon(A, W0, VP, L, { color: SEBUM.col, spec: .8, noSoot: true });
    part(mat.chain(W0, mat.T(...Hh), mat.S(.15, .15, .15)), SEBUM.col, { spec: .8 });
  }
}
function drawSebumShadow(g, t, cam) { // soft contact shadow under the drop (background layer)
  const S = sebumState(t); if (!S) return; const c = cam.toPix([S.x, 0, S.z]), e = cam.toPix([S.x + .6, 0, S.z]), r = Math.abs(e[0] - c[0]);
  const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.setTransform(g.canvas.width / W, 0, 0, g.canvas.height / H, 0, 0); g.translate(c[0], c[1]); g.scale(1, .28); g.translate(-c[0], -c[1]); g.fillStyle = gr; g.beginPath(); g.arc(c[0], c[1], r, 0, 7); g.fill(); g.restore();
}
function drawArrowLabel(g, t, E, cam) { // hand-drawn arrow pointing at the drop's head, with a label at its tail
  const S = sebumState(t); if (!S) return; const tip = cam.toPix([S.x - .1, 1.75, S.z]), U = cam.ppu;
  const a = clamp((t - E.t0) / .28, 0, 1), out = 1 - smooth(E.t1 - .2, E.t1, t); if (out <= 0) return;
  const wob = .04 * Math.sin(t * 9), st = [tip[0] - U * .25, tip[1] - U * 2.3], cp = [tip[0] + U * .55, tip[1] - U * 1.3];
  g.save(); g.globalAlpha = out; g.lineCap = 'round'; g.lineJoin = 'round';
  const q = u => { const v = 1 - u; return [v * v * st[0] + 2 * v * u * cp[0] + u * u * tip[0], v * v * st[1] + 2 * v * u * cp[1] + u * u * tip[1] + wob * U]; };
  const path = () => { g.beginPath(); for (let i = 0; i <= 24; i++) { const p = q(i / 24 * easeIO(a)); i ? g.lineTo(...p) : g.moveTo(...p); } };
  for (const [w, c] of [[U * .2, '#2a0f08'], [U * .11, '#ffffff']]) { g.lineWidth = w; g.strokeStyle = c; path(); g.stroke(); }
  if (a > .9) { const p1 = q(1), p0 = q(.9), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), h = U * .38;
    for (const [w, c] of [[U * .2, '#2a0f08'], [U * .11, '#ffffff']]) { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(p1[0] - h * Math.cos(ang - .5), p1[1] - h * Math.sin(ang - .5)); g.lineTo(...p1); g.lineTo(p1[0] - h * Math.cos(ang + .5), p1[1] - h * Math.sin(ang + .5)); g.stroke(); } }
  const ts = easeOutBack(clamp((t - E.t0 - .12) / .3, 0, 1)); if (ts > 0) { g.translate(tip[0] - U * .12, st[1] - U * .45); g.rotate(-.08); g.scale(ts, ts); toonText(g, E.text, 0, 0, U * .52, '#ffe14d', '#2a0f08'); }
  g.restore();
}
/* ---------- props v4: "brilliant" coin, coin purse, Death Note (tear + stomp), heart eyes ---------- */
let XM2 = null;
function props4() {
  if (XM2) return XM2;
  const coinFace = canvasTex(256, 256, (g, w, h) => { // teal disc with the white "!!" (brilliant move)
    const gr = g.createRadialGradient(w * .4, h * .35, w * .05, w / 2, h / 2, w * .5); gr.addColorStop(0, '#3fd0c3'); gr.addColorStop(1, '#159488');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w * .49, 0, 7); g.fill();
    g.lineWidth = w * .035; g.strokeStyle = '#0d6f66'; g.beginPath(); g.arc(w / 2, h / 2, w * .46, 0, 7); g.stroke();
    g.fillStyle = '#ffffff'; const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.fill(); };
    for (const x of [.3, .57]) { rr(w * x, h * .22, w * .13, h * .36, w * .015); rr(w * x, h * .64, w * .13, h * .13, w * .015); } });
  const cover = (half) => canvasTex(half ? 256 : 512, 700, (g, w, h) => { // black leather, scratchy white title
    const W0 = 512, x0 = half === 2 ? -256 : 0; g.fillStyle = '#121112'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 18 + ((i * 97) % 23); g.fillStyle = `rgb(${v},${v},${v + 1})`; g.fillRect(((i * 131) % W0) + x0, (i * 59) % h, 2, 2); }
    g.save(); g.translate(x0, 0); g.fillStyle = '#e9e4d6'; g.strokeStyle = '#e9e4d6'; g.lineWidth = 2; g.textAlign = 'center'; g.textBaseline = 'middle';
    const T = 'DEATH NOTE'; let x = 48; for (let i = 0; i < T.length; i++) { const ch = T[i]; g.save(); g.translate(x, 250 + ((i * 7) % 5) - 2); g.rotate((((i * 37) % 9) - 4) * .015);
      g.font = `${ch === 'D' || ch === 'N' ? 96 : 72}px "DejaVu Serif", serif`; g.fillText(ch, 0, 0); g.strokeText(ch, .6, .4); g.restore(); x += ch === ' ' ? 20 : 47; }
    g.restore(); });
  const jag = canvasTex(32, 256, (g, w, h) => { g.fillStyle = '#f2ecdc'; g.beginPath(); g.moveTo(0, 0); for (let y = 0; y <= h; y += 12) g.lineTo((y / 12) % 2 ? w * .9 : w * .25, y); g.lineTo(0, h); g.fill(); });
  XM2 = { coin: new Mesh(cylinder(.3, .3, .07, 48, false)), face: new Mesh(planeGeo(.6, .6)), coinFace, book: new Mesh(boxGeo(.72, .95, .14)), half: new Mesh(boxGeo(.36, .95, .14)),
          plane: new Mesh(planeGeo(1, 1)), ball: new Mesh(sphere(1, 20, 14)), coverFull: cover(0), coverL: cover(1), coverR: cover(2), jag };
  return XM2;
}
const COIN_TEAL = [.1, .62, .57];
function drawCoin(VP, L, M0) { // M0: coin frame (its axis = local Y); faces on both sides
  const X = props4(); drawOutline(X.coin, M0, VP, .03); drawToon(X.coin, M0, VP, L, { color: COIN_TEAL, spec: .9, noSoot: true });
  for (const sd of [1, -1]) drawToon(X.face, mat.chain(M0, mat.T(0, sd * .037, 0), mat.RX(-sd * Math.PI / 2)), VP, L, { tex: X.coinFace, cut: true, dbl: true, color: [1.08, 1.08, 1.08], noSoot: true });
}
function coinState(t, PP, base, cam) { // where the coin is: in hand, flipping, or flying at the camera
  const E = RX.fxl.find(e => e.type === 'coin' && t >= e.t0 && t <= e.t1); if (!E) return null;
  const Hd = PP.hands[1] || PP.hands[0]; if (!Hd) return null;
  const inHand = mat.chain(Hd.M, mat.T(0, .34, .08));
  const toss = TL.gest.find(G => G.type === 'toss' && t >= G.t0 && t <= G.t1), thr = TL.gest.find(G => G.type === 'cointhrow' && t >= G.t0);
  if (thr && t >= thr.t0 + .3) { // released: fly to just in front of the lens, tumbling, then fill the frame
    const rel = thr.t0 + .3, u = clamp((t - rel) / .5, 0, 1), e = Math.pow(u, 2.1);
    const w0 = mat.xform(base, [(thr.side || 1) * .35, 2.25, 1.85, 1]), p0 = [w0[0] / w0[3], w0[1] / w0[3], w0[2] / w0[3]];
    const eye = cam.eye, fw = cam.fw, tgt = eye.map((v, i) => v + fw[i] * .2), p = p0.map((v, i) => lerp(v, tgt[i], e));
    const nd = eye.map((v, i) => v - p[i]), nl = Math.hypot(...nd);
    return { M: mat.chain(mat.T(...p), rotFromY(nd.map(v => v / nl)), mat.RX(6 * Math.PI * (1 - e)), mat.RY(.3)), flying: true, u };
  }
  if (toss) { const ph = ((t - toss.t0) % .62) / .62, hgt = 4 * 1.35 * ph * (1 - ph); return { M: mat.chain(inHand, mat.T(0, hgt, 0), mat.RX(Math.PI / 2 + ph * 6 * Math.PI)), flying: false }; }
  return { M: mat.chain(inHand, mat.RX(Math.PI / 2 - .25)), flying: false };
}
function stompOff(t) { // hop on the spot (period .34 s), a little forward onto the book; squash on each landing
  const E = RX.fxl.find(e => e.type === 'stomp' && t >= e.t0 - .3 && t <= e.t1 + .4); if (!E) return { y: 0, z: 0, sq: 0, n: 0 };
  const z = 0; // hops on the spot (the book halves lie under the hem on both sides)
  if (t < E.t0 || t > E.t1) return { y: 0, z, sq: 0, n: t > E.t1 ? Math.floor((E.t1 - E.t0) / .34) + 1 : 0 };
  const k = (t - E.t0) / .34, u = k % 1; return { y: .6 * Math.sin(Math.PI * u), z, sq: -.13 * Math.exp(-u * 14) + .05 * Math.sin(Math.PI * u), n: Math.floor(k) + 1, u };
}
function drawProps4(t, PP, base, VP, L, cam) {
  const X = props4(); window.__pouch = null; window.__book = null; window.__floorbook = null;
  // --- coin
  const C = coinState(t, PP, base, cam); if (C) drawCoin(VP, L, C.M); window.__coin = C;
  // --- coin purse in the left hand (gest pouch)
  for (const G of TL.gest) { if (G.type !== 'pouch' || t < G.t0 || t > G.t1) continue; const Hd = PP.hands[(G.side || 1) > 0 ? 1 : 0]; if (!Hd) continue;
    const op = smooth(G.t0 + .3, G.t0 + .5, t), s0 = clamp(Hd.env * 1.3, 0, 1), P = mat.chain(Hd.M, mat.T(0, .38, .1), mat.S(s0, s0, s0));
    const sack = mat.chain(P, mat.S(.36, .32, .3)); drawOutline(X.ball, sack, VP, .03); drawToon(X.ball, sack, VP, L, { color: [.55, .33, .16], spec: .2 });
    const neck = mat.chain(P, mat.T(0, .3, 0), mat.S(.17 + .08 * op, .5, .16 + .08 * op)); drawOutline(M.bandRing, neck, VP, .02); drawToon(M.bandRing, neck, VP, L, { color: [.42, .24, .1] });
    if (op > .02) drawToon(X.ball, mat.chain(P, mat.T(0, .33, 0), mat.S(.15 * op, .02, .14 * op)), VP, L, { color: [.06, .04, .03] });
    const w = mat.xform(P, [0, .4, 0, 1]); window.__pouch = { p: cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]), op, G };
  }
  // --- Death Note: held, torn from the middle, thrown down, then lies on the floor (flattened by the stomps)
  const DN = TL.gest.find(G => G.type === 'deathnote' && t >= G.t0); if (!DN) return;
  const T = deathnoteTimes(DN), hL = PP.hands[0], hR = PP.hands[1], pop = easeOutBack(clamp((t - DN.t0) / .22, 0, 1));
  const wpos = Hd => { if (!Hd) return null; const w = mat.xform(base, [...Hd.p, 1]); return [w[0] / w[3], w[1] / w[3], w[2] / w[3]]; };
  if (t < T.tear0 && t <= DN.t1) { // whole book between the hands
    if (!hL || !hR) return; const c = hL.p.map((v, i) => (v + hR.p[i]) / 2), Mb = mat.chain(base, mat.T(c[0], c[1] + .1, c[2] + .14), mat.S(1.35 * pop, 1.35 * pop, 1.35 * pop));
    { const wb = mat.xform(Mb, [0, 0, 0, 1]); window.__book = cam.toPix([wb[0] / wb[3], wb[1] / wb[3], wb[2] / wb[3]]); }
    drawOutline(X.book, Mb, VP, .03); drawToon(X.book, Mb, VP, L, { color: [.07, .07, .08], spec: .25 });
    drawToon(X.plane, mat.chain(Mb, mat.T(0, 0, .072), mat.S(.7, .93, 1)), VP, L, { tex: X.coverFull, dbl: true, color: [1.05, 1.05, 1.05] });
    return;
  }
  const SO = stompOff(t), flat = Math.max(.32, 1 - .17 * SO.n);
  for (const sd of [-1, 1]) {
    const Hd = sd < 0 ? hL : hR, floorP = [sd * 1.0, .28, .62 + (sd > 0 ? .08 : 0)]; // beside the base, half under the hem: stays in frame
    let Mh;
    if (t < T.drop0 && Hd) { const sep = smooth(T.tear0, T.tear1, t); Mh = mat.chain(base, mat.T(Hd.p[0] - sd * .16, Hd.p[1] + .1, Hd.p[2] + .14), mat.RZ(-sd * .35 * sep), mat.RY(sd * .5 * sep), mat.S(1.35, 1.35, 1.35)); }
    else { const u = clamp((t - T.drop0) / Math.max(.05, T.drop1 - T.drop0), 0, 1), e = u * u, w = (DN.__w = DN.__w || {})[sd] || (DN.__w[sd] = wpos(Hd) || floorP);
      const p = w.map((v, i) => lerp(v, floorP[i], e)); Mh = mat.chain(mat.T(...p), mat.RY(sd * .3 * e), mat.RX(-1.05 * e), mat.RZ(sd * (1.6 * e * (1 - e) + .12 * e)), mat.S(1.35, 1.35 * (u >= 1 ? .55 + .45 * flat : 1), 1.35 * (u >= 1 ? flat : 1))); }
    { const wb = mat.xform(Mh, [0, 0, 0, 1]), q = cam.toPix([wb[0] / wb[3], wb[1] / wb[3], wb[2] / wb[3]]), key = t < T.drop1 ? '__book' : '__floorbook', o = window[key];
      window[key] = o ? [(o[0] + q[0]) / 2, (o[1] + q[1]) / 2] : q; } // between the two halves
    drawOutline(X.half, Mh, VP, .03); drawToon(X.half, Mh, VP, L, { color: [.07, .07, .08], spec: .25 });
    drawToon(X.plane, mat.chain(Mh, mat.T(0, 0, .072), mat.S(.35, .93, 1)), VP, L, { tex: sd < 0 ? X.coverL : X.coverR, dbl: true, color: [1.05, 1.05, 1.05] });
    drawToon(X.plane, mat.chain(Mh, mat.T(-sd * .185, 0, 0), mat.RY(Math.PI / 2), mat.S(.16, .95, 1)), VP, L, { tex: X.jag, cut: true, dbl: true, color: [1.05, 1.05, 1.05] }); // torn paper edge
  }
  // paper scraps from the tear: ballistic, spinning, then resting on the floor
  if (t >= T.tear0 + .08) { const c0 = mat.xform(base, [0, 2.0, 1.3, 1]), c = [c0[0] / c0[3], c0[1] / c0[3], c0[2] / c0[3]];
    for (let i = 0; i < 16; i++) { const r1 = (Math.sin(i * 12.9898) * 43758.5453) % 1, r2 = (Math.sin(i * 78.233) * 12345.678) % 1, tau = t - (T.tear0 + .08);
      const v = [r1 * 2.2, 1.6 + Math.abs(r2) * 1.6, .6 + Math.abs(r1) * 1.2], p = [c[0] + v[0] * tau, Math.max(.02, c[1] + v[1] * tau - 4.9 * tau * tau), c[2] + v[2] * tau];
      const rest = p[1] <= .021, Mp = mat.chain(mat.T(...p), mat.RX(rest ? -Math.PI / 2 : tau * 9 + i), mat.RZ(tau * 7 * r2), mat.S(.1, .13, 1));
      drawToon(X.plane, Mp, VP, L, { color: [.98, .95, .88], dbl: true, noSoot: true }); } }
}
function drawHearts(g, t, PP, cam) { // jelly heart eyes: tiny -> big with an elastic overshoot, squash-and-stretch wobble, pop out
  for (const E of fxActive('hearteyes', t)) {
    const e = t - E.t0, out = 1 - smooth(E.t1 - .14, E.t1, t), grow = .18 + .82 * Math.max(0, 1 - Math.exp(-7 * e) * Math.cos(15 * e));
    for (const sd of [-1, 1]) {
      const w = mat.xform(PP.headM, [sd * .36, .1, .95, 1]), q = cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]);
      const R = cam.ppu * .5 * grow * out * (sd > 0 ? .9 : 1), wob = Math.sin(e * 19 + sd) * .09 * Math.exp(-1.2 * e);
      if (R <= 1) continue; g.save(); g.translate(q[0] + sd * R * .15, q[1] - R * .1); g.rotate(sd * .12); g.scale(1 + wob, 1 - wob);
      const heart = () => { g.beginPath(); g.moveTo(0, R * .95); g.bezierCurveTo(-R * 1.25, R * .1, -R * 1.05, -R * .95, 0, -R * .45); g.bezierCurveTo(R * 1.05, -R * .95, R * 1.25, R * .1, 0, R * .95); g.closePath(); };
      const gr = g.createRadialGradient(-R * .35, -R * .45, R * .1, 0, 0, R * 1.2); gr.addColorStop(0, '#ffb3d6'); gr.addColorStop(.55, '#ff6fae'); gr.addColorStop(1, '#e83a83');
      heart(); g.fillStyle = gr; g.fill(); g.lineWidth = R * .09; g.strokeStyle = '#5a1430'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-R * .42, -R * .38, R * .2, R * .12, -.6, 0, 7); g.fill();
      g.restore();
    }
  }
}
function drawProps4FX(g, t, PP, cam) {
  drawHearts(g, t, PP, cam);
  const P = window.__pouch; // moth + dust out of the empty purse
  if (P && P.op > .5) { const e = t - (P.G.t0 + .45); if (e > 0 && e < 1.2) { const U = cam.ppu;
      for (let i = 0; i < 6; i++) { const a = e * 1.6 + i, r = U * (.15 + .5 * e) * (.6 + .4 * Math.sin(i * 3)), al = Math.max(0, .5 - e * .45);
        g.fillStyle = `rgba(170,160,150,${al})`; g.beginPath(); g.arc(P.p[0] + Math.cos(a * 2.3) * r, P.p[1] - U * .3 * e - Math.sin(a) * r * .4, U * (.08 + .1 * e), 0, 7); g.fill(); }
      const mx = P.p[0] + U * .6 * Math.sin(e * 5), my = P.p[1] - U * 1.6 * e, fl = Math.abs(Math.sin(e * 40));
      g.save(); g.translate(mx, my); g.fillStyle = '#8a7a66'; g.strokeStyle = '#3a2f24'; g.lineWidth = U * .02;
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * U * .09, 0, U * .1, U * .14 * (.3 + .7 * fl), sd * .5, 0, 7); g.fill(); g.stroke(); }
      g.fillStyle = '#3a2f24'; g.beginPath(); g.ellipse(0, 0, U * .03, U * .09, 0, 0, 7); g.fill(); g.restore(); } }
  const S = stompOff(t); // impact bursts on every landing
  if (S.u !== undefined && S.u < .25) { const w = mat.xform(mat.T(0, 0, S.z), [0, 0, 1.2, 1]), q = cam.toPix([w[0], w[1], w[2]]); drawSparkle(g, q[0], q[1], cam.ppu * 1.2, S.u * 2); }
}
function drawGlint(g, x, y, R, e) { // 4-point star 'ting' on a shiny bald head
  if (e < 0 || e > .55) return; const q = e / .55, s = R * Math.sin(Math.min(1, q * 1.6) * Math.PI) ; if (s <= 0) return;
  g.save(); g.translate(x, y); g.rotate(q * .9); g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(255,250,215,.95)'; g.shadowBlur = R * .5;
  for (const [k, w] of [[1, .16], [.55, .1]]) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? s * w : s * k; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.rotate(Math.PI / 4); }
  g.restore();
}
function drawSparkle(g, x, y, R, e) { // little star burst (prop appears)
  if (e < 0 || e > .5) return; const q = e / .5; g.save(); g.globalAlpha = 1 - q; g.strokeStyle = '#fff6b0'; g.lineWidth = Math.max(3, R * .06); g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r0 = R * (.3 + .6 * q), r1 = r0 + R * .35 * (1 - q); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
  g.restore();
}

const RS = new Map(); // frame -> full talking/jelly state after that frame (motion-blur sub-frames read neighbours)
const rSnap = () => { const o = { mouth, mouthHold, wobSign }; for (const k in J) o['J' + k] = [J[k].p, J[k].v]; for (const k in PH) o['P' + k] = [PH[k].p, PH[k].v]; return o; };
const rSet = (A, B, k) => { for (const n in J) { J[n].p = lerp(A['J' + n][0], B['J' + n][0], k); J[n].v = lerp(A['J' + n][1], B['J' + n][1], k); }
  for (const n in PH) { PH[n].p = lerp(A['P' + n][0], B['P' + n][0], k); PH[n].v = lerp(A['P' + n][1], B['P' + n][1], k); } mouth = A.mouth; mouthHold = A.mouthHold; wobSign = A.wobSign; };
function rEnsure(f) { // springs at the state of frame f (stepped sequentially from frame 0, cached)
  if (RS.has(f)) { const S = RS.get(f); rSet(S, S, 1); return; }
  if (f > rLast && f - rLast <= 2 && RS.has(rLast)) { const S = RS.get(rLast); rSet(S, S, 1); for (let g = rLast + 1; g <= f; g++) { rStep(g); RS.set(g, rSnap()); } }
  else { resetReact(); RS.clear(); for (let g = 0; g <= f; g++) { rStep(g); if (g >= f - 3) RS.set(g, rSnap()); } }
  rLast = f; for (const k of [...RS.keys()]) if (k < f - 4) RS.delete(k);
}
function renderReactAt(f, u) { // u > 0: u frames before f, u < 0: after f
  const g = u > 0 ? f - 1 : f + 1;
  if (!u || g < 0 || g >= RX.n) { rEnsure(f); return drawReact(f, 0); }
  rEnsure(g); const Sg = RS.get(g); rEnsure(f); const Sf = RS.get(f);
  rSet(Sf, Sg, Math.abs(u));
  try { drawReact(f, u); } finally { rSet(Sf, Sf, 1); }
}
function drawReact(f, u) {
  const t = (f - (u || 0)) / RX.fps; window.__probe = [];
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.depthMask(true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  for (const g of [fx, trailCtx, bgCtx]) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); }
  fx.setTransform(fx.canvas.width / W, 0, 0, fx.canvas.height / H, 0, 0); trailCtx.setTransform(trailCtx.canvas.width / W, 0, 0, trailCtx.canvas.height / H, 0, 0);
  let fr = camAt(t);
  if (RX.view && RX.view.length) { const x = Math.max(0, Math.min(RX.view.length - 1, t * RX.fps)), i = Math.floor(x), j = Math.min(i + 1, RX.view.length - 1), u = x - i;   // --view: per-frame orbit/tilt from the 3D world camera
    fr = Object.assign({}, fr, { orbit: lerp(RX.view[i][0], RX.view[j][0], u), tiltDeg: lerp(RX.view[i][1], RX.view[j][1], u) }); }
  const cam = reactCam(fr), VP = cam.VP; window.EYE = cam.eye;
  const castle = RX.bg === 'castle' || RX.bg === 'hospital', L0 = RX.bg === 'castle' ? LIGHT_CASTLE : LIGHT;
  const L = lightAt(t, RX.light ? Object.assign({}, L0, RX.light) : L0); // cue `light ...` / `<t> light ...`: match the 3D background's mood
  const fl = flyPos(t), fv = flyVel(t);
  const hidden = RX.fxl.some(e => e.type === 'hide' && t >= e.t0);   // after 'hide': only fx + subtitles (transparent), e.g. over an inserted clip
  if (castle && !hidden) { // background zooms with the camera (a bit less: parallax), anchored on the pion
    const cam0 = reactCam(RX.fr), A0 = cam0.toPix([0, 2.2, 0]), A1 = cam.toPix([0, 2.2, 0]), k = RX.fr.vh / fr.vh;
    const boards = fxActive('board', t), scans = RX.fxl.filter(e => e.type === 'scan' && t >= e.t0);
    const sc = scans.length ? (t - scans[scans.length - 1].t0) / (scans[scans.length - 1].t1 - scans[scans.length - 1].t0) : 0;
    drawCastle(bgCtx, { k: Math.max(1, 1 + (k - 1) * .7) * (1 + Math.abs(fr.roll || 0) * .012), ax: A0[0], ay: A0[1], dx: (A1[0] - A0[0]) * .7, dy: (A1[1] - A0[1]) * .7, rot: -(fr.roll || 0) * Math.PI / 180 }, t,
      { board: boards.length > 0, boardIn: boards.length ? (t - boards[0].t0) / .45 : 1, scan: sc, kind: RX.bg });
    if (fl.vis) { // soft contact shadow on the floor
      const q = cam.toPix([fl.p[0], 0, fl.p[2]]), r = cam.ppu * 1.25 / (1 + Math.max(0, fl.p[1]) * .3), a = .5 / (1 + Math.max(0, fl.p[1]) * .5);
      bgCtx.save(); bgCtx.setTransform(bgCtx.canvas.width / W, 0, 0, bgCtx.canvas.height / H, 0, 0); bgCtx.translate(q[0], q[1]); bgCtx.scale(1, .28);
      const gr = bgCtx.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(20,5,0,${a})`); gr.addColorStop(.55, `rgba(20,5,0,${a * .45})`); gr.addColorStop(1, 'rgba(20,5,0,0)'); bgCtx.fillStyle = gr; bgCtx.beginPath(); bgCtx.arc(0, 0, r, 0, 7); bgCtx.fill();
      const air = Math.max(0, fl.p[1]), rc = r * .55, ac = .45 / (1 + air * 2.5), gc = bgCtx.createRadialGradient(0, 0, 0, 0, 0, rc); // contact shadow right under the base
      gc.addColorStop(0, `rgba(15,3,0,${ac})`); gc.addColorStop(.6, `rgba(15,3,0,${ac * .6})`); gc.addColorStop(1, 'rgba(15,3,0,0)'); bgCtx.fillStyle = gc; bgCtx.beginPath(); bgCtx.arc(0, 0, rc, 0, 7); bgCtx.fill(); bgCtx.restore();
    }
  }
  const hov = hoverAmt(t) * (.07 * Math.sin(t * 2.3) + .07);
  cv.style.opacity = String(hidden ? 0 : fl.op);
  if (!fl.vis) { drawFX(f, t, { vis: false }); return; }
  const st = startleAt(t), bp = bodyPose(t);
  const a = J.sq.p + st.a * .55 + .014 * Math.sin(t * 2.4) + flyoutStretch(t) + (J.hop.p > 0 ? clamp(J.hop.v * .025, -.04, .06) : 0) + stompOff(t).sq, sy = 1 + a, sxz = 1 / Math.sqrt(1 + a); // + idle breathing, + stretch while rising in a hop
  const roll = J.wob.p * .5 + .022 * Math.sin(t * 1.3) + bp.roll;
  const lean = clamp(fv[2] * .012, -.2, .45) - clamp(fv[1] * .01, -.25, .25), bank = clamp(-fv[0] * .02, -.5, .5), fyaw = clamp(fv[0] * .012, -.4, .4);
  const hopY = Math.max(0, J.hop.p) * .5; // acting hop never sinks below the floor
  const SO = stompOff(t);
  const FS = floatState(t);
  const flyM = mat.chain(mat.T(fl.p[0] + FS.x, fl.p[1] + hov * (1 - FS.lv) + hopY + SO.y + FS.y, fl.p[2] + SO.z), mat.T(0, 2, 0), mat.RX(lean + FS.pitch), mat.RZ(bank + FS.roll), mat.RY(fyaw), mat.T(0, -2, 0));
  const base = mat.chain(flyM, mat.T(0, st.y * 4.65 * .25, 0), mat.RZ(-roll - J.sway.p * .3), mat.RY(fr.yaw + bp.yaw + turnAt(t) + J.sway.p), mat.RX(bp.lean + J.nod.p * .5 + J.lean.p * .07), mat.RX(PH.hz.p * -.6), mat.RZ(PH.hx.p * .6), mat.T(0, 1.7, 0), mat.S(sxz, sy, sxz), mat.T(0, -1.7, 0)); // squash about the belly: shape wobbles, head stays in frame
  const org = cam.toPix([0, 0, 0]), o = { vis: true, x: org[0], y: org[1], h: 4.65 * cam.ppu, yaw: fr.yaw, spd: 0, dist: 0 }; // for screen-space gesture targets
  { const hE0 = RX.fxl.find(e => e.type === 'hair' && t >= e.t0); window.HAIR_UP = hE0 ? easeOutBack(clamp((t - hE0.t0) / .38, 0, 1)) : 0; }
  const hurt = RX.hurt || 0, gs = gestureState(t, o), PP = posePion(base, t, gs, { rx: J.rx.p + J.nod.p * .6, ry: J.ry.p, rz: J.rz.p + J.tilt.p * .45 }, hurt);
  window.__clap = null;
  if (gs.clap && gs.clap.k > .01) { const w = mat.xform(base, [...gs.clap.p, 1]); window.__clap = { p: cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]), k: gs.clap.k, r: cam.ppu }; }
  const ex = exprAt(t), blink = blinking(t) && ex.since > .25;
  const yawNow = fr.yaw + bp.yaw + turnAt(t);
  const exNow = ex.m > .5 ? ex.b : ex.a; // expression 'soktahu' puts the nerd glasses on by itself
  const swim = fxActive('costume', t).some(e => e.kind === 'swim') ? 1 : 0;
  const glasses = swim ? 3 : fxActive('glasses', t).length ? 1 : exNow === 'soktahu' ? 2 : 0, det = fxActive('detective', t).length ? 1 : 0;
  const ng = nerdGlow(t), Lg = ng > .01 ? glowLight(L, ng) : L;
  const doc = fxActive('costume', t).some(e => e.kind === 'doc') ? 1 : 0, hE = RX.fxl.find(e => e.type === 'hair' && t >= e.t0), hairAmt = hE ? easeOutBack(clamp((t - hE.t0) / .38, 0, 1)) : 0;
  FLASH = 0; drawPion(PP, base, VP, Lg, { ex, blink, talk: ex.since < SWAP * .5 ? 0 : mouth, exp: 1, tint: [1, 1, 1], backView: Math.cos(yawNow) < -.2, hurt, glasses, det, doc, swim, hair: hairAmt, t, piece: (fxActive('piece', t)[0] || {}).kind || null, outfit: (fxActive('outfit', t)[0] || {}).kind || null });
  drawProps(t, PP, base, VP, Lg, cam);
  drawExtras(t, PP, base, VP, Lg, cam);
  drawProps4(t, PP, base, VP, Lg, cam);
  drawBookGlow(t, PP, base, cam);
  const hw = mat.xform(PP.headM, [0, 0, 0, 1]), head = { p: cam.toPix([hw[0] / hw[3], hw[1] / hw[3], hw[2] / hw[3]]), r: cam.ppu }; window.__head = head;
  const pix = (M, v) => { const w = mat.xform(M, [...v, 1]); return cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]); };
  // camera targets for `zoomitem`: face, hands and whatever prop is on screen (layout px)
  const items = {}; if (PP.hands[0]) items.handL = pix(PP.hands[0].M, [0, 0, 0]); if (PP.hands[1]) items.handR = pix(PP.hands[1].M, [0, 0, 0]);
  if (window.__coin) items.coin = pix(window.__coin.M, [0, 0, 0]); if (window.__pouch) items.pouch = window.__pouch.p;
  if (window.__book) items.book = window.__book; if (window.__floorbook) items.floorbook = window.__floorbook;
  { const Sb = sebumState(t); if (Sb) items.sebum = cam.toPix([Sb.x, .8, Sb.z]); }
  if (fxActive('subbtn', t).length) items.button = pix(base, SUB_BTN);
  items.mouth = pix(PP.headM, [0, -.45, .95]);
  window.__track = { base: pix(base, [0, 0, 0]), ground: cam.toPix([fl.p[0], 0, fl.p[2]]), head: head.p, ppu: cam.ppu, vis: fl.op, items, float: +FS.lv.toFixed(3), mouthOpen: mouth };
  window.__probe = [head.p, pix(base, [0, 0, 0]), pix(PP.crownM, [0, 1.0, 0]), pix(base, [1, 0, 0]), pix(base, [-1, 0, 0]), ...PP.hands.filter(Boolean).map(Hd => pix(Hd.M, [0, 0, 0]))];
  drawFX(f, t, o);
  drawSebumShadow(bgCtx, t, cam);
  for (const E of fxActive('arrow', t)) drawArrowLabel(fx, t, E, cam);
  drawProps4FX(fx, t, PP, cam);
  for (const E of RX.fxl) if (E.type === 'hair' && t >= E.t0 && t < E.t0 + .8) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + .4, q = pix(PP.headM, [Math.cos(a) * 1.5, .7 + Math.sin(a) * 1.1, .4]); drawSparkle(fx, q[0], q[1], cam.ppu * (.7 + .3 * (i % 3)), t - E.t0 - i * .045); }
  if (fl.flying || flyPos(t - .5).flying) drawTrail(t, cam);
  if (hurt) drawSmoke(fx, head, t, hurt * .5);
  for (const E of fxActive('anger', t)) drawAnger(fx, head, t, smooth(E.t0, E.t0 + .15, t) * (1 - smooth(E.t1 - .15, E.t1, t)));
  for (const E of fxActive('sweat', t)) drawSweat(fx, head, t, 1 - smooth(E.t1 - .15, E.t1, t), E.t0);
  for (const E of fxActive('aha', t)) drawAha(fx, head, t, E);
  for (const E of fxActive('photo', t)) drawPhoto(fx, t, E);
  for (const E of fxActive('poof', t)) drawPoof(fx, head.p[0], head.p[1] + head.r * .9, head.r * 3.2, t, E);
  for (const E of fxActive('stamp', t)) drawStamp(fx, t, E, E.x || 539, E.y || 700, E.size || 110);
  for (const E of fxActive('ask', t)) drawQuestion(fx, t, head, E);
  for (const E of fxActive('say', t)) drawBubble(fx, t, head, E);
  for (const E of fxActive('money', t)) drawMoney(trailCtx, fx, t, E, cam);
  for (const G of TL.gest) if (G.type === 'crownlift' && t >= G.t0 + .5 && t < G.t0 + 1.2) { // crown is up: shine on the bald scalp
    const q = pix(PP.headM, [.32, .82, .45]); drawGlint(fx, q[0], q[1], cam.ppu * .55, t - G.t0 - .55); }
  for (const G of TL.gest) if ((G.type === 'phone' || G.type === 'paper' || G.type === 'throw' || G.type === 'nerd' || G.type === 'gun' || G.type === 'call') && t >= G.t0 && t < G.t0 + .5) { // pop sparkle where the prop appears
    const Hd = PP.hands[(G.side || 1) > 0 ? 1 : 0] || PP.hands[0]; if (!Hd) continue; const w = mat.xform(Hd.M, [0, 0, 0, 1]), q = cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]);
    drawSparkle(fx, q[0], q[1], cam.ppu * 1.1, t - G.t0 - .1); }
}
// golden sparkle trail along the recent flight path (layer BEHIND the character)
function drawTrail(t, cam) {
  const g = trailCtx; g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= 18; k++) {
    const tk = t - k * .03, s = flyPos(tk); if (!s.flying) continue;
    const sd = Math.sin(k * 12.9898 + Math.floor(tk * 30) * 78.233) * 43758.5453, rnd = sd - Math.floor(sd);
    const ang = rnd * Math.PI * 2, rad = 1.1 + 1.3 * ((rnd * 7.3) % 1); // ring around the body so sparkles peek out of the silhouette
    const c = [s.p[0] + Math.cos(ang) * rad, s.p[1] + 2 + Math.sin(ang) * rad * 1.2, s.p[2] - .5];
    const q = cam.toPix(c), q2 = cam.toPix([c[0], c[1] + .12, c[2]]), r = Math.max(2, Math.abs(q[1] - q2[1])) * (1 - k / 22);
    const al = (1 - k / 19) * .85 * s.op;
    const rg = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 2.6);
    rg.addColorStop(0, `rgba(255,250,225,${al})`); rg.addColorStop(.35, `rgba(255,205,90,${al * .6})`); rg.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(q[0], q[1], r * 2.6, 0, 7); g.fill();
  }
  g.restore();
}
window.renderReact = f => renderReactAt(f, 0);
// flatten background + trail + character + fx into one canvas inside the page (no DOM screenshot -> no stale compositor layers)
const outCv = document.createElement('canvas');
function composeReact(bg) {
  outCv.width = cv.width; outCv.height = cv.height; const g = outCv.getContext('2d', { willReadFrequently: true });
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, outCv.width, outCv.height); }
  g.drawImage(bgCtx.canvas, 0, 0); g.drawImage(trailCtx.canvas, 0, 0);
  g.globalAlpha = +cv.style.opacity || 0; g.drawImage(cv, 0, 0); g.globalAlpha = 1;
  g.drawImage(fx.canvas, 0, 0);
  return outCv;
}
window.grabReact = bg => composeReact(bg).toDataURL(bg ? 'image/jpeg' : 'image/png', .92).split(',')[1];
// frame f with motion blur (window.MB.maxN samples at most, 1 = off)
window.grabReactMB = (f, bg) => mbCapture(u => renderReactAt(f, u), () => composeReact(bg), () => window.__probe || []).toDataURL(bg ? 'image/jpeg' : 'image/png', .92).split(',')[1];
window.__reactReady = true;
