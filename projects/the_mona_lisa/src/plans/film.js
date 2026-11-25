// THE MONA LISA HEIST: the full film (73.0 s, 60 fps). VO word timing: audio/stt.json (ElevenLabs STT). Brief: 12 story beats, warm -> blue light,
// every subject lit by a focused light (not the whole room). User revisions after the sample: the hook starts IN the fall (no empty beat),
// the laptop shot further back, Pion casts a shadow when he walks (the key light that follows him throws it), VO loud, SFX a bit lower.
const H = require("./heist_shot.js");
const FPS = 60, T = 73.0, N = Math.round(T * FPS);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sm = k => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const camK = (pos, tgt, fov, o) => Object.assign({ pos, tgt, fov, focus: Math.hypot(...pos.map((v, i) => v - tgt[i])) }, o || {});
const SEG = { fO: [5.6, 10.8], fG1: [10.8, 24.4], fG2: [28.4, 32.4], fS: [32.4, 49.2], fC: [49.2, 59.4], fK: [67.6, 73.0] };
const ef = (k, t) => Math.max(0, Math.round((t - SEG[k][0]) * FPS));
const PION = (eng, t, o) => Object.assign({ eng, ef: ef(eng, t), height: 1.03, preset: "detective", tint: [1, 0.97, 0.92] }, o);
function hops(t, W, Hh = 0.5) { if (t <= W[0].t) return { p: W[0].p, lift: 0, squash: 1 }; for (let i = 1; i < W.length; i++) { const a = W[i - 1], b = W[i]; if (t <= b.t) { const TT = b.t - a.t, h = t - a.t, u = h / TT, hh = b.h ?? Hh;
  return { p: L3(a.p, b.p, u), lift: 0.5 * 9.81 * hh * h * (TT - h), squash: h < 0.05 ? 0.9 : 1 }; } } const e = W[W.length - 1], d = t - e.t; return { p: e.p, lift: 0, squash: d < 0.08 ? 0.88 : 1 }; }
