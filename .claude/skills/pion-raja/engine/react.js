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
  RX.fxl = d.fx || [];
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
  if (mouthHold > 0) mouthHold--; else if (want !== mouth) { mouth = want; mouthHold = 1; }
}

/* portrait camera: long lens aimed at the pion, slightly above eye level */
function reactCam(fr) {
  const fov = 28 * Math.PI / 180, dist = fr.vh / 2 / Math.tan(fov / 2), tl = fr.tiltDeg * Math.PI / 180;
  const tgt = [fr.cx, fr.cy, 0], eye = [fr.cx, fr.cy + Math.sin(tl) * dist, Math.cos(tl) * dist];
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
  return g;
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
    if (G.type === 'nerd' && hands[1]) { // open book in his left hand, pages toward his face, covers (a V) toward the camera
      const sc = clamp(env * 1.3, 0, 1), B = mat.chain(hands[1].M, mat.T(-.1, .36, .28), mat.RX(-.2), mat.RY(-.12), mat.S(sc, sc, sc));
      drawToon(PROP.bookSpine, mat.chain(B, mat.T(0, 0, .02)), VP, L, { color: [.22, .06, .13] });
      for (const sd of [-1, 1]) { // sd 1 = front cover on the camera's right (he reads it left-to-right)
        const H = mat.chain(B, mat.RY(sd * .7)), C = mat.chain(H, mat.T(sd * .33, 0, 0));
        drawOutline(PROP.bookCover, mat.mul(C, mat.S(1.06, 1.05, 1.6)), VP, 0); drawToon(PROP.bookCover, C, VP, L, { color: [.29, .08, .19], spec: .12 });
        const gl0 = nerdGlow(t); drawToon(PROP.bookPages, mat.chain(H, mat.T(sd * .31, 0, -.045)), VP, L, { color: [.98 + 1.4 * gl0, .93 + 1.1 * gl0, .8 + .5 * gl0] });
        tex(mat.chain(C, mat.T(0, 0, .019), mat.S(.58, .8, 1)), sd > 0 ? PROP.bookFront : PROP.bookBack, { color: [1.1, 1.1, 1.1] });
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
  const fr = camAt(t), cam = reactCam(fr), VP = cam.VP; window.EYE = cam.eye;
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
  const a = J.sq.p + st.a * .55 + .014 * Math.sin(t * 2.4) + flyoutStretch(t) + (J.hop.p > 0 ? clamp(J.hop.v * .025, -.04, .06) : 0), sy = 1 + a, sxz = 1 / Math.sqrt(1 + a); // + idle breathing, + stretch while rising in a hop
  const roll = J.wob.p * .5 + .022 * Math.sin(t * 1.3) + bp.roll;
  const lean = clamp(fv[2] * .012, -.2, .45) - clamp(fv[1] * .01, -.25, .25), bank = clamp(-fv[0] * .02, -.5, .5), fyaw = clamp(fv[0] * .012, -.4, .4);
  const hopY = Math.max(0, J.hop.p) * .5; // acting hop never sinks below the floor
  const flyM = mat.chain(mat.T(fl.p[0], fl.p[1] + hov + hopY, fl.p[2]), mat.T(0, 2, 0), mat.RX(lean), mat.RZ(bank), mat.RY(fyaw), mat.T(0, -2, 0));
  const base = mat.chain(flyM, mat.T(0, st.y * 4.65 * .25, 0), mat.RZ(-roll - J.sway.p * .3), mat.RY(fr.yaw + bp.yaw + turnAt(t) + J.sway.p), mat.RX(bp.lean + J.nod.p * .5 + J.lean.p * .07), mat.RX(PH.hz.p * -.6), mat.RZ(PH.hx.p * .6), mat.T(0, 1.7, 0), mat.S(sxz, sy, sxz), mat.T(0, -1.7, 0)); // squash about the belly: shape wobbles, head stays in frame
  const org = cam.toPix([0, 0, 0]), o = { vis: true, x: org[0], y: org[1], h: 4.65 * cam.ppu, yaw: fr.yaw, spd: 0, dist: 0 }; // for screen-space gesture targets
  const hurt = RX.hurt || 0, gs = gestureState(t, o), PP = posePion(base, t, gs, { rx: J.rx.p + J.nod.p * .6, ry: J.ry.p, rz: J.rz.p + J.tilt.p * .45 }, hurt);
  window.__clap = null;
  if (gs.clap && gs.clap.k > .01) { const w = mat.xform(base, [...gs.clap.p, 1]); window.__clap = { p: cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]), k: gs.clap.k, r: cam.ppu }; }
  const ex = exprAt(t), blink = blinking(t) && ex.since > .25;
  const yawNow = fr.yaw + bp.yaw + turnAt(t);
  const exNow = ex.m > .5 ? ex.b : ex.a; // expression 'soktahu' puts the nerd glasses on by itself
  const glasses = fxActive('glasses', t).length ? 1 : exNow === 'soktahu' ? 2 : 0, det = fxActive('detective', t).length ? 1 : 0;
  const ng = nerdGlow(t), Lg = ng > .01 ? glowLight(L, ng) : L;
  FLASH = 0; drawPion(PP, base, VP, Lg, { ex, blink, talk: ex.since < SWAP * .5 ? 0 : mouth, exp: 1, tint: [1, 1, 1], backView: Math.cos(yawNow) < -.2, hurt, glasses, det, t });
  drawProps(t, PP, base, VP, Lg, cam);
  drawBookGlow(t, PP, base, cam);
  const hw = mat.xform(PP.headM, [0, 0, 0, 1]), head = { p: cam.toPix([hw[0] / hw[3], hw[1] / hw[3], hw[2] / hw[3]]), r: cam.ppu }; window.__head = head;
  const pix = (M, v) => { const w = mat.xform(M, [...v, 1]); return cam.toPix([w[0] / w[3], w[1] / w[3], w[2] / w[3]]); };
  window.__track = { base: pix(base, [0, 0, 0]), ground: cam.toPix([fl.p[0], 0, fl.p[2]]), head: head.p, ppu: cam.ppu, vis: fl.op };
  window.__probe = [head.p, pix(base, [0, 0, 0]), pix(PP.crownM, [0, 1.0, 0]), pix(base, [1, 0, 0]), pix(base, [-1, 0, 0]), ...PP.hands.filter(Boolean).map(Hd => pix(Hd.M, [0, 0, 0]))];
  drawFX(f, t, o);
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
  for (const G of TL.gest) if ((G.type === 'phone' || G.type === 'paper' || G.type === 'throw' || G.type === 'nerd') && t >= G.t0 && t < G.t0 + .5) { // pop sparkle where the prop appears
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
