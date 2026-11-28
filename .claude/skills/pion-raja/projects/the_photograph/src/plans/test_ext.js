const FZ = -4.9;
const C = [
  { pos: [-5.5, 3.2, 3.6], tgt: [0.0, 2.6, FZ], fov: 58, focus: 9 },
  { pos: [1.6, 1.15, FZ + 3.6], tgt: [0.6, 1.6, FZ], fov: 50, focus: 2.6 },
  { pos: [2.6, 1.2, FZ + 2.2], tgt: [2.0, 1.25, FZ + 0.97], fov: 40, focus: 1.3 },
  { pos: [0.8, 0.9, FZ + 3.0], tgt: [0.75, 5.7, FZ], fov: 55, focus: 5 },
];
module.exports = { N: 4, set: "exterior", frame(f) { return { t: 1 + f * 0.3, cam: C[f], pions: [{ eng: "probe", ef: 0, anchor: [1.2, 0.15, FZ + 1.3], height: 1.15, tint: [1.0, 0.86, 0.9], shadow: [0.9, 0.45] }] }; } };
