// still checks of the three locations (no characters)
const look = (pos, tgt, fov = 46) => ({ pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), roll: 0, aperture: 0.001 });
const S = [
  { loc: "apt", cam: look([-1.5, 0.75, 2.4], [0.5, 0.35, 0]) },
  { loc: "phones", cam: look([29.86, 0.42, 0.25], [30, 0, 0], 40) },
  { loc: "phones", cam: look([38.9, 0.25, 0.3], [39, 0, 0], 40) },
  { loc: "house", cam: look([60, 0.8, 2.4], [60, 0.75, -1.2]), door: 0, figure: true },
  { loc: "house", cam: look([60, 0.8, 2.4], [60, 0.75, -1.2]), door: 0, figure: true, flash: 1 },
  { loc: "house", cam: look([60, 0.8, 2.4], [60, 0.7, -1.2]), door: 1.3, figure: false },
];
module.exports = { N: S.length, set: "mlike", frame(f) { return Object.assign({ t: f, pions: [] }, S[f]); } };
