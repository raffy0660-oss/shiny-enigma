// Scenes 11-13 in the office (54.30 - 73.40 s, frames 3258-4404).
// 11 "It was me."  the light breaks to REVEAL exactly on "It" (54.56): room black, cold under-light; snap zoom to Pion's face.
// 12 "I checked the photograph's metadata ... five years old, taken on the exact night Daniel disappeared."  laptop: 3 DAYS AGO -> glitch -> 5 YEARS AGO.
// 13 "Then I discovered the sender's identity ... sent from my own email account, five years before I even became a detective."
//    the mail (From: succify@...), the room keeps getting darker, pull back, snap to the wall clock: 11:41 -> 11:42 on the last frames.
const { cam, key, L3 } = require("./lib.js");
const DZ = -0.95, PZ = DZ - 0.42, F0 = 3258;
const SC = [0.733, 0.954, -1.053], SN = [0.33, 0.276, 0.903], scr = (d, dx = 0, dy = 0) => SC.map((v, i) => v + SN[i] * d + [dx, dy, 0][i]);
const CLK = [2.27, 1.9, -0.9];
const K = [
  { t: 54.3, pos: [0.06, 1.2, 0.3], tgt: [0, 1.17, -1.4], fov: 40, focus: 1.65 },
  { t: 54.56, pos: [0.05, 1.2, 0.22], tgt: [0, 1.17, -1.4], fov: 40, focus: 1.58, ease: "lin" },
  { t: 54.78, pos: [0.0, 1.21, -0.55], tgt: [0, 1.21, -1.4], fov: 38, focus: 0.82, ease: "out" },        // "It was me": snap zoom
  { t: 55.5, pos: [0.0, 1.21, -0.6], tgt: [0, 1.21, -1.4], fov: 38, focus: 0.78, ease: "lin" },
  { t: 56.1, pos: [0.55, 1.12, 0.45], tgt: [0.42, 0.98, -0.9], fov: 46, focus: 1.3, ease: "io" },          // "metadata": Pion + laptop
  { t: 57.1, pos: [0.53, 1.11, 0.38], tgt: [0.42, 0.98, -0.9], fov: 46, focus: 1.25, ease: "lin" },
  { t: 57.8, pos: scr(0.8), tgt: SC, fov: 38, focus: 0.8, ease: "io" },                                    // "hadn't been taken three days earlier": the screen
  { t: 59.85, pos: scr(0.72), tgt: SC, fov: 38, focus: 0.72, ease: "lin" },
  { t: 60.05, pos: scr(0.62), tgt: SC, fov: 38, focus: 0.62, roll: 0.03, ease: "out" },                     // glitch punch-in: 5 YEARS AGO
  { t: 61.5, pos: scr(0.6), tgt: SC, fov: 38, focus: 0.6, ease: "lin" },
  { t: 62.1, pos: [0.38, 1.2, -0.2], tgt: [0.0, 1.15, -1.37], fov: 40, focus: 1.25, ease: "io" },          // "the exact night": his face in the screen light
  { t: 64.3, pos: [0.35, 1.2, -0.28], tgt: [0.0, 1.15, -1.37], fov: 40, focus: 1.18, ease: "lin" },
  { t: 64.95, pos: scr(0.78), tgt: SC, fov: 38, focus: 0.78, ease: "io" },                                  // "the sender's identity": the mail
  { t: 68.35, pos: scr(0.7), tgt: SC, fov: 38, focus: 0.7, ease: "lin" },
  { t: 68.85, pos: scr(0.5, 0.0, 0.05), tgt: [SC[0], SC[1] + 0.05, SC[2]], fov: 38, focus: 0.5, ease: "io" }, // "my own email account": From:
  { t: 70.4, pos: scr(0.48, 0.0, 0.05), tgt: [SC[0], SC[1] + 0.05, SC[2]], fov: 38, focus: 0.48, ease: "lin" },
  { t: 72.2, pos: [-0.3, 1.4, 1.75], tgt: [0.97, 1.22, -0.97], fov: 66, focus: 3.0, ease: "io" },           // "before I even became a detective": pull back, dark room
  { t: 72.45, pos: [-0.28, 1.4, 1.7], tgt: [0.97, 1.22, -0.97], fov: 66, focus: 3.0, ease: "lin" },
  { t: 72.95, pos: [1.17, 1.88, -0.85], tgt: CLK, fov: 40, focus: 1.1, ease: "io" },                       // snap to the wall clock
  { t: 73.4, pos: [1.25, 1.885, -0.86], tgt: CLK, fov: 40, focus: 1.02, ease: "lin" },
];
module.exports = { N: 4405, F0, set: "office", K, frame(f) { const t = f / 60, rv = t >= 54.56;
  const laptop = t < 55.4 ? undefined : t < 64.45 ? { mode: "meta", k: key([[59.9, 0], [60.25, 1, "lin"]], t) } : { mode: "mail", k: key([[68.7, 0], [68.85, 0.31, "lin"], [70.9, 0.31], [71.1, 0.7, "lin"]], t) };
  return { t, cam: cam(K, t), mood: rv ? "reveal" : "tension", lampK: rv ? key([[66, 1], [72.4, 0.25, "lin"]], t) : 1, laptop, clock: t < 73.12 ? [11, 41] : [11, 42],
    pion: { eng: process.env.ENG || "s11", ef: f - F0, anchor: [0, 0.48, PZ], height: 1.15, tint: rv ? [0.58, 0.8, 0.86] : [0.85, 0.86, 1.0] } }; } };
