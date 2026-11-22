// Character-integration test (office set): one representative character (Pion, cartoon outfit: engine cue `toon`) through 12 cases, one shot per frame.
//   node make_view.js plans/test_integ.js 0 24 pion view_integ.json      (engine view per frame)
//   react_render.js ... --cues cue_integ.txt --view view_integ.json --png  -> eng/integ_frames
//   node render_seq.js plans/test_integ.js out/integ                      (ENG=integ_old + scene_old/ for the "before" render)
// cases: 0-7 orbit around a standing character | 8-10 near / mid / far | 11 low camera | 12 high camera | 13-14 lift 0.25 / 0.5 m
//        15 seated (side) | 16 seated behind the desk (occlusion) | 17 lying on the floor | 18 warm light | 19 cool light
//        20 rim + glow off | 21 rim + glow on (light behind) | 22 partly occluded by the desk corner | 23 high orbit + lift (combined)
const S = [0.5, 0, 0.1], PZ = -0.95 - 0.42, SEAT = 0.46, LEGACY = !!process.env.LEGACY;   // room x -2.3..2.3, z -2.6..1.8, ceiling 2.45
const look = (pos, tgt, fov = 62) => ({ pos, tgt, fov, focus: Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), roll: 0, aperture: 0.001 });
const around = (c, ang, r, h, ty = 0.45, fov) => { const a = ang * Math.PI / 180; return look([c[0] + Math.sin(a) * r, h, c[2] + Math.cos(a) * r], [c[0], c[1] + ty, c[2]], fov); };
const SHOTS = [];
for (let k = 0; k < 8; k++) SHOTS.push({ cam: around(S, -80 + k * 20, 1.6, 1.0, 0.4) });                // 0-7 orbit (inside the room)
for (const r of [1.2, 1.8, 2.4]) SHOTS.push({ cam: around(S, -50, r, 0.9, 0.4, 50) });             // 8-10 distance (size must not change)
SHOTS.push({ cam: around(S, 10, 1.5, 0.14, 0.62) });                                               // 11 low
SHOTS.push({ cam: around(S, 15, 1.2, 2.25, 0.1) });                                                // 12 high
for (const l of [0.25, 0.5]) SHOTS.push({ cam: around(S, 25, 1.65, 1.0, 0.6), lift: l });           // 13-14 lift
SHOTS.push({ cam: look([1.35, 1.05, -0.55], [0, 0.8, PZ]), seat: true });                            // 15 seated, side
SHOTS.push({ cam: look([0.15, 1.3, 0.45], [0, 0.85, PZ]), seat: true });                             // 16 seated behind the desk
SHOTS.push({ cam: around(S, 10, 1.1, 1.9, 0.0), lying: true });                                    // 17 lying on the floor
SHOTS.push({ cam: around(S, -25, 1.6, 1.0, 0.4), mood: "normal" });                                    // 18 warm
SHOTS.push({ cam: around(S, -25, 1.6, 1.0, 0.4), mood: "tension" });                                   // 19 cool
SHOTS.push({ cam: around(S, 0, 1.3, 0.8, 0.5), rim: 0, glow: 0 });                                  // 20 rim off (desk lamp behind him)
SHOTS.push({ cam: around(S, 0, 1.3, 0.8, 0.5) });                                                   // 21 rim on
SHOTS.push({ cam: look([1.25, 0.95, 0.75], [0.85, 0.6, -1.25]), occl: true });                       // 22 behind the desk corner
SHOTS.push({ cam: around(S, -40, 1.3, 2.1, 0.2), lift: 0.35 });                                    // 23 high + lift
module.exports = { N: SHOTS.length, set: "office", frame(f) {
  const s = SHOTS[f], t = 30;
  let pion;
  if (s.seat) pion = { anchor: [0, SEAT, PZ], ground: SEAT, preset: "seated" };
  else if (s.lying) pion = { anchor: [S[0] - 0.45, 0, S[2]], ground: 0, preset: "victim", yaw: -Math.PI / 2 };   // feet at the anchor, head toward +x
  else if (s.occl) pion = { anchor: [0.85, 0, -1.25], preset: "detective" };
  else pion = { anchor: [S[0], s.lift || 0, S[2]], lift: s.lift || 0, preset: "detective" };
  Object.assign(pion, { eng: process.env.ENG || "integ", ef: ({ 19: 18, 21: 20 })[f] ?? f, height: 1.15, tint: [1, 0.97, 0.92] });   // A/B pairs use the same drawing
  if (s.rim === 0) Object.assign(pion, { rim: 0, glow: 0 });
  if (LEGACY) { delete pion.preset; if (s.lying) Object.assign(pion, { anchor: [S[0], 0.02, S[2]], face: true, roll: Math.PI / 2, push: 0.7, cast: false, shadow: [1.2, 0.5] }); else pion.shadow = [1.0, 0.55]; }   // the old way (video 1)
  return { t, cam: s.cam, mood: s.mood || "normal", lampK: 1, pion }; } };
