// Scenes 1-2 in the office (0.00 - 8.50 s, frames 0-510).
// 1  "I solved a murder three days before the victim was even killed."  lamp clicks on (stutter), push-in, FRIDAY 14 calendar, the photo, back on Pion. (no CASE SOLVED stamp: user)
// 2  "It all started when I received an anonymous photograph showing a man lying dead..."  fly down to the door: the envelope slides under it ("NO SENDER");
//    crane up over the desk front (wipe) to the opened envelope + the photo with Pion behind it, then dive straight down into the photo (dissolve into apartment A at 8.2-8.5).
const { cam, key, L3 } = require("./lib.js");
const DZ = -0.95, PZ = DZ - 0.42, PH = 0.831, PHZ = -0.73;   // photo top surface height / centre z
const K = [
  { t: 0.0, pos: [0.05, 1.3, 1.25], tgt: [0, 1.15, -1.4], fov: 44, focus: 2.6 },
  { t: 1.0, pos: [0.04, 1.28, 1.02], tgt: [0, 1.14, -1.4], fov: 44, focus: 2.4, ease: "lin" },
  { t: 1.62, pos: [0.95, 1.02, 0.0], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.86, ease: "io" },        // "three days" -> FRIDAY 14, Pion behind it
  { t: 2.4, pos: [0.92, 1.0, -0.1], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.78, ease: "lin" },
  { t: 3.0, pos: [0.0, 1.32, 0.05], tgt: [0, 0.95, -0.95], fov: 50, focus: 0.85, ease: "io" },              // "victim ... killed" -> the photo, Pion looking down at it
  { t: 4.3, pos: [0.0, 1.3, -0.06], tgt: [0, 0.95, -0.95], fov: 50, focus: 0.76, ease: "lin" },
  { t: 4.85, pos: [0.1, 1.22, 0.75], tgt: [0, 1.12, -1.4], fov: 42, focus: 2.1, ease: "io" },               // "It all started" -> Pion
  { t: 5.0, pos: [0.09, 1.215, 0.68], tgt: [0, 1.12, -1.4], fov: 42, focus: 2.05, ease: "lin" },
  { t: 5.62, pos: [0.95, 0.42, 1.2], tgt: [2.25, 0.3, 0.62], fov: 54, focus: 1.35, ease: "io" },            // "received" -> the gap under the door
  { t: 6.15, pos: [0.98, 0.36, 1.12], tgt: [1.6, 0.05, 0.75], fov: 52, focus: 0.75, ease: "lin" },          // the envelope stops at the lens: NO SENDER
  { t: 6.85, pos: [0.06, 1.36, 0.1], tgt: [-0.04, 0.95, -0.95], fov: 50, focus: 0.9, ease: "io" },           // "photograph" -> crane over the desk edge: open envelope + the photo, Pion behind
  { t: 7.2, pos: [0.05, 1.35, 0.02], tgt: [-0.04, 0.95, -0.95], fov: 50, focus: 0.84, ease: "lin" },
  { t: 8.3, pos: [0, PH + 0.521, PHZ + 0.004], tgt: [0, PH, PHZ], fov: 40, focus: 0.52, ease: "io" },      // "showing a man lying dead" -> top-down, the photo's image fills the frame
  { t: 8.55, pos: [0, PH + 0.44, PHZ + 0.004], tgt: [0, PH, PHZ], fov: 40, focus: 0.44, ease: "lin" },
];
function lamp(t) { if (t < 0.12) return 0; if (t < 0.16) return 1; if (t < 0.22) return 0.08; if (t < 0.27) return 1; if (t < 0.31) return 0.3; return 1; }   // click, stutter, on
const ENVK = [[5.4, [2.44, 0, 0.62]], [6.05, [1.5, 0, 0.8], "out"]];
module.exports = { N: 511, set: "office", K, frame(f) { const t = f / 60, L = lamp(t);
  let env; if (t < 5.4) env = { vis: false }; else if (t < 6.45) env = { p: key(ENVK, t), ry: key([[5.4, -1.62], [6.05, -1.38, "out"]], t), flap: 0 }; else env = undefined;   // undefined = resting open on the desk
  return { t, cam: cam(K, t), mood: "normal", lampK: L, env,
    pion: { eng: process.env.ENG || "s12", anchor: [0, 0.48, PZ], height: 1.15, tint: L3([0.22, 0.27, 0.42], [1.0, 0.94, 0.84], L) } }; } };
