// The anonymous photograph = a still of apartment version A from the photographer's spot (behind the camera stands the culprit).
// node render_seq.js ../plans/photo_still.js ../out/photo_still --jobs 1  -> then tools/make_photo.py crops 3:4 and adds the border
const C0 = { pos: [1.05, 1.3, 1.25], tgt: [-0.12, 0.08, -0.45], fov: 72, focus: 1.6, aperture: 0.0006 };
const daniel = { eng: process.env.DAN || "probe_d_pusing", ef: 0, anchor: [0.2, 0.1, -0.5], height: 1.15, face: true, roll: Math.PI / 2, shadow: [1.2, 0.5, -0.45, 0], tint: [1, 0.96, 0.88] };
module.exports = { N: 1, set: "apartment", C0, frame(f) { return { t: 2.0, ver: "A", cam: C0, pions: [daniel] }; } };
