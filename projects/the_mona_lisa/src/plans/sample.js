// THE MONA LISA HEIST: sample 0-15.7 s (60 fps). VO word timing (ElevenLabs STT, audio/stt.json):
//  0.20-5.28 "Someone had stolen the Mona Lisa from the Louvre, and the thief had vanished without a trace."  (thief 3.20, vanished 3.88, trace 4.78)
//  5.70-10.44 "And now I was the one assigned (7.14) to find it and uncover (8.48) the identity of the thief."
//  10.94-13.84 "When I arrived at the museum, I examined (12.58) the crime scene."   14.24-15.2 "The painting was gone (14.96), ..."
// Shots: H heist (heist_shot.js, warm gold) | O office: the case lands on his laptop, then he takes out the DEATH NOTE and writes (gest catat)
//        | A gallery: he hops in through the arch, looks over the crime scene (neutral white, slightly cool shadows) | G the empty frame, his shock.
const H = require("./heist_shot.js");
const FPS = 60, T = 15.7, N = Math.round(T * FPS);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sm = k => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const camK = (pos, tgt, fov, o) => Object.assign({ pos, tgt, fov, focus: Math.hypot(...pos.map((v, i) => v - tgt[i])) }, o || {});
// engine segments (Pion cards): start/end in seconds
const SEG = { sO: [5.6, 10.75], sA: [10.75, 15.7] };
const ef = (k, t) => Math.max(0, Math.round((t - SEG[k][0]) * FPS));
const PION = (eng, t, o) => Object.assign({ eng, ef: ef(eng, t), height: 1.03, preset: "detective", tint: [1, 0.97, 0.92] }, o);
// ballistic hops (as in The Mysterious Like): straight line between landings, parabola up, squash on landing
function hops(t, W, Hh = 0.5) { if (t <= W[0].t) return { p: W[0].p, lift: 0, squash: 1 }; for (let i = 1; i < W.length; i++) { const a = W[i - 1], b = W[i]; if (t <= b.t) { const TT = b.t - a.t, h = t - a.t, u = h / TT;
  return { p: L3(a.p, b.p, u), lift: 0.5 * 9.81 * Hh * h * (TT - h), squash: h < 0.05 ? 0.9 : 1 }; } } const e = W[W.length - 1], d = t - e.t; return { p: e.p, lift: 0, squash: d < 0.08 ? 0.88 : 1 }; }
const WALK = []; { let z = 3.4, t = 10.85; WALK.push({ t, p: [0.15, 0, z] }); for (let i = 0; i < 7; i++) { t += 0.38; z -= 0.62; WALK.push({ t, p: [0.15 + 0.06 * Math.sin(i * 1.3), 0, z] }); } }   // through the arch, arrives at z -0.94 at 13.51
// office constants (The Photograph office, as used in The Mysterious Like)
const SEAT = 0.46, PZ = -1.37, FACE = [0, 1.12, -1.37], LAPP = { pos: [0.05, 0.786, -1.12], ry: Math.PI };
const SH = [   // [t0, t1, set/loc, camera(t)]
  [0, 5.6, "heist"],
  [5.6, 7.9, "office", t => { const k = sm((t - 5.6) / 2.3); return camK(L3([0.62, 1.42, -1.95], [0.5, 1.33, -1.72], k), [0.05, 0.95, -0.98], 44 - 6 * k); }],        // over his shoulder: the case file lands, ASSIGNED
  [7.9, 10.75, "office", t => { const k = sm((t - 7.9) / 2.85); return camK(L3([1.25, 1.32, -0.55], [1.02, 1.22, -0.78], k), [0.0, 1.0, -1.37], 42 - 6 * k); }],          // front-right, past the laptop: the DEATH NOTE, him writing
  [10.75, 12.4, "gallery", t => { const k = sm((t - 10.75) / 1.65); return camK(L3([-1.3, 1.25, -0.9], [-1.15, 1.2, -0.45], k), [0.1, 1.1, 2.6 - 1.4 * k], 52 - 5 * k); }],      // from inside the hall: he comes in through the arch under the chandelier
  [12.4, 14.1, "gallery", t => { const P = hops(t, WALK), k = sm((t - 12.4) / 1.7); return camK(L3([1.55, 1.35, 1.4], [1.15, 1.3, 0.25], k), [lerp(P.p[0], 0, k * 0.6), 0.9, lerp(P.p[2] - 1.2, -2.9, k)], 50 - 5 * k); }],   // behind-right, the crime scene opens up
  [14.1, 14.95, "gallery", t => { const k = sm((t - 14.1) / 0.85); return camK(L3([0.42, 1.42, -0.55], [0.22, 1.45, -1.55], k), [0, 1.45, -3.4], 40 - 9 * k); }],         // a firmer zoom on the empty frame         // push in: the empty frame
  [14.95, T, "gallery", t => { const k = sm((t - 14.95) / 0.75); return camK(L3([0.7, 1.05, -2.35], [0.62, 1.08, -2.2], k), [0.12, 0.72, -1.05], 44 - 7 * sm(clamp((t - 14.95) / 0.22)) - 2 * k); }],   // a short zoom punch on "gone"          // his face: shock
];
function frame(f) {
  const t = f / FPS; const S = SH.find(s => t >= s[0] && t < s[1]) || SH[SH.length - 1];
  if (S[2] === "heist") { const lt = Math.min(Math.max(0, t - 0.5), H.T - 0.001), F = Object.assign(H.frame(lt), { t });   // a half-second establishing beat first, the empty frame held at the end
    if (t - 0.5 > H.T - 0.001) { const k = sm(clamp((t - 0.5 - H.T) / 0.6)); F.cam = Object.assign({}, F.cam, { pos: L3(F.cam.pos, F.cam.tgt, 0.12 * k) }); F.cam.focus = Math.hypot(...F.cam.pos.map((v, i) => v - F.cam.tgt[i])); }
    return F; }
  const c = S[3](t);
  if (S[2] === "office") {   // early investigation: neutral white, the laptop models his face
    const F = { t, set: "office", cam: c, mood: "normal", lampK: 0.75, dust: false, charLight: "screen",
      laptop: Object.assign({ mode: "case", k: clamp((t - 5.75) / 2.0), light: 6.5 }, LAPP), pion: PION("sO", t, { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" }) };
    return F; }
  // gallery: the investigation (neutral white daylight + cooler shadows); the frame is empty, the glass looks untouched, tape on the stanchions
  const F = { t, set: "museum", loc: "gallery", mood: "dayNeutral", cam: c, painting: false, glass: "ok", tape: true, fabric: true, pions: [] };
  const P = hops(t, WALK);
  const yaw = 180;
  F.pions.push(PION("sA", t, { anchor: [P.p[0], P.lift, P.p[2]], lift: P.lift, squash: P.squash, yaw }));
  F.key = { at: [P.p[0], 0.6, P.p[2]], from: [0.7, 1.9, 1.3], col: 0xf2f4ff, k: 6.5 };
  if (S[0] >= 14.95) F.key = { at: [P.p[0], 0.7, P.p[2]], from: [0.4, 1.2, -1.0], col: 0xf6f8ff, k: 7 };
  return F; }
module.exports = { N, SEG, SH, frame, T, WALK };
