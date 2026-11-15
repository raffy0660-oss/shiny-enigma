'use strict';
/* Camera plan for Pion videos: smooth step zooms every N words, a held corner + dutch angle per
   "atmosphere" (lighting mood), zoom back out to normal whenever the mood changes.

   Shared by the reaction engine (react_render.js turns keys into `cam` moves) and the Remotion
   finisher (castle3d/remotion reads the JSON). No overshoot anywhere: every key eases from where the
   camera is to its target and then HOLDS exactly until the next key.

   Key: { t, dur, z, ox, oy, roll }
     z     zoom (1 = normal framing)
     ox,oy camera centre offset from Pion's face, as a fraction of the frame (+ox = camera right,
           so Pion sits left of centre; +oy = camera down, so Pion sits higher)
     roll  dutch angle in degrees

   CLI:  node camplan.js cues.txt [--every 3] [--max 1.5]   -> JSON keys on stdout
*/
const IN_NODE = typeof module !== 'undefined' && typeof require === 'function';
const fs = IN_NODE ? require('fs') : null, path = IN_NODE ? require('path') : null;
// node reads moods.json next to this file; a browser page sets window.PION_MOODS (the parsed moods.json) first
const MOODS = IN_NODE ? JSON.parse(fs.readFileSync(path.join(__dirname, 'moods.json'), 'utf8')).expr_to_mood
                      : ((typeof window !== 'undefined' && window.PION_MOODS) || {}).expr_to_mood || {};
const moodOf = e => e && e[0] === '@' ? e.slice(1) : (MOODS[e] || 'hangat');   // '@mood' = pinned by a `mood` cue
const CORNERS = [ // one per atmosphere, cycling: camera drifts to a corner and tilts a little
  { ox: .085, oy: -.045, roll: -3.2 },
  { ox: -.085, oy: -.035, roll: 3.0 },
  { ox: .06, oy: .03, roll: -2.4 },
  { ox: -.065, oy: .025, roll: 2.6 },
];

