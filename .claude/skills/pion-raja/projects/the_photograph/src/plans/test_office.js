// still checks of the Pion-scale office: node render_seq.js ../plans/test_office.js ../out/test_office --jobs 3
const DZ = -0.95, PZ = DZ - 0.42;
const C = [
  { pos: [0.1, 1.25, 1.6], tgt: [0, 1.05, -1.4], fov: 46, focus: 2.9 },            // wide
  { pos: [0.05, 1.2, 0.55], tgt: [0, 1.0, -1.3], fov: 42, focus: 1.8 },             // medium on Pion
  { pos: [0.15, 1.45, 0.0], tgt: [0, 0.82, -0.75], fov: 48, focus: 0.9 },           // desk + Pion
  { pos: [0.75, 0.16, 0.45], tgt: [2.3, 0.12, 0.62], fov: 50, focus: 1.0 },          // the door gap from the floor
  { pos: [0.2, 0.95, 1.3], tgt: [2.3, 0.8, 0.5], fov: 50, focus: 2.0 },            // the door
  { pos: [0.0, 1.4, -0.3], tgt: [0, 0.78, -0.69], fov: 40, focus: 0.7 },            // top-down on the photo
];
module.exports = { N: C.length, frame(f) { return { t: 1 + f * 0.1, cam: C[f], mood: "normal", env: f === 3 ? { p: [1.7, 0.004, 0.55], ry: -1.45, flap: 0 } : undefined,
  pion: { eng: "probe", ef: 0, anchor: [0, 0.48, PZ], height: 1.15, tint: [1.0, 0.94, 0.84] } }; } };