// ---- Pion's paths
const WALK_G = []; { let z = 3.4, t = 10.85; WALK_G.push({ t, p: [0.15, 0, z] }); for (let i = 0; i < 7; i++) { t += 0.38; z -= 0.62; WALK_G.push({ t, p: [0.15 + 0.06 * Math.sin(i * 1.3), 0, z] }); } }   // -> (0.1, -0.94) at 13.51
WALK_G.push({ t: 15.95, p: [0.15, 0, -1.4] }, { t: 16.45, p: [0.22, 0, -2.12], h: 1.3 }, { t: 16.85, p: [0.25, 0, -2.6] });           // ... hops over the rope, stops at the case (the hook right above him)
const WALK_C = []; { let z = 2.7, t = 49.35; WALK_C.push({ t, p: [30.25, 0, z] }); for (let i = 0; i < 6; i++) { t += 0.36; z -= 0.42; WALK_C.push({ t, p: [30.25 + 0.04 * Math.sin(i), 0, z] }); } }   // -> z 0.18 at 51.51
const PG = [0.25, 0, -2.6], PS = [60.35, 0, 0.05], PC = [30.25, 0, 0.18], PK = [60.72, 0, -0.18];
const SEAT = 0.46, PZ = -1.37, LAPP = { pos: [0.05, 0.786, -1.12], ry: Math.PI };
const HOOKP = [0, 4.25, -2.65], HATCHP = [30.05, 2.7, -0.9], LOGP = [60.65, 1.0, -0.88], STAFFP = [59.3, 1.0, -0.88], CARDP = [30.7, 1.17, -4.96];
const hand = (p, yawDeg, up) => { const y = yawDeg * Math.PI / 180; return [p[0] + Math.sin(y) * 0.32 + Math.cos(y) * 0.2, (up ? 0.95 : 0.62), p[2] + Math.cos(y) * 0.32 - Math.sin(y) * 0.2]; };   // where his flashlight is
// reconstruction of the descent above the painting (24.4-28.4): the heist sim played slow, in cold light
const REC = t => Math.min(1.62, 0.25 + (t - 24.4) * 0.34);
// the thief dropping out of the hatch in the corridor (59.4-62.3): fall on the rope, caught just above the floor, settles
function hatchDrop(t) { const u = t - 59.55; if (u < 0) return 2.55; const fall = 2.55 - 0.5 * 9.81 * 0.55 * u * u; if (fall > 0.46) return fall; const s = u - Math.sqrt((2.55 - 0.46) / (0.5 * 9.81 * 0.55)); return 0.46 + 0.05 * Math.exp(-s * 6) * Math.sin(s * 22); }
const SH = [   // [t0, t1, set/loc, camera(t), mood]
  [0, 5.6, "heist"],
  [5.6, 7.9, "office", t => { const k = sm((t - 5.6) / 2.3); return camK(L3([-1.5, 1.52, -1.58], [-1.3, 1.46, -1.44], k), [0.05, 0.95, -0.98], 46 - 6 * k); }],               // further back over his shoulder: the case lands, ASSIGNED
  [7.9, 10.8, "office", t => { const k = sm((t - 7.9) / 2.9); return camK(L3([1.3, 1.62, -0.42], [1.12, 1.52, -0.58], k), [-0.22, 1.0, -1.25], 54 - 5 * k); }],              // the DEATH NOTE
  [10.8, 12.4, "gallery", t => { const k = sm((t - 10.8) / 1.6); return camK(L3([-1.3, 1.25, -0.9], [-1.15, 1.2, -0.45], k), [0.1, 1.1, 2.6 - 1.4 * k], 52 - 5 * k); }, "investigate"],
  [12.4, 14.1, "gallery", t => { const P = hops(t, WALK_G), k = sm((t - 12.4) / 1.7); return camK(L3([1.75, 1.45, 2.1], [1.4, 1.35, 0.75], k), [P.p[0] * 0.6, 0.8, P.p[2] - 1.0], 52 - 5 * k); }, "investigate"],
  [14.1, 14.95, "gallery", t => { const k = sm((t - 14.1) / 0.85); return camK(L3([0.42, 1.42, -0.55], [0.22, 1.45, -1.55], k), [0, 1.45, -3.4], 40 - 9 * k); }, "investigate"],
  [14.95, 15.75, "gallery", t => { const k = sm((t - 14.95) / 0.8); return camK(L3([0.7, 1.05, -2.35], [0.62, 1.08, -2.2], k), [0.12, 0.72, -1.05], 44 - 7 * sm(clamp((t - 14.95) / 0.22)) - 2 * k); }, "investigate"],
  [15.75, 19.75, "gallery", t => { const k = sm((t - 15.75) / 4.0); return camK(L3([1.25, 1.05, -1.55], [0.95, 1.12, -2.1], k), [0.12, 1.1, -2.95], 46 - 6 * k); }, "investigate"],        // the glass: untouched (his flashlight on it)
  [19.75, 22.7, "gallery", t => { const k = sm((t - 19.75) / 2.95); return camK(L3([0.95, 0.55, -1.2], [0.75, 0.62, -1.6], k), [0.1, lerp(1.4, 3.6, k), -2.7], 54 - 6 * k); }, "investigateCool"],   // he looks up: tilt to the ceiling
  [22.7, 24.4, "gallery", t => { const k = sm((t - 22.7) / 1.7); return camK(L3([0.45, 3.45, -1.75], [0.32, 3.65, -2.05], k), [0, 4.22, -2.65], 40 - 8 * k); }, "investigateCool"],        // the hook
  [24.4, 28.4, "gallery", t => { const k = sm((t - 24.4) / 4.0); return camK(L3([1.65, 0.75, -0.3], [1.45, 0.9, -0.75], k), [0, lerp(2.9, 2.3, k), -2.9], 54 - 5 * k); }, "reconstruct"],  // how he came down
  [28.4, 30.5, "gallery", t => { const k = sm((t - 28.4) / 2.1); return camK(L3([0.35, 3.62, -2.15], [0.24, 3.8, -2.32], k), [0, 4.22, -2.65], 34 - 8 * k); }, "investigateCool"],        // the black fabric in the hook
  [30.5, 32.4, "gallery", t => { const k = sm((t - 30.5) / 1.9); return camK(L3([1.02, 1.02, -2.32], [0.92, 0.98, -2.4], k), [0.25, 0.78, -2.6], 50 - 5 * k); }, "investigateCool"],      // he notes it in the DEATH NOTE (inside the rope, clear of the posts)
  [32.4, 35.0, "security", t => { const k = sm((t - 32.4) / 2.6); return camK(L3([61.35, 1.28, 1.25], [61.15, 1.3, 0.95], k), [60.0, 1.7, -1.45], 50 - 4 * k); }],                     // the CCTV wall, live
  [35.0, 38.25, "security", t => { const k = sm((t - 35.0) / 3.25); return camK(L3([60.62, 1.45, 0.25], [60.45, 1.55, -0.05], k), [60.0, 1.75, -1.45], 46 - 7 * k); }],              // ... one by one: NO SIGNAL
  [38.25, 39.05, "security", t => { const k = sm((t - 38.25) / 0.8); return camK(L3([59.45, 1.12, -0.95], [59.55, 1.1, -0.85], k), [60.3, 0.72, 0.05], 44 - 6 * sm(clamp((t - 38.25) / 0.2))); }],   // his face
  [39.05, 43.9, "security", t => { const k = sm((t - 39.05) / 4.85); return camK(L3([61.1, 1.28, -0.12], [60.98, 1.22, -0.32], k), LOGP, 40 - 7 * k); }],                           // the maintenance log
  [43.9, 46.0, "security", t => { const k = sm((t - 43.9) / 2.1); return camK(L3([59.5, 1.05, -0.75], [59.62, 1.02, -0.62], k), [60.3, 0.72, 0.02], 44 - 5 * k); }],                 // "but there was one problem"
  [46.0, 49.25, "security", t => { const k = sm((t - 46.0) / 3.25); return camK(L3([59.78, 1.24, -0.2], [59.62, 1.18, -0.38], k), STAFFP, 38 - 7 * k); }],                         // the head technician: MISSING
  [49.25, 54.25, "corridor", t => { const k = sm((t - 49.25) / 5.0); return camK(L3([30.62, 0.58, 1.75], [30.52, 0.7, 1.0], k), [30.15, lerp(0.55, 2.45, sm(clamp((t - 50.9) / 1.7))), lerp(0.4, -0.8, sm(clamp((t - 50.9) / 1.7)))], 54 - 6 * k); }],   // Pion walks in, then the lens rises to the open hatch
  [54.25, 57.5, "corridor", t => { const k = sm((t - 54.25) / 3.25); return camK(L3([30.78, 1.28, 0.62], [30.7, 1.2, 0.4], k), [30.25, 0.08, -0.85], 46 - 6 * k); }],              // footprints in the dust
  [57.5, 59.45, "corridor", t => { const k = sm((t - 57.5) / 1.95); return camK(L3([30.28, 1.3, -0.42], [30.27, 1.2, -0.55], k), [30.27, 0.0, -1.1], 40 - 6 * k); }],             // the two patterns
  [59.45, 62.35, "corridor", t => { const k = sm((t - 59.45) / 2.9); return camK(L3([30.78, 1.0, 1.65], [30.7, 0.95, 1.25], k), [30.08, lerp(1.6, 0.9, k), -0.95], 50 - 5 * k); }],   // the thief came down here
  [62.35, 65.55, "corridor", t => { const k = sm((t - 62.35) / 3.2); return camK(L3([30.8, 0.98, 1.25], [30.72, 0.92, 0.75], k), [30.45, 0.8, -0.62], 46 - 9 * k); }],           // ... someone was waiting below
  [65.55, 67.6, "corridor", t => { const k = sm((t - 65.55) / 2.05); return camK(L3([30.35, 1.26, -4.3], [30.42, 1.22, -4.45], k), CARDP, 36 - 7 * k); }],                         // the keycard reader
  [67.6, T, "security", t => { const k = sm((t - 67.6) / (T - 67.6)); return camK(L3([61.05, 1.24, -0.06], [60.8, 1.1, -0.5], k), LOGP, 38 - 18 * k); }],                         // the record: MUSEUM DIRECTOR
];
function frame(f) {
  const t = f / FPS, S = SH.find(s => t >= s[0] && t < s[1]) || SH[SH.length - 1];
  if (S[2] === "heist") {   // starts IN the fall (user: no empty beat); the empty frame is held at the end
    const lt = Math.min(t + 0.3, H.T - 0.001), F = Object.assign(H.frame(lt), { t });
    if (t + 0.3 > H.T - 0.001) { const k = sm(clamp((t + 0.3 - H.T) / 1.3)); F.cam = Object.assign({}, F.cam, { pos: L3(F.cam.pos, F.cam.tgt, 0.15 * k) }); F.cam.focus = Math.hypot(...F.cam.pos.map((v, i) => v - F.cam.tgt[i])); }
    return F; }
  const c = S[3](t);
  if (S[2] === "office") return { t, set: "office", cam: c, mood: "normal", lampK: 0.6, dust: false, charLight: "screen",
    laptop: Object.assign({ mode: "case", k: clamp((t - 5.75) / 2.0), light: 6.5 }, LAPP), pion: PION("fO", t, { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" }) };
  const F = { t, set: "museum", loc: S[2], cam: c, pions: [] };
  if (S[2] === "gallery") {
    Object.assign(F, { mood: S[4], painting: false, glass: "ok", tape: true, fabric: true, ropeDown: true });
    if (t < 24.4) { const P = hops(t, WALK_G), yaw = t > 16.85 ? 180 : 180;
      F.pions.push(PION("fG1", t, { anchor: [P.p[0], P.lift, P.p[2]], lift: P.lift, squash: P.squash, yaw }));
      F.key = { at: [P.p[0], 0.6, P.p[2]], from: [0.75, 1.9, 1.25], col: S[4] === "investigateCool" ? 0xe2eaff : 0xf6f6ff, k: 6.5 };
      if (t >= 16.5 && t < 19.6) F.flash = { from: hand(PG, 180, false), to: [0.1, 1.35, -3.1], k: sm(clamp((t - 16.5) / 0.25)) * (1 - sm(clamp((t - 19.4) / 0.2))), angle: 0.22 };   // on the glass: not a scratch
      if (t >= 19.95 && t < 24.4) F.flash = { from: hand(PG, 180, true), to: HOOKP, k: sm(clamp((t - 19.95) / 0.3)), angle: 0.14 };                                       // up at the hook
    }
    if (S[0] >= 22.7 && S[0] < 24.4) F.hookLight = 1;
    if (t >= 24.4 && t < 28.4) { const s = H.SIM.at(REC(t)); F.thief = { pos: s.pos, q: s.q, arms: 0, handL: s.handL, handR: s.handR, grip: 0, panelK: 0 }; F.painting = true; F.fabric = false; F.tape = false; F.ropeDown = false; F.sepia = 0.0; }
    if (t >= 28.4 && t < 32.4) { F.hookLight = t < 30.5 ? 1.2 : 0; F.flash = t < 30.5 ? { from: hand(PG, 180, true), to: HOOKP, k: 1, angle: 0.12 } : null;
      if (t >= 30.5) { F.pions.push(PION("fG2", t, { anchor: PG, yaw: 70 })); F.key = { at: [PG[0], 0.7, PG[2]], from: [0.8, 1.4, 0.4], col: 0xe2eaff, k: 7 }; } }
    return F; }
  if (S[2] === "security") {   // cooler and darker as it goes on; the monitors and the evidence keep their light
    const late = t >= 67.6, cool = clamp((t - 32.4) / 16.8);
    Object.assign(F, { fillK: late ? 0.3 : lerp(0.85, 0.55, cool), glowK: late ? 1.25 : 1.0, stamp: t < 38.2 ? `02:0${7 + Math.floor((t - 32.4) / 4)}:${String(Math.floor(((t - 32.4) * 7) % 60)).padStart(2, "0")}` : "02:08:14" });
    const off = i => t >= 37.0 + [0, 0.12, 0.28, 0.4, 0.55, 0.66, 0.8, 0.9, 1.05][i];   // "the cameras suddenly went offline": one by one
    F.cctv = Array.from({ length: 9 }, (_, i) => off(i) ? "off" : "live");
    F.logHi = t >= 68.1 ? "dir" : t >= 42.45 ? "tech" : null; F.staff = t >= 46.0 && t < 49.25 ? (t >= 47.2 ? 1 : 0) : (t >= 49.25 ? null : null);
    if (!late) { F.pions.push(PION("fS", t, { anchor: PS, yaw: 180 })); F.key = { at: [PS[0], 0.7, PS[2]], from: [0.7, 1.5, 0.9], col: 0xc8d6ff, k: 6 }; }
    else { F.pions.push(PION("fK", t, { anchor: PK, yaw: 190 })); F.key = { at: [PK[0], 0.7, PK[2]], from: [-0.6, 1.4, 0.6], col: 0x9fb4ff, k: 3.5 }; }
    return F; }
  // corridor: stronger blue; the flashlight is the main light on what he finds
  const cool = clamp((t - 49.2) / 6), late = t >= 59.45;
  Object.assign(F, { hatch: 1, hatchBeam: t >= 51.0 && t < 54.25, prints: t >= 57.5 && t < 59.45 ? 2 : 1, camsOn: false, cool: late ? 1 : cool, fillK: late ? 0.35 : lerp(0.8, 0.5, cool), corKeyK: late ? 0.6 : 1, cardLed: t >= 66.7 ? "green" : "red" });
  if (t < 59.45) { const P = hops(t, WALK_C); F.pions.push(PION("fC", t, { anchor: [P.p[0], P.lift, P.p[2]], lift: P.lift, squash: P.squash, yaw: 180 }));
    F.key = { at: [P.p[0], 0.6, P.p[2]], from: [0.6, 1.7, 1.1], col: 0xc8d6ff, k: 6 };
    if (t >= 51.0 && t < 54.25) F.flash = { from: hand(PC, 180, true), to: HATCHP, k: sm(clamp((t - 51.0) / 0.3)), angle: 0.16 };
    if (t >= 54.25 && t < 57.5) F.flash = { from: hand(PC, 180, false), to: [30.32, 0.0, -0.78], k: 0.5, angle: 0.3 };
    if (t >= 57.5) F.flash = { from: [30.45, 0.62, -0.25], to: [30.3, 0.0, -1.05], k: 0.3, angle: 0.34 }; }
  if (t >= 59.45 && t < 62.35) F.thief = { pos: [HATCHP[0], hatchDrop(t), HATCHP[2]], yaw: 0.6, pitch: 0, arms: 0, top: [HATCHP[0], 2.95, HATCHP[2]], tail: 0 };   // came down from the ceiling
  if (t >= 62.35 && t < 65.55) { F.thief = { pos: [HATCHP[0] - 0.05, 0.46, HATCHP[2] - 0.1], yaw: 0.4, pitch: 0, arms: 0, top: [HATCHP[0], 2.95, HATCHP[2]], tail: 0 };
    F.waiter = { pos: [30.49, 0, -0.62], yaw: 0.55, eyes: t >= 63.2 }; F.flash = { from: [30.7, 2.6, -0.2], to: [30.49, 0.6, -0.62], k: 0.35 * sm(clamp((t - 62.6) / 1.2)), angle: 0.24, col: 0x9fb4ff }; }
  if (t >= 65.55 && t < 67.6) F.key = { at: CARDP, from: [-0.35, 0.35, 0.7], col: 0xc8d6ff, k: 4, angle: 0.3 };   // the reader gets its own light
  return F; }
module.exports = { N, SEG, SH, frame, T, WALK_G, WALK_C, PG, PS, PC, PK };