function parseCues(txt) {
  const words = [], exprs = [], az = [], man = [], pins = [];
  for (const raw of txt.split(/\r?\n/)) {
    const w = raw.replace(/#.*/, '').trim().split(/\s+/); if (w.length < 2 || isNaN(+w[0])) continue;
    const t = +w[0], cmd = w[1];
    if (cmd === 'word' || cmd === 'kata') words.push({ t, text: w.slice(2).join(' ') });
    else if (cmd === 'expr') exprs.push([t, w[2]]);
    else if (cmd === 'mood') pins.push([t, (w[2] || 'auto').toLowerCase()]);
    else if (MOODS[cmd]) exprs.push([t, cmd]);
    else if (cmd === 'zoomto') man.push({ t, z: +(w[2] || 1.3), oy: +(w[3] || 0), ox: +(w[4] || 0), roll: +(w[5] || 0), dur: +(w[6] || .5) }); // manual key: zoom z, offsets as frame fractions (-oy = camera up)
    else if (cmd === 'autozoom' || cmd === 'zoomauto') az.push(/^(off|mati)$/i.test(w[2] || '') ? { t, off: true } : { t, every: +(w[2] || 3) || 3, amt: +(w[3] || 1) || 1, pattern: /^(pola|pattern|template)$/i.test(w[4] || '') });
  }
  if (pins.length) { // a pinned mood overrides the expression's mood until the next pin ('auto' releases it)
    pins.sort((a, b) => a[0] - b[0]); const pinAt = t => { let p = 'auto'; for (const [t0, m] of pins) if (t0 <= t + 1e-6) p = m; return p; };
    for (const E of exprs) { const p = pinAt(E[0]); if (p !== 'auto') E[1] = '@' + p; }
    for (const [t0, m] of pins) if (m !== 'auto') exprs.push([t0, '@' + m]);
  }
  return { words, exprs, az, man };
}

function planCamera({ words, exprs, az, man = [], onsets = [], max = 1.5, moveDur = .55, outDur = .7 }) {
  words = words.slice().sort((a, b) => a.t - b.t);
  exprs = exprs.slice().sort((a, b) => a[0] - b[0]);
  az = (az || []).slice().sort((a, b) => a.t - b.t);
  if (!az.length && !man.length) return [];
  if (!words.length) words = onsets.filter((_, i) => i % 2 === 0).map(t => ({ t, text: '' })); // syllable rhythm fallback
  // atmosphere segments: a new one whenever the lighting mood changes
  const segs = []; let cur = null;
  for (const [t, e] of exprs) { const m = moodOf(e); if (!cur || cur.mood !== m) { cur = { t, mood: m }; segs.push(cur); } }
  if (!segs.length || segs[0].t > 0) segs.unshift({ t: 0, mood: segs.length ? segs[0].mood : 'hangat' });
  const segAt = t => { let i = 0; while (i + 1 < segs.length && segs[i + 1].t <= t + 1e-6) i++; return i; };
  const azAt = t => { let S = null; for (const A of az) if (A.t <= t + 1e-6) S = A.off ? null : A; return S; };
  const lv = (amt, i) => { // progressive build-up, then alternate between the two biggest steps
    const L = [1.18, 1.34, 1.5, 1.38, 1.5], s = L[Math.min(i, 2) + (i > 2 ? ((i - 3) % 2) + 1 : 0)] || 1.5;
    return 1 + (Math.min(s, max) - 1) * amt; };
  const keys = []; let z = 1, stepI = 0, lastKey = -9, segI = -1, count = 0, outUntil = -9;
  const push = (t, dur, zz, k) => {
    const C = CORNERS[k % CORNERS.length], a = zz > 1 ? .6 + .4 * Math.min(1, (zz - 1) / (max - 1)) : 0; // corner arrives with the first zoom
    keys.push({ t: +t.toFixed(3), dur, z: +zz.toFixed(4), ox: +(C.ox * a).toFixed(4), oy: +(C.oy * a).toFixed(4), roll: +(C.roll * a).toFixed(2) });
    z = zz; lastKey = t;
  };
  // zoom-out keys at every mood change (and when autozoom turns off)
  const events = [];
  segs.forEach((S, i) => { if (i > 0) events.push({ t: S.t, kind: 'seg', i }); });
  az.forEach(A => { if (A.off) events.push({ t: A.t, kind: 'off' }); });
  words.forEach(W => events.push({ t: W.t, kind: 'word', W }));
  events.sort((a, b) => a.t - b.t || (a.kind === 'word') - (b.kind === 'word'));
  for (const E of events) {
    if (E.kind === 'seg' || E.kind === 'off') {
      if (z > 1.001) { push(E.t, outDur, 1, segAt(E.t)); outUntil = E.t + outDur + .1 - 1e-6; }
      stepI = 0; count = 0; continue;
    }
    const A = azAt(E.t); if (!A) continue;
    const k = segAt(E.t), S = segs[k];
    if (k !== segI) { segI = k; count = 0; stepI = 0; }
    if (E.t < outUntil) continue;                       // let the zoom-out finish first (only when there was one)
    const bang = /!/.test(E.W.text);
    count++;
    if (!bang && (count - 1) % A.every) continue;
    if (E.t - lastKey < (bang ? .35 : moveDur + .15)) continue;   // never stack moves ('!' may cut in sooner)
    // template mode (`autozoom N amt pola`): always 3 zooms in, then 1 zoom out, repeating
    const PAT = [1.12, 1.24, 1.35, 1.0], zz = A.pattern ? 1 + (PAT[stepI++ % 4] - 1) * A.amt : bang ? 1 + (max - 1) * A.amt : lv(A.amt, stepI++);
    if (Math.abs(zz - z) < .01) continue;                  // already there: hold
    push(E.t, moveDur, zz, k);
  }
  // manual `zoomto` keys win: auto keys from just before a manual key until the next manual key / mood change are dropped
  if (man.length) {
    const M = man.slice().sort((a, b) => a.t - b.t), segT = segs.map(S => S.t);
    // a manual zoom-in holds until the next manual key / mood change; a manual zoom-out (z <= 1) hands control
    // back to the auto zooms once it has finished
    const until = m => m.z <= 1.001 ? m.t + m.dur + .1 : Math.min(...M.filter(x => x.t > m.t).map(x => x.t), ...segT.filter(x => x > m.t + 1e-6), 1e9);
    const kept = keys.filter(K => !M.some(m => K.t > m.t - .25 && K.t < until(m)) || K.z === 1);
    return kept.concat(M.map(m => ({ t: +m.t.toFixed(3), dur: m.dur, z: m.z, ox: m.ox, oy: m.oy, roll: m.roll }))).sort((a, b) => a.t - b.t);
  }
  return keys;
}

/* sample the plan at time t (same easing everywhere: cubic in-out, no overshoot) */
const easeIO3 = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function camAtPlan(keys, t) {
  let c = { z: 1, ox: 0, oy: 0, roll: 0 };
  for (let i = 0; i < keys.length; i++) {
    const K = keys[i]; if (t < K.t) break;
    const nx = keys[i + 1], te = nx && nx.t < t ? nx.t : t, u = easeIO3(Math.min(1, Math.max(0, (te - K.t) / K.dur)));
    c = { z: c.z + (K.z - c.z) * u, ox: c.ox + (K.ox - c.ox) * u, oy: c.oy + (K.oy - c.oy) * u, roll: c.roll + (K.roll - c.roll) * u };
  }
  return c;
}

/* handheld shake that lives only while the camera moves: amplitude follows camera speed, gone on holds */
const SHAKE = { pos: .0035, roll: .32, zoom: .005 };
function shakeAt(keys, t, k = 1) {
  const a = camAtPlan(keys, t - 1 / 60), b = camAtPlan(keys, t + 1 / 60);
  const speed = (Math.abs(b.z - a.z) * 2 + Math.hypot(b.ox - a.ox, b.oy - a.oy) * 6 + Math.abs(b.roll - a.roll) * .06) * 30;
  const env = k * Math.min(1, speed / .9);
  if (env < 1e-3) return { z: 0, ox: 0, oy: 0, roll: 0 };
  const n = (f1, f2, f3, p) => (Math.sin(t * f1 + p) * .5 + Math.sin(t * f2 + p * 1.7) * .3 + Math.sin(t * f3 + p * 2.3) * .2);
  return { z: env * SHAKE.zoom * n(9.1, 15.3, 23.7, .4), ox: env * SHAKE.pos * n(11.3, 17.9, 29.1, 1.3),
           oy: env * SHAKE.pos * n(10.7, 19.1, 27.3, 2.9), roll: env * SHAKE.roll * n(8.3, 13.7, 21.9, 4.1) };
}
/* what renderers sample per frame: smooth plan + gentle shake while moving */
function sampleCam(keys, t, shake = 1) {
  const c = camAtPlan(keys, t), s = shake ? shakeAt(keys, t, shake) : null;
  return s ? { z: c.z + s.z, ox: c.ox + s.ox, oy: c.oy + s.oy, roll: c.roll + s.roll } : c;
}

const API = { parseCues, planCamera, camAtPlan, sampleCam, moodOf, MOODS, CORNERS };
if (IN_NODE) module.exports = API; else window.CamPlan = API;   // the studio loads this file with a plain <script>

if (IN_NODE && require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf('--' + k); return i < 0 ? null : a[i + 1]; };
  const P = parseCues(fs.readFileSync(a[0], 'utf8'));
  if (opt('every')) P.az = P.az.length ? P.az.map(x => x.off ? x : Object.assign(x, { every: +opt('every') })) : [{ t: 0, every: +opt('every'), amt: 1 }];
  if (!P.az.length) P.az = [{ t: 0, every: 3, amt: 1 }];
  const keys = planCamera(Object.assign(P, { max: +(opt('max') || 1.5) }));
  if (opt('sample')) { // --sample FPS --frames N : per-frame [z, ox, oy, roll] for renderers that just read numbers
    const fps = +opt('sample'), n = +opt('frames'), out = [];
    const sh = opt('shake') === null ? 1 : +opt('shake');
    for (let f = 0; f < n; f++) { const c = sampleCam(keys, f / fps, sh); out.push([c.z, c.ox, c.oy, c.roll].map(v => +v.toFixed(5))); }
    process.stdout.write(JSON.stringify({ keys, frames: out }) + '\n');
  } else process.stdout.write(JSON.stringify(keys, null, 1) + '\n');
}
