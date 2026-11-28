const PZ = -1.37;
const F = [
  { cam: { pos: [0.95, 1.02, 0.0], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.86 }, calTear: 0.0, mood: "conflict" },
  { cam: { pos: [0.95, 1.02, 0.0], tgt: [0.45, 0.98, -0.85], fov: 46, focus: 0.86 }, calTear: 0.35, mood: "conflict" },
  { cam: { pos: [0.95, 1.15, 0.25], tgt: [0.25, 0.95, -0.9], fov: 46, focus: 1.1 }, laptop: { mode: "meta", k: 0.2 }, mood: "reveal" },
  { cam: { pos: [0.55, 1.12, 0.45], tgt: [0.42, 0.98, -0.9], fov: 46, focus: 1.3 }, laptop: { mode: "meta", k: 0.52 }, mood: "reveal" },
  { cam: { pos: [1.05, 1.05, -0.3], tgt: [0.75, 0.95, -0.88], fov: 40, focus: 0.66 }, laptop: { mode: "mail", k: 0.8 }, mood: "reveal" },
];
module.exports = { N: F.length, set: "office", frame(f) { return Object.assign({ t: 3 + f * 0.37, pion: { eng: "probe", ef: 0, anchor: [0, 0.48, PZ], height: 1.15, tint: f < 2 ? [0.6, 0.65, 1.0] : [0.55, 0.85, 0.8] } }, F[f]); } };
