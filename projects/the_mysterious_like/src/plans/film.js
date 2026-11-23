// THE MYSTERIOUS LIKE: the full film (66.19 s, 60 fps, 3972 frames). Times = ORIGINAL VO seconds (audio/stt.json), see STORYBOARD.md.
// User notes on the approved sample: hook = punch in on her head, scan along the body to her feet, then zoom to Pion; her phone visible from the
// first frame; a little shake + rattle when the door slams; on the lightning a lamp falls in from the side; the push on the silhouette stays small.
// Sets: mlike (apt | phones | ext | house) and office (The Photograph's office with the optional evidence board / laptop modes).
const { cam, lerp, clamp } = require("./lib.js");
const FPS = 60, N = Math.round(66.19 * FPS);
const look = (t, pos, tgt, fov, ease, extra) => Object.assign({ t, pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), ease }, extra || {});
// ---- phones of the other victims (as in mlike.js): profile picture in world space
const PH = [[30, -0.35], [33, 0.5], [36, 0.2], [39, -0.8]].map(([x, ry]) => { const lx = -0.0338, lz = 0.0577; return { c: [x, 0.013, 0], pfp: [x + lx * Math.cos(ry) + lz * Math.sin(ry), 0.014, -lx * Math.sin(ry) + lz * Math.cos(ry)] }; });
const P = (i, dx, dy, dz) => [PH[i].pfp[0] + dx, PH[i].pfp[1] + dy, PH[i].pfp[2] + dz];
// ---- revision v2 (user notes on the full film): camera further back (Pion felt too big), Pion 1.03 m like the sets were built for, the phone is
// picked up / taken out in one continuous move (no swap), the head nods DOWN at phones / laptops, light on every shot (warm orange hook -> blue),
// office: from behind the laptop -> swing left -> over the shoulder into the screen; board: wide on all four -> right -> carried left; typing scene.
const V3 = { sub: (a, b) => a.map((v, i) => v - b[i]), add: (a, b) => a.map((v, i) => v + b[i]), mul: (a, k) => a.map(v => v * k), norm: a => { const l = Math.hypot(...a); return a.map(v => v / l); },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
function phoneFrame(pos, face) {   // same basis as mlike.js poseQuat: Y = screen normal, -Z = phone top
  const Y = V3.norm(V3.sub(face, pos)), up = V3.norm(V3.sub([0, 1, 0], V3.mul(Y, Y[1]))), Z = V3.mul(up, -1), X = V3.norm(V3.cross(Y, Z));
  const at = (u, w) => V3.add(pos, V3.add(V3.add(V3.mul(X, u), V3.mul(Y, 0.013)), V3.mul(Z, w)));   // point on the screen (u right, w down from centre)
  return { n: Y, at, cam: (u, w, d) => V3.add(at(u, w), V3.mul(Y, d)) }; }
// hook: her phone rises from the floor up to his face (he looks down to pick it up, then reads it head up); the inserts look at that same phone from his eyes
const PA_END = [0.12, 0, -0.45], VP = { pos: [0.28, 0.4, -0.05], face: [0.12, 0.79, -0.45] }, VF = phoneFrame(VP.pos, VP.face);   // where his hand (engine `gest hp`) holds it: in front of his chest
// house: he takes his own phone out
const PP = { pos0: [59.8, 0.12, -0.14], pos: [59.88, 0.4, 0.06], face: [59.72, 0.79, -0.35] }, PF = phoneFrame(PP.pos, PP.face);
// office
const PZ = -1.37, SEAT = 0.46, LAPP = { pos: [0.05, 0.786, -1.12], ry: Math.PI }, SCR = [0.05, 0.95, -0.96], FACE = [0.0, 1.12, -1.37];
const BY = 1.52, BZ = -2.54, PFPY = BY + (0.5 - 230 / 1260) * 1.2, USERY = BY + (0.5 - 974 / 1260) * 1.2;
const VIC = { anchor: [0.78, 0, 0.36], face: [0.75, 0.2, -0.14], feet: [0.78, 0.2, 0.86] };
const SH = [   // [t0, set, loc, camera keys]
  [0.0, "mlike", "apt", [look(0.0, [-1.75, 1.6, 1.25], [1.1, 0.25, 0.15], 50),                                     // wide: warm room, her body, her lit phone, Pion at the wall
    look(0.62, [-1.0, 1.1, 0.2], [0.72, 0.22, -0.02], 44, "io"),                                                      // "beautiful": in on her head
    look(2.55, [-0.95, 1.08, 1.1], [0.78, 0.2, 0.74], 44, "io"),                                                      // scan down the body to her feet
    look(3.0, [-0.97, 1.09, 1.14], [0.78, 0.2, 0.76], 44, "lin"),
    look(3.42, [1.0, 1.22, 2.05], [1.6, 0.46, 0.1], 46, "io"),                                                       // "found dead": to Pion pushing off the wall
    look(4.86, [-1.15, 1.22, 1.55], [0.45, 0.35, -0.4], 48, "io")]],                                                     // follow his hops round her head
  [4.86, "mlike", "apt", [look(4.86, [-1.62, 1.1, 1.58], [0.2, 0.38, -0.3], 46), look(6.38, [-1.44, 1.06, 1.38], [0.2, 0.4, -0.3], 46, "lin")]],   // he reaches down, the phone rises to him
  [6.38, "mlike", "apt", [look(6.38, VF.cam(0, 0, 0.42), VF.at(0, 0), 40, null, { aperture: 0.003 }), look(7.35, VF.cam(0, 0, 0.36), VF.at(0, 0), 40, "lin", { aperture: 0.003 }),
    look(8.54, VF.cam(-0.015, 0.045, 0.22), VF.at(-0.015, 0.045), 40, "io", { aperture: 0.003 })]],                  // his eyes: profile -> latest video -> engagement
  [8.54, "mlike", "apt", [look(8.54, VF.cam(-0.0338, 0.0577, 0.2), VF.at(-0.0338, 0.0577), 40, null, { aperture: 0.004 }), look(10.7, VF.cam(-0.0338, 0.0577, 0.1), VF.at(-0.0338, 0.0577), 40, "lin", { aperture: 0.004 })]],   // macro push on the picture
  [10.7, "office", null, [look(10.7, [0.95, 1.3, 0.8], FACE, 48), look(12.9, [0.7, 1.26, 0.45], FACE, 46, "lin"),             // from behind the laptop, off its right edge: lid in front, his face clear above/beside it in its light
    look(14.5, [-1.65, 1.3, -0.15], [0.0, 1.02, -1.3], 46, "io"),                                                  // swing to the left
    look(15.45, [-1.22, 1.44, -1.42], [0.05, 0.95, -1.0], 44, "io"),                                                // over his left shoulder: the report
    look(16.25, [-0.4, 1.05, -1.05], SCR, 38, "io"), look(16.95, [0.04, 0.955, -1.14], SCR, 34, "in")]],             // round his shoulder and into the screen
  [16.95, "mlike", "phones", [look(16.95, [29.2, 1.38, 1.8], [30.2, 0.34, -0.3], 46), look(20.0, [29.3, 1.27, 1.58], [30.15, 0.3, -0.25], 46, "lin"),   // victim 2's bedroom: Pion by her phone
    look(21.0, [29.95, 0.38, 0.26], [30.0, 0.012, 0.0], 40, "io", { aperture: 0.004 }), look(22.1, [29.96, 0.34, 0.22], [30.0, 0.012, 0.0], 40, "lin", { aperture: 0.004 })]],   // rack to the screen
  [22.1, "mlike", "phones", [look(22.1, [PH[0].c[0] - 0.035, 0.31, 0.17], PH[0].c, 40), look(25.04, P(0, -0.01, 0.13, 0.05), P(0, 0, 0, 0), 40, "io")]],
  [25.04, "mlike", "phones", [look(25.04, P(1, 0.07, 0.15, 0.08), P(1, 0, 0, 0), 40, "io", { roll: 0.28 }), look(25.94, P(1, 0.05, 0.12, 0.06), P(1, 0, 0, 0), 40, "lin", { roll: 0.24 })]],
  [25.94, "mlike", "phones", [look(25.94, P(2, 0, 0.24, 0.001), P(2, 0, 0, 0), 40, "io", { roll: 0.5 }), look(26.15, P(2, 0, 0.17, 0.001), P(2, 0, 0, 0), 40, "out", { roll: 0.0 }), look(26.8, P(2, 0, 0.15, 0.001), P(2, 0, 0, 0), 40, "lin", { roll: -0.04 })]],
  [26.8, "mlike", "phones", [look(26.8, P(3, -0.06, 0.1, 0.07), P(3, 0, 0, 0), 40, "io", { roll: -0.2 }), look(27.7, P(3, -0.03, 0.06, 0.035), P(3, 0, 0, 0), 40, "in", { roll: -0.24 })]],
  [27.7, "office", null, [look(27.7, [0.0, 1.62, 0.25], [0.0, 1.5, BZ], 64), look(28.7, [0.0, 1.6, 0.02], [0.0, 1.5, BZ], 64, "lin"),   // wide: all four victims
    look(29.7, [0.72, 1.56, -1.55], [0.72, 1.45, BZ], 50, "io"),                                                     // in on the right one first
    look(31.6, [-0.72, 1.56, -1.55], [-0.72, 1.45, BZ], 50, "io"), look(32.5, [-0.7, 1.57, -1.62], [-0.72, 1.46, BZ], 50, "lin")]],   // carried to the left
  [32.5, "office", null, [look(32.5, [1.35, 1.42, 0.25], [0.0, 1.0, -1.3], 48), look(34.6, [1.0, 1.24, 0.1], [0.0, 1.02, -1.3], 46, "io"),   // "after hours of digging": from the right, a little above, pushing in on him typing fast (face clear of the lid)
    look(37.7, [-0.85, 1.2, 0.2], FACE, 44, "io")]],                                                                // arc round the laptop to his face in the screen light
  [37.7, "office", null, [look(37.7, [-0.82, USERY + 0.05, -2.05], [-0.82, USERY, BZ], 52), look(39.8, [0.8, USERY + 0.05, -2.05], [0.8, USERY, BZ], 52, "lin"),   // the usernames, crossed out one by one
    look(40.85, [0.0, 1.7, -2.0], [0.0, PFPY, BZ], 50, "io")]],                                                                                    // tilt up to the picture that never changes
  [40.85, "office", null, [look(40.85, [1.45, 1.5, -1.3], [0.05, 0.95, -1.0], 46), look(43.0, [1.2, 1.42, -1.42], [0.05, 0.95, -1.0], 44, "lin"),   // over his right shoulder: the trace
    look(43.8, [0.5, 1.05, -1.05], SCR, 38, "io"), look(44.6, [0.06, 0.953, -1.15], SCR, 34, "in")]],                                                // into the house photo
  [44.6, "mlike", "ext", [look(44.6, [60.0, 1.12, -7.2], [60.0, 1.05, -2.0], 30), look(45.3, [60.0, 1.0, -4.4], [60.0, 0.95, -2.0], 46, "io")]],   // match cut: the real house, glide to the door
  [45.3, "mlike", "ext", [look(45.3, [60.75, 1.18, -5.1], [60.0, 0.72, -2.2], 44), look(46.3, [60.5, 1.12, -4.45], [60.0, 0.72, -1.6], 44, "lin")]],   // behind Pion, kept back so he stays small in the doorway: he opens the door, goes in
  [46.3, "mlike", "house", [look(46.3, [60.3, 1.1, 2.05], [60.05, 0.55, -1.1], 48), look(47.1, [60.4, 1.12, 1.9], [60.35, 0.52, -0.3], 48, "io")]],   // from inside: he comes in, the table appears
  [47.1, "mlike", "house", [look(47.1, [60.62, 1.26, 0.78], [60.92, 0.58, -0.2], 44, null, { aperture: 0.003 }), look(50.2, [61.42, 1.22, 0.62], [61.0, 0.58, -0.2], 44, "lin", { aperture: 0.003 })]],   // over the phones
  [50.2, "mlike", "house", [look(50.2, [59.3, 1.2, 1.9], [58.6, 0.85, -1.0], 50), look(52.6, [59.3, 1.2, 1.9], [61.2, 0.85, -0.6], 50, "lin")]],   // slow pan: nobody
  [52.6, "mlike", "house", [look(52.6, [60.12, 0.98, 1.75], [59.72, 0.55, -0.35], 42), look(54.0, [60.02, 0.95, 1.5], [59.72, 0.55, -0.35], 42, "lin")]],   // he takes his phone out
  [54.0, "mlike", "house", [look(54.0, PF.cam(0, 0, 0.3), PF.at(0, 0), 40, null, { aperture: 0.003 }), look(57.95, PF.cam(0, 0.01, 0.17), PF.at(0, 0.01), 40, "lin", { aperture: 0.003 })]],   // the notification
  [57.95, "mlike", "house", [look(57.95, [60.45, 0.86, 2.35], [59.9, 0.6, -0.7], 44), look(59.1, [60.22, 0.82, 2.05], [59.9, 0.6, -0.7], 44, "lin"), look(59.7, [60.16, 0.8, 1.95], [59.88, 0.61, -0.7], 44, "out")]],   // slow arc in, the slam
  [59.7, "mlike", "house", [look(59.7, [59.96, 0.82, 1.8], [59.72, 0.6, -0.35], 40), look(63.45, [59.8, 0.78, 1.32], [59.72, 0.6, -0.35], 40, "lin")]],   // his face: confusion -> fear, the slow look back
  [63.45, "mlike", "house", [look(63.45, [60.0, 0.75, 1.7], [60.0, 0.62, -1.45], 42), look(64.2, [60.0, 0.75, 1.62], [60.0, 0.62, -1.45], 42, "lin"),
    look(64.75, [60.0, 0.74, 1.28], [60.0, 0.64, -1.45], 42, "io"), look(66.2, [60.0, 0.74, 1.18], [60.0, 0.64, -1.45], 42, "lin")]],              // lightning: a small push toward the silhouette
];
const SHAKE = [[16.95, 0.5], [22.1, 0.4], [25.04, 1.0], [25.94, 1.0], [26.8, 1.2], [26.9, 1.4], [44.6, 0.3], [59.18, 1.3], [64.24, 0.5]];
function shake(t) { let x = 0, y = 0, r = 0; for (const [t0, s] of SHAKE) { const d = t - t0; if (d < 0 || d > 0.5) continue; const a = s * Math.exp(-d * 9);
  x += a * 0.012 * Math.sin(d * 97); y += a * 0.01 * Math.sin(d * 71 + 1); r += a * 0.02 * Math.sin(d * 53 + 2); } return { x, y, r }; }
// hops along waypoints: [{t, p}], each segment one parabolic hop; returns {p, lift, squash}
function hops(t, W, H = 0.55) { if (t <= W[0].t) return { p: W[0].p, lift: 0, squash: 1 }; for (let i = 1; i < W.length; i++) { const a = W[i - 1], b = W[i]; if (t <= b.t) { const T = b.t - a.t, h = t - a.t, u = h / T;
  return { p: [lerp(a.p[0], b.p[0], u), lerp(a.p[1], b.p[1], u), lerp(a.p[2], b.p[2], u)], lift: 0.5 * 9.81 * H * h * (T - h), squash: h < 0.05 ? 0.9 : 1 }; } }
  const e = W[W.length - 1], d = t - e.t; return { p: e.p, lift: 0, squash: d < 0.08 ? 0.88 : 1 }; }
const PA_W = [{ t: 3.66, p: [1.72, 0, 0.12] }, { t: 4.12, p: [1.3, 0, -0.6] }, { t: 4.58, p: [0.78, 0, -0.78] }, { t: 5.04, p: PA_END }];   // round her head, never through it
const PE_W = [{ t: 45.85, p: [60, 0.12, -2.45] }, { t: 46.3, p: [60, 0, -1.6] }];
const PH_W = [{ t: 46.4, p: [60, 0, -1.6] }, { t: 46.9, p: [60.0, 0, -0.95] }, { t: 47.4, p: [60.02, 0, -0.3] }, { t: 47.9, p: [60.05, 0, 0.35] }];
const SEG = { pA: [0, 10.7], pO1: [10.7, 16.95], pB: [16.95, 22.1], pO2: [32.5, 37.7], pO3: [40.85, 44.6], pE: [45.3, 46.3], pH: [46.3, 52.6], pH2: [52.6, 54.0], pH3: [57.95, 63.45], vic: [0, 10.7] };
const ef = (k, t) => Math.max(0, Math.round((t - SEG[k][0]) * FPS));
const PION = (eng, t, o) => Object.assign({ eng, ef: ef(eng, t), height: 1.03, preset: "detective", tint: [1, 0.97, 0.92] }, o);
function flash(t) { const f1 = t >= 64.24 ? Math.exp(-(t - 64.24) * 22) : 0, f2 = t >= 64.45 ? 0.55 * Math.exp(-(t - 64.45) * 26) : 0; return Math.min(1, f1 + f2); }
function door(t) { if (t < 45.4) return 0; if (t < 59.1) return -1.2 * clamp((t - 45.4) / 0.5) ** 0.7;   // Pion opens it inward and leaves it open
  if (t < 59.2) { const k = clamp((t - 59.1) / 0.1); return -1.2 * (1 - k * k); } const d = t - 59.2; return 0.035 * Math.sin(d * 70) * Math.exp(-d * 7); }   // slam + rattle
const VID = (user, title, thumb) => ({ mode: "video", o: { user, title, thumb, ago: "just now" } });
const GRAB = 5.1 + 0.32;   // f_pA: `5.10 gest hp ... angkat` grabs at t0 + .32
const WARM = 0xffa860, COOL = 0xa8bcff, SCRC = 0xc8d8ff;
module.exports = { N, SH, SEG, frame(f) {
  const t = f / FPS; let s = 0; while (s < SH.length - 1 && t >= SH[s + 1][0]) s++;
  const [t0, set, loc, K] = SH[s], c = cam(K, t), sk = shake(t);
  c.pos = [c.pos[0] + sk.x, c.pos[1] + sk.y, c.pos[2]]; c.roll = (c.roll || 0) + sk.r; if (c.aperture == null || isNaN(c.aperture)) c.aperture = loc === "phones" ? 0.004 : 0.0016;
  const F = { t, set, cam: c };
  if (set === "office") {   // light: the warm desk lamp fades as the night goes on, the laptop screen models his face
    Object.assign(F, { mood: s === 4 ? "normal" : "tension", lampK: s === 4 ? 0.85 : 0.55, dust: false });
    const seated = (eng) => PION(eng, t, { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" });
    if (s === 4) { F.laptop = Object.assign({ mode: "report", k: clamp((t - 15.3) / 1.6), light: 7 }, LAPP); F.pion = seated("pO1"); F.charLight = "screen"; }
    if (s >= 10 && s <= 12) F.board = { k1: clamp((t - 27.9) / 3.0), k2: clamp((t - 33.4) / 2.8), k3: clamp((t - 38.0) / 1.9) };
    if (s === 10 || s === 12) { F.laptop = null; F.noChair = s === 10; F.boardK = 2.2; }
    if (s === 11) { F.laptop = Object.assign({ mode: "obit", k: clamp((t - 32.6) / 4.6), light: 7.5 }, LAPP); F.pion = seated("pO2"); F.charLight = "screen"; }
    if (s === 13) { F.laptop = Object.assign({ mode: "map", k: clamp((t - 41.2) / 3.3), light: 7, img: "/eng/house_still.jpg" }, LAPP); F.pion = seated("pO3"); F.charLight = "screen"; }
    return F;
  }
  F.loc = loc; F.pions = [];
  if (loc === "apt") {   // warm, cheerful orange: the scene still looks like her world
    let pa; if (t < 3.34) pa = { p: [1.72, 0, 0.12], lift: 0, squash: 1, roll: -0.13 }; else { const h = hops(t, PA_W); pa = Object.assign(h, { roll: -0.13 * (1 - clamp((t - 3.34) / 0.3)) }); if (t < 3.5) pa.squash = 0.92; }
    if (t > 5.05 && t < 5.75) pa.squash = 0.86;   // he bends down to the phone
    const vic = { eng: "vic", ef: ef("vic", t), anchor: VIC.anchor, ground: 0, height: 1.1, preset: "victim", facing: "faceCam", bodyDir: [0, -1], push: 0.35, tint: [1, 0.95, 0.95] };
    const yawA = t < 3.34 ? -45 : -45 * (1 - clamp((t - 3.34) / 1.3));   // at the wall his body is turned toward her, then squares up as he hops
    F.pions = s <= 1 ? [vic, PION("pA", t, { anchor: [pa.p[0], pa.lift, pa.p[2]], lift: pa.lift, roll: pa.roll, squash: pa.squash, yaw: yawA })] : [vic];   // vic always index 0 (make_view)   // inserts are his eyes: no Pion
    F.puffs = t > 3.66 && s <= 1 ? PA_W.slice(1).map(w => ({ p: [w.p[0], 0, w.p[2]], age: t - w.t })) : [];
    F.key = s <= 1 ? { at: [pa.p[0], 0.55, pa.p[2]], from: [-0.7, 1.85, 1.1], col: WARM, k: 9 } : null;
    F.vicPhone = s >= 2 || t < GRAB;                                                   // on the floor until his hand closes on it (engine draws it in his hand from then)
    if (s >= 2) F.phonePose = { key: "vic", pos: VP.pos, face: VP.face, k: 1, glow: 0.6 };   // inserts: the phone where he holds it
    F.vicMode = s < 2 || t < 7.35 ? { mode: "profile" } : VID("@m0rn1ngdew_", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"]);
    if (t > 9.5 && t < 10.6) F.spotK = Math.sin(t * 47) * Math.sin(t * 13) > 0.1 ? 1 : 0.35;   // the lamp flickers on the picture
  }
  if (loc === "phones") { F.m0Mode = t < 20.9 ? { mode: "history", o: { hi: 1 } } : VID("@quiet.hollow", "study with me (6 hours)", ["#2b3a6a", "#7a8ad8"]);
    if (s === 5) { F.pions = [PION("pB", t, { anchor: [30.38, 0, -0.32], squash: 0.9 })]; F.key = { at: [30.38, 0.5, -0.32], from: [0.55, 1.8, 1.25], col: COOL, k: 8 }; F.lp = "interior_night"; } }
  if (loc === "ext") { F.door = door(t); if (s === 15) { const h = hops(t, PE_W); F.pions = [PION("pE", t, { anchor: [h.p[0], h.p[1] + h.lift, h.p[2]], lift: h.lift, ground: h.p[1], squash: h.squash })]; F.key = { at: [h.p[0], 0.6, h.p[2]], from: [0.8, 1.9, -1.4], col: COOL, k: 7 }; } }
  if (loc === "house") { F.door = door(t); F.figure = s === 23; F.flash = flash(t); F.fall = t >= 64.24 ? t - 64.24 : null; F.pkey = s < 23 ? 1 : 0; F.tableK = s >= 16 && s <= 18 ? 1.1 : 0.4; if (s === 18) { F.pkey = 1.6; F.hemiK = 1; }
    if (s >= 16 && s <= 18) { const h = hops(t, PH_W); const yawH = t < 46.9 ? 0 : t < 50.2 ? 50 * clamp((t - 46.9) / 0.6) : 50 * (1 - clamp((t - 50.2) / 0.4)); F.pions = [PION("pH", t, { anchor: [h.p[0], h.lift, h.p[2]], lift: h.lift, squash: h.squash, yaw: yawH })]; F.key = { at: [h.p[0], 0.55, h.p[2]], from: [0.75, 1.9, 1.3], col: COOL, k: 7 }; }
    if (s === 20) { F.phonePose = { key: "pion", pos: PP.pos, face: PP.face, k: 1, glow: 0.6 }; F.pionPhone = { mode: "notif" }; }   // s19: the engine draws it in his hand
    if (s === 19) { F.pions = [PION("pH2", t, { anchor: [59.72, 0, -0.35] })]; F.key = { at: [59.72, 0.55, -0.35], from: [0.6, 1.8, 1.3], col: COOL, k: 6 }; }
    if (s === 21 || s === 22) { F.pions = [PION("pH3", t, { anchor: [59.72, 0, -0.35], tint: [0.92, 0.95, 1.05] })]; F.key = { at: [59.72, 0.6, -0.35], from: [0.9, 1.6, 1.0], col: COOL, k: 5 }; } }
  return F; } };
