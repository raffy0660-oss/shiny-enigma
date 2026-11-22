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
// held phone (apt) at (1.05, 0.55, 0.05), rx 1.32, ry -0.35: screen normal + picture point
const HN = [-0.332, 0.248, 0.910], HP = [1.009, 0.497, 0.064], HC = [1.05, 0.55, 0.05];
const along = (p, n, d) => p.map((v, i) => v + n[i] * d);
// office
const PZ = -1.37, SEAT = 0.46, LAPP = { pos: [0.05, 0.786, -1.12], ry: Math.PI }, SCR = [0.05, 0.95, -0.96];
const BY = 1.52, BZ = -2.54, PFPY = BY + (0.5 - 230 / 1260) * 1.2, USERY = BY + (0.5 - 974 / 1260) * 1.2;
const VIC = { anchor: [0.78, 0, 0.36], face: [0.75, 0.2, -0.14], feet: [0.78, 0.2, 0.86] };
const SH = [   // [t0, set, loc, camera keys]
  [0.0, "mlike", "apt", [look(0.0, [-1.7, 1.55, 1.05], [1.15, 0.22, 0.2], 46),                                    // wide: room, her body, her lit phone, Pion at the wall
    look(0.62, [-0.42, 0.86, 0.02], VIC.face, 42, "io"),                                                              // "beautiful": punch in on her head
    look(2.55, [-0.38, 0.82, 1.08], VIC.feet, 42, "io"),                                                              // scan down the body to her feet ("millions of followers")
    look(3.0, [-0.4, 0.84, 1.12], VIC.feet, 42, "lin"),
    look(3.42, [0.55, 0.92, 1.15], [1.7, 0.62, 0.1], 38, "io"),                                                       // "found dead": zoom to Pion as he pushes off the wall
    look(4.86, [-0.25, 0.95, 0.75], [0.75, 0.3, -0.35], 42, "io")]],                                                  // follow his hops round her head to the phone
  [4.86, "mlike", "apt", [look(4.86, [-0.28, 0.34, 0.62], [0.45, 0.32, -0.3], 44), look(6.38, [-0.15, 0.36, 0.42], [0.45, 0.32, -0.32], 42, "lin")]],   // low: he crouches, picks it up
  [6.38, "mlike", "apt", [look(6.38, along(HC, HN, 0.42), HC, 40, null, { aperture: 0.003 }), look(7.35, along(HC, HN, 0.36), HC, 40, "lin", { aperture: 0.003 }),
    look(8.54, along([HC[0] - 0.02, HC[1] - 0.045, HC[2] + 0.01], HN, 0.22), [HC[0] - 0.02, HC[1] - 0.045, HC[2] + 0.01], 40, "io", { aperture: 0.003 })]],   // profile -> latest video -> engagement
  [8.54, "mlike", "apt", [look(8.54, along(HP, HN, 0.2), HP, 40, null, { aperture: 0.004 }), look(10.7, along(HP, HN, 0.1), HP, 40, "lin", { aperture: 0.004 })]],   // macro push on the picture
  [10.7, "office", null, [look(10.7, [1.45, 1.0, -1.05], [0.0, 0.86, -1.25], 40), look(13.0, [1.32, 1.0, -1.12], [0.0, 0.86, -1.25], 40, "lin"),   // side: Pion at the desk, the laptop's back to us
    look(15.3, [0.55, 1.2, -1.8], [0.05, 0.95, -1.05], 44, "io"),                                                    // arc behind his shoulder: the report
    look(16.95, [0.05, 0.955, -1.2], SCR, 34, "in")]],                                                               // push into the screen
  [16.95, "mlike", "phones", [look(16.95, [29.82, 0.78, 0.6], [30.08, 0.1, -0.12], 44), look(20.0, [29.86, 0.66, 0.48], [30.06, 0.08, -0.1], 44, "lin"),   // second scene: Pion by her phone
    look(21.0, [29.95, 0.38, 0.26], [30.0, 0.012, 0.0], 40, "io", { aperture: 0.004 }), look(22.1, [29.96, 0.34, 0.22], [30.0, 0.012, 0.0], 40, "lin", { aperture: 0.004 })]],   // rack to the screen
  [22.1, "mlike", "phones", [look(22.1, [PH[0].c[0] - 0.035, 0.31, 0.17], PH[0].c, 40), look(25.04, P(0, -0.01, 0.13, 0.05), P(0, 0, 0, 0), 40, "io")]],
  [25.04, "mlike", "phones", [look(25.04, P(1, 0.07, 0.15, 0.08), P(1, 0, 0, 0), 40, "io", { roll: 0.28 }), look(25.94, P(1, 0.05, 0.12, 0.06), P(1, 0, 0, 0), 40, "lin", { roll: 0.24 })]],
  [25.94, "mlike", "phones", [look(25.94, P(2, 0, 0.24, 0.001), P(2, 0, 0, 0), 40, "io", { roll: 0.5 }), look(26.15, P(2, 0, 0.17, 0.001), P(2, 0, 0, 0), 40, "out", { roll: 0.0 }), look(26.8, P(2, 0, 0.15, 0.001), P(2, 0, 0, 0), 40, "lin", { roll: -0.04 })]],
  [26.8, "mlike", "phones", [look(26.8, P(3, -0.06, 0.1, 0.07), P(3, 0, 0, 0), 40, "io", { roll: -0.2 }), look(27.7, P(3, -0.03, 0.06, 0.035), P(3, 0, 0, 0), 40, "in", { roll: -0.24 })]],
  [27.7, "office", null, [look(27.7, [-0.78, 1.32, -1.98], [-0.78, 1.2, BZ], 62), look(30.4, [0.78, 1.32, -1.98], [0.78, 1.2, BZ], 62, "lin"),   // lateral along the four panels
    look(31.2, [0.0, 2.02, -1.3], [0.0, 1.72, BZ], 52, "io"), look(32.5, [0.0, 1.98, -1.62], [0.0, PFPY, BZ], 46, "io")]],                       // rise over the chair, push to the repeated picture
  [32.5, "office", null, [look(32.5, [1.6, 1.08, -0.62], [0.35, 1.05, -2.3], 44), look(37.7, [1.38, 1.06, -0.86], [0.38, 1.08, -2.3], 44, "lin")]],   // Pion at the board pinning the obituaries
  [37.7, "office", null, [look(37.7, [-0.82, USERY + 0.05, -2.05], [-0.82, USERY, BZ], 50), look(39.8, [0.8, USERY + 0.05, -2.05], [0.8, USERY, BZ], 50, "lin"),   // the usernames, crossed out one by one
    look(40.85, [0.0, 1.7, -2.0], [0.0, PFPY, BZ], 48, "io")]],                                                                                    // tilt up to the picture that never changes
  [40.85, "office", null, [look(40.85, [0.58, 1.22, -1.82], [0.05, 0.95, -1.05], 44), look(43.0, [0.4, 1.1, -1.62], [0.05, 0.95, -1.0], 42, "lin"),   // over his shoulder: the trace
    look(44.6, [0.05, 0.952, -1.205], SCR, 34, "in")]],                                                                                            // into the house photo
  [44.6, "mlike", "ext", [look(44.6, [60.0, 1.12, -7.2], [60.0, 1.05, -2.0], 30), look(45.3, [60.0, 1.0, -4.2], [60.0, 0.95, -2.0], 46, "io")]],   // match cut: the real house, glide to the door
  [45.3, "mlike", "ext", [look(45.3, [60.28, 0.92, -3.55], [60.0, 0.78, -2.0], 44), look(46.3, [60.15, 0.95, -2.75], [60.0, 0.8, -1.2], 44, "lin")]],   // behind Pion: he opens the door, goes in
  [46.3, "mlike", "house", [look(46.3, [60.05, 1.05, -1.75], [60.4, 0.7, 0.3], 46), look(47.1, [60.2, 1.1, -1.2], [60.9, 0.6, -0.15], 46, "io")]],   // follow him in: the table appears
  [47.1, "mlike", "house", [look(47.1, [60.55, 1.02, 0.42], [60.85, 0.58, -0.22], 44, null, { aperture: 0.003 }), look(50.2, [61.35, 0.98, 0.32], [61.0, 0.58, -0.2], 44, "lin", { aperture: 0.003 })]],   // over the phones
  [50.2, "mlike", "house", [look(50.2, [59.3, 1.15, 1.7], [58.6, 0.85, -1.0], 48), look(52.6, [59.3, 1.15, 1.7], [61.2, 0.85, -0.6], 48, "lin")]],   // slow pan: nobody
  [52.6, "mlike", "house", [look(52.6, [59.95, 0.78, 0.8], [59.72, 0.62, -0.35], 40), look(54.0, [59.86, 0.74, 0.6], [59.72, 0.62, -0.35], 40, "lin")]],   // he checks his phone
  [54.0, "mlike", "house", [look(54.0, [60.35, 0.64, 0.32], [60.35, 0.62, -0.05], 40, null, { aperture: 0.003 }), look(57.95, [60.35, 0.632, 0.14], [60.35, 0.62, -0.05], 40, "lin", { aperture: 0.003 })]],   // the notification
  [57.95, "mlike", "house", [look(57.95, [60.35, 0.8, 2.05], [59.9, 0.62, -0.7], 44), look(59.1, [60.15, 0.76, 1.75], [59.9, 0.62, -0.7], 44, "lin"), look(59.7, [60.1, 0.74, 1.62], [59.88, 0.63, -0.7], 44, "out")]],   // slow arc in, the slam
  [59.7, "mlike", "house", [look(59.7, [59.9, 0.76, 1.15], [59.72, 0.62, -0.35], 36), look(63.45, [59.74, 0.7, 0.74], [59.72, 0.62, -0.35], 36, "lin")]],   // his face: confusion -> fear, the slow look back
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
const PA_W = [{ t: 3.66, p: [1.72, 0, 0.12] }, { t: 4.12, p: [1.3, 0, -0.55] }, { t: 4.58, p: [0.85, 0, -0.62] }, { t: 5.04, p: [0.42, 0, -0.42] }];
const PE_W = [{ t: 45.85, p: [60, 0.12, -2.45] }, { t: 46.3, p: [60, 0, -1.6] }];
const PH_W = [{ t: 46.4, p: [60, 0, -1.6] }, { t: 46.9, p: [60.25, 0, -0.95] }, { t: 47.4, p: [60.45, 0, -0.35] }, { t: 47.9, p: [60.55, 0, 0.25] }];
const SEG = { pA: [0, 10.7], pO1: [10.7, 16.95], pB: [16.95, 22.1], pO2: [32.5, 37.7], pO3: [40.85, 44.6], pE: [45.3, 46.3], pH: [46.3, 52.6], pH2: [52.6, 54.0], pH3: [57.95, 63.45], vic: [0, 10.7] };
const ef = (k, t) => Math.max(0, Math.round((t - SEG[k][0]) * FPS));
const PION = (eng, t, o) => Object.assign({ eng, ef: ef(eng, t), height: 1.15, preset: "detective", tint: [1, 0.97, 0.92] }, o);
function flash(t) { const f1 = t >= 64.24 ? Math.exp(-(t - 64.24) * 22) : 0, f2 = t >= 64.45 ? 0.55 * Math.exp(-(t - 64.45) * 26) : 0; return Math.min(1, f1 + f2); }
function door(t) { if (t < 45.4) return 0; if (t < 59.1) return -1.2 * clamp((t - 45.4) / 0.5) ** 0.7;   // Pion opens it inward and leaves it open
  if (t < 59.2) { const k = clamp((t - 59.1) / 0.1); return -1.2 * (1 - k * k); } const d = t - 59.2; return 0.035 * Math.sin(d * 70) * Math.exp(-d * 7); }   // slam + rattle
const VID = (user, title, thumb) => ({ mode: "video", o: { user, title, thumb, ago: "just now" } });
module.exports = { N, SH, SEG, frame(f) {
  const t = f / FPS; let s = 0; while (s < SH.length - 1 && t >= SH[s + 1][0]) s++;
  const [t0, set, loc, K] = SH[s], c = cam(K, t), sk = shake(t);
  c.pos = [c.pos[0] + sk.x, c.pos[1] + sk.y, c.pos[2]]; c.roll = (c.roll || 0) + sk.r; if (c.aperture == null || isNaN(c.aperture)) c.aperture = loc === "phones" ? 0.004 : 0.0016;
  const F = { t, set, cam: c };
  if (set === "office") {
    Object.assign(F, { mood: "tension", lampK: 0.7, dust: false });
    if (s === 4) { F.laptop = Object.assign({ mode: "report", k: clamp((t - 15.3) / 1.6), light: 3.4 }, LAPP); F.pion = PION("pO1", t, { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" }); }
    if (s >= 10 && s <= 12) { F.board = { k1: clamp((t - 27.9) / 3.0), k2: clamp((t - 33.4) / 2.8), k3: clamp((t - 38.0) / 1.9) }; F.laptop = null; }
    if (s === 11) F.pion = PION("pO2", t, { anchor: [0.62, 0, -2.08] });
    if (s === 13) { F.laptop = Object.assign({ mode: "map", k: clamp((t - 41.2) / 3.3), light: 3.4, img: "/eng/house_still.jpg" }, LAPP); F.pion = PION("pO3", t, { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" }); }
    return F;
  }
  F.loc = loc; F.pions = [];
  if (loc === "apt") {
    let pa; if (t < 3.34) pa = { p: [1.72, 0, 0.12], lift: 0, squash: 1, roll: -0.13 }; else { const h = hops(t, PA_W); pa = Object.assign(h, { roll: -0.13 * (1 - clamp((t - 3.34) / 0.3)) }); if (t < 3.5) pa.squash = 0.92; }
    if (t > 5.05 && t < 6.25) pa.squash = 0.86;   // crouch to pick the phone up
    F.pions = [PION("pA", t, { anchor: [pa.p[0], pa.lift, pa.p[2]], lift: pa.lift, roll: pa.roll, squash: pa.squash }),
               { eng: "vic", ef: ef("vic", t), anchor: VIC.anchor, ground: 0, height: 1.1, preset: "victim", facing: "faceCam", bodyDir: [0, -1], push: 0.35, tint: [1, 0.95, 0.95] }];
    F.puffs = t > 3.66 ? PA_W.slice(1).map(w => ({ p: [w.p[0], 0, w.p[2]], age: t - w.t })) : [];
    F.vicPhone = t < 6.1; F.vicMode = { mode: "profile" };
    if (s === 2) F.heldPhone = t < 7.35 ? { mode: "profile" } : VID("@m0rn1ngdew_", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"]);
    if (s === 3) F.heldPhone = VID("@m0rn1ngdew_", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"]);
    if (t > 9.5 && t < 10.6) F.spotK = Math.sin(t * 47) * Math.sin(t * 13) > 0.1 ? 1 : 0.35;   // the lamp flickers on the picture
  }
  if (loc === "phones") { F.m0Mode = t < 20.9 ? { mode: "history", o: { hi: 1 } } : VID("@quiet.hollow", "study with me (6 hours)", ["#2b3a6a", "#7a8ad8"]);
    if (s === 5) F.pions = [PION("pB", t, { anchor: [30.38, 0, -0.32], squash: 0.9 })]; }
  if (loc === "ext") { F.door = door(t); if (s === 15) { const h = hops(t, PE_W); F.pions = [PION("pE", t, { anchor: [h.p[0], h.p[1] + h.lift, h.p[2]], lift: h.lift, ground: h.p[1], squash: h.squash })]; } }
  if (loc === "house") { F.door = door(t); F.figure = s === 23; F.flash = flash(t); F.fall = t >= 64.24 ? t - 64.24 : null; F.pkey = s < 23 ? 1 : 0; F.tableK = s >= 16 && s <= 18 ? 1 : 0.4;
    if (s >= 16 && s <= 18) { const h = hops(t, PH_W); F.pions = [PION("pH", t, { anchor: [h.p[0], h.lift, h.p[2]], lift: h.lift, squash: h.squash })]; }
    if (s === 19) F.pions = [PION("pH2", t, { anchor: [59.72, 0, -0.35] })];
    if (s === 20) F.pionPhone = { mode: "notif" };
    if (s === 21 || s === 22) F.pions = [PION("pH3", t, { anchor: [59.72, 0, -0.35], tint: [0.92, 0.95, 1.05] })]; }
  return F; } };
