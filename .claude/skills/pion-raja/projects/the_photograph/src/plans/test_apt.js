// still checks of the apartment: node render_seq.js ../plans/test_apt.js ../out/test_apt --jobs 3
const C = {
  wide: { pos: [1.3, 1.5, 1.6], tgt: [-0.3, 0.5, -1.0], fov: 64, focus: 2.6 },
  body: { pos: [0.35, 1.05, 0.55], tgt: [0.0, 0.2, -0.5], fov: 44, focus: 1.3 },
  clock: { pos: [0.75, 0.75, 0.35], tgt: [0.62, 0.1, -0.32], fov: 40, focus: 0.68 },
  door: { pos: [-1.0, 1.2, 1.5], tgt: [1.9, 0.85, -0.4], fov: 50, focus: 2.6 },
};
const daniel = { eng: "probe_d_pusing", ef: 0, anchor: [0.2, 0.1, -0.5], height: 1.15, face: true, roll: Math.PI / 2, shadow: [1.2, 0.5, -0.45, 0] };
const pion = (a) => ({ eng: "probe", ef: 0, anchor: a, height: 1.15, shadow: [0.95, 0.5] });
const police = { eng: "probe_pol", ef: 0, anchor: [1.0, 0, -1.0], height: 1.25, shadow: [0.95, 0.5] };
const F = [
  { ver: "A", cam: C.wide, pions: [{ ...daniel, tint: [0.95, 0.9, 0.8] }] },
  { ver: "A", cam: C.clock, pions: [{ ...daniel, tint: [0.95, 0.9, 0.8] }], clockGlow: 0.6 },
  { ver: "B", cam: C.wide, pions: [{ ...pion([0.3, 0, -0.4]), tint: [1, 0.96, 0.88] }] },
  { ver: "B", cam: C.body, pions: [{ ...pion([0.45, 0, -0.9]), tint: [1, 0.96, 0.88] }] },
  { ver: "C", cam: C.wide, pions: [{ ...daniel, tint: [0.7, 0.75, 1.0] }, { ...police, tint: [0.75, 0.8, 1.0] }] },
  { ver: "C", cam: C.door, pions: [{ ...daniel, tint: [0.7, 0.75, 1.0] }, { ...police, tint: [0.75, 0.8, 1.0] }, { ...pion([2.6, 0, -0.25]), tint: [0.85, 0.75, 0.9] }] },
];
module.exports = { N: F.length, set: "apartment", frame(f) { return Object.assign({ t: 1 + f * 0.13 }, F[f]); } };
