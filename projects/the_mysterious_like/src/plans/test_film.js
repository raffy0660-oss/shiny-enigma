// stills of the new film pieces
const look = (pos, tgt, fov = 46) => ({ pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), roll: 0, aperture: 0.001 });
const S = [
  { loc: "apt", cam: look([-1.7, 1.55, 1.05], [1.15, 0.22, 0.2]) },
  { loc: "apt", cam: look([1.05, 0.6, 0.42], [1.05, 0.56, 0.05], 40), heldPhone: { mode: "profile" }, vicPhone: false },
  { loc: "ext", cam: look([60, 1.1, -7.2], [60, 1.1, -2.0], 46) },
  { loc: "house", cam: look([60.3, 1.2, 1.2], [60.95, 0.56, -0.2], 44), tableK: 1 },
  { loc: "house", cam: look([60, 0.75, 1.3], [60, 0.64, -1.45], 42), figure: true, flash: 0.2, fall: 0.25 },
  { loc: "house", cam: look([60, 0.75, 1.3], [60, 0.64, -1.45], 42), figure: true, fall: 1.2 },
  { loc: "house", cam: look([60.35, 0.66, 0.35], [60.35, 0.62, -0.05], 40), pionPhone: { mode: "notif" } },
];
module.exports = { N: S.length, set: "mlike", frame(f) { return Object.assign({ t: f, pions: [] }, S[f]); } };
