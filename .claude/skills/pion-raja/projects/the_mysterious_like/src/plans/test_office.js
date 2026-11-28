// office stills for The Mysterious Like (evidence board, report, map)
const look = (pos, tgt, fov = 44) => ({ pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), roll: 0, aperture: 0.001 });
const LAPP = { pos: [0.05, 0.786, -1.12], ry: Math.PI };
const S = [
  { cam: look([0.0, 1.45, -0.2], [0, 1.5, -2.6], 50), board: { k1: 1, k2: 1, k3: 0.6 }, mood: "tension" },
  { cam: look([0.55, 1.22, -1.75], [0.05, 0.95, -1.05], 46), laptop: Object.assign({ mode: "report", k: 0.2, light: 3 }, LAPP), mood: "tension" },
  { cam: look([0.3, 1.05, -1.55], [0.05, 0.95, -1.08], 40), laptop: Object.assign({ mode: "map", k: 0.5, light: 3 }, LAPP), mood: "tension" },
  { cam: look([0.12, 0.96, -1.35], [0.05, 0.95, -1.08], 40), laptop: Object.assign({ mode: "map", k: 0.95, light: 3, img: "/eng/house_still.jpg" }, LAPP), mood: "tension" },
];
module.exports = { N: S.length, set: "office", frame(f) { return Object.assign({ t: f, lampK: 1 }, S[f]); } };
