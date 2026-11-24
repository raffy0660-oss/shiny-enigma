const cam = (pos, tgt, fov) => ({ pos, tgt, fov, focus: Math.hypot(...pos.map((v, i) => v - tgt[i])) });
const S = [{ thief: { pos: [0, 1.0, -1.0], yaw: 0, pitch: 0 }, cam: cam([0, 1.2, 1.2], [0, 1.2, -1.0], 40) },
  { thief: { pos: [0, 1.0, -1.0], yaw: 0, pitch: -Math.PI }, cam: cam([0, 0.9, 1.2], [0, 0.8, -1.0], 40) },
  { thief: { pos: [0, 1.0, -1.0], yaw: 0, pitch: -Math.PI }, cam: cam([0, 0.9, -3.0], [0, 0.8, -1.0], 40) }];
module.exports = { N: S.length, set: "museum", frame(f) { return Object.assign({ t: 0, set: "museum", loc: "gallery", mood: "day", rope: false }, S[f]); } };
