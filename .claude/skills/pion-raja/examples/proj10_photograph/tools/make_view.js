// make_view.js: per-frame [orbit°, tilt°] for the engine (--view) so each character is DRAWN from the scene camera's angle
// (a high camera sees his hat top and the base ellipse from above -> he stands ON the floor, not "upright in front of the lens").
// usage: node make_view.js <plan.js> <F0> <F1> <who> <out.json> [facing°] [maxOrbit°]
//   who = "pion" (F.pion) or an index into F.pions; facing = the character's world yaw (0 = faces +z); orbit clamped to ±maxOrbit (default 55) to keep the 2D front-ish look
// then: react_render.js ... --start <F0/60> --dur <(F1-F0)/60> --view out.json   and in the plan set { faceCam: true } on that character
const path = require("path"), fs = require("fs");
const [planF, F0s, F1s, who, out, facingS, maxS] = process.argv.slice(2); const plan = require(path.resolve(planF)), F0 = +F0s, F1 = +F1s, facing = +(facingS || 0), MAXO = +(maxS || 55);
const view = [];
for (let f = F0; f < F1; f++) { const F = plan.frame(f), P = who === "pion" ? F.pion : (F.pions || [])[+who]; if (!P || !P.anchor) { view.push(view.length ? view[view.length - 1] : [0, 0]); continue; }
  const c = F.cam.pos, a = P.anchor, mid = a[1] + (P.height || 1.15) * 0.42, dx = c[0] - a[0], dz = c[2] - a[2], hz = Math.hypot(dx, dz);
  let orbit = Math.atan2(dx, dz) * 180 / Math.PI - facing; orbit = ((orbit + 540) % 360) - 180; orbit = Math.max(-MAXO, Math.min(MAXO, orbit));
  const tilt = Math.atan2(c[1] - mid, hz) * 180 / Math.PI; view.push([+orbit.toFixed(2), +tilt.toFixed(2)]); }
fs.writeFileSync(out, JSON.stringify(view)); console.log("view", view.length, "frames; tilt", Math.min(...view.map(v => v[1])).toFixed(1), "..", Math.max(...view.map(v => v[1])).toFixed(1));
